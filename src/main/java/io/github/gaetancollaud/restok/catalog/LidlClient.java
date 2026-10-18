package io.github.gaetancollaud.restok.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static io.github.gaetancollaud.restok.catalog.ChainHttp.text;

/**
 * Lidl's digital leaflet, the only Lidl product API: search and details both read the current leaflet, so a product
 * that left it is unknown.
 */
@ApplicationScoped
public class LidlClient implements ChainClient {

    static final String API = "/api/v1/CH/";
    static final Pattern DAY = Pattern.compile("(\\d{1,2})\\.(\\d{1,2})\\.");

    @ConfigProperty(name = "restok.catalog.lidl-url")
    String url;

    @Inject
    ChainHttp http;

    private record Leaflet(Map<String, ChainProduct> products, Instant fetched) {
    }

    private volatile Leaflet leaflet;

    @Override
    public Chain chain() {
        return Chain.LIDL;
    }

    @Override
    public List<ChainProduct> search(String query) {
        String needle = fold(query);
        return leaflet().values().stream().filter(p -> fold(p.name()).contains(needle)).limit(MAX_RESULTS).toList();
    }

    @Override
    public List<ChainProduct> products(Collection<String> codes) {
        Map<String, ChainProduct> products = leaflet();
        return codes.stream().map(products::get).filter(Objects::nonNull).toList();
    }

    /** All campaigns' products, by code; refetched after Catalog.TTL. */
    private Map<String, ChainProduct> leaflet() {
        Leaflet l = leaflet;
        if (l == null || l.fetched.plus(Catalog.TTL).isBefore(Instant.now())) {
            Set<String> campaigns = new LinkedHashSet<>();
            http.get(url + API + "campaignGroups", headers()).path("groups")
                    .forEach(g -> g.path("campaigns").forEach(c -> campaigns.add(c.path("id").asText())));
            Map<String, ChainProduct> products = new LinkedHashMap<>();
            LocalDate today = LocalDate.now(MigrosClient.ZURICH);
            for (String id : campaigns) {
                http.get(url + API + "campaigns/" + id, headers()).path("products")
                        .forEach(p -> products.putIfAbsent(p.path("id").asText(), parse(p, today)));
            }
            l = new Leaflet(products, Instant.now());
            leaflet = l;
        }
        return l.products;
    }

    /** On sale when Lidl shows an old price; the sale ends on the badge's last day, e.g. "15.10. - 21.10.". */
    static ChainProduct parse(JsonNode p, LocalDate today) {
        JsonNode price = p.path("mainPrice");
        double current = price.path("price").asDouble();
        double old = price.path("oldPrice").asDouble();
        ChainProduct.Sale sale = null;
        if (old > current) {
            String label = text(price.path("discount"));
            sale = new ChainProduct.Sale(label != null ? label : "Sale", current, endDate(p.path("badges"), today));
        }
        String quantity = text(p.path("subtitle"));
        return new ChainProduct(Chain.LIDL, p.path("id").asText(), text(p.path("title")), null,
                quantity != null ? quantity : text(p.path("additionalInfo")),
                sale != null ? old : current, null, sale);
    }

    /** The badge gives day and month only: this year, or next year when that is more than half a year ago. */
    static LocalDate endDate(JsonNode badges, LocalDate today) {
        for (JsonNode badge : badges) {
            String title = text(badge.path("title"));
            if (!"AvailableInStoreFrom".equals(badge.path("type").asText()) || title == null) {
                continue;
            }
            Matcher m = DAY.matcher(title);
            LocalDate last = null;
            while (m.find()) {
                last = LocalDate.of(today.getYear(), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)));
            }
            if (last != null) {
                return last.isBefore(today.minusMonths(6)) ? last.plusYears(1) : last;
            }
        }
        return null;
    }

    /** Lower case without accents, so "pommes" finds "Pommes" and "creme" finds "crème". */
    static String fold(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    /** The leaflet API answers only the Lidl Plus app. */
    private static String[] headers() {
        return new String[]{
                "User-Agent", "LidlSocialInternacional/16.47.15 (com.lidl.eci.lidl.plus; build:1445; iOS 26.3.1) Alamofire/5.10.2",
                "Brand", "Apple",
                "App", "com.lidl.eci.lidl.plus",
                "Operating-System", "iOS",
                "App-Version", "16.47.15",
                "Accept-Language", "FR"};
    }
}
