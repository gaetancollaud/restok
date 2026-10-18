package io.github.gaetancollaud.restok.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.URI;
import java.net.http.HttpRequest;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

import static io.github.gaetancollaud.restok.catalog.ChainHttp.text;

/** migros.ch: a guest token, a search that returns ids, and product cards with price and promotion. */
@ApplicationScoped
public class MigrosClient implements ChainClient {

    static final ZoneId ZURICH = ZoneId.of("Europe/Zurich");
    static final String USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0";

    @ConfigProperty(name = "restok.catalog.migros-url")
    String url;

    @Inject
    ChainHttp http;

    /** Fetched on first use, dropped when Migros rejects it. */
    private volatile String token;

    @Override
    public Chain chain() {
        return Chain.MIGROS;
    }

    @Override
    public List<ChainProduct> search(String query) {
        Map<String, Object> body = Map.of("regionId", "national", "language", "fr", "productIds", List.of(),
                "query", query, "sortFields", List.of(), "sortOrder", "asc", "algorithm", "DEFAULT");
        JsonNode ids = withToken(t -> http.post(url + "/onesearch-oc-seaapi/public/v5/search", body, headers(t)))
                .path("productIds");
        List<String> codes = new ArrayList<>();
        ids.forEach(id -> {
            if (codes.size() < MAX_RESULTS) codes.add(id.asText());
        });
        return products(codes);
    }

    /** In the order of the codes. */
    @Override
    public List<ChainProduct> products(Collection<String> codes) {
        List<Long> uids = codes.stream().filter(c -> c.matches("\\d{1,18}")).map(Long::valueOf).toList();
        if (uids.isEmpty()) {
            return List.of();
        }
        Map<String, Object> body = Map.of(
                "productFilter", Map.of("uids", uids),
                "offerFilter", Map.of("storeType", "OFFLINE", "region", "national",
                        "ongoingOfferDate", LocalDate.now(ZURICH) + "T00:00:00"));
        JsonNode cards = withToken(t -> http.post(url + "/product-display/public/v4/product-cards", body, headers(t)));
        Map<String, ChainProduct> byCode = new LinkedHashMap<>();
        LocalDate today = LocalDate.now(ZURICH);
        cards.forEach(card -> byCode.put(card.path("uid").asText(), parse(card, today)));
        return uids.stream().map(uid -> byCode.get(uid.toString())).filter(Objects::nonNull).toList();
    }

    static ChainProduct parse(JsonNode card, LocalDate today) {
        JsonNode offer = card.path("offer");
        String description = text(card.path("description"));
        return new ChainProduct(Chain.MIGROS, card.path("uid").asText(), text(card.path("name")),
                description != null ? description : text(card.path("title")),
                text(offer.path("quantity")),
                offer.path("price").path("advertisedValue").asDouble(),
                text(card.path("productUrls")),
                sale(offer, today));
    }

    /** Only while the promotion's range includes today: Migros also lists upcoming ones. */
    static ChainProduct.Sale sale(JsonNode offer, LocalDate today) {
        JsonNode promotion = offer.path("promotionPrice");
        String start = text(offer.path("promotionDateRange").path("startDate"));
        String end = text(offer.path("promotionDateRange").path("endDate"));
        if (!promotion.isObject() || start == null || end == null) {
            return null;
        }
        LocalDate first = LocalDate.parse(start.substring(0, 10));
        LocalDate last = LocalDate.parse(end.substring(0, 10));
        if (today.isBefore(first) || today.isAfter(last)) {
            return null;
        }
        String label = text(offer.path("badges").path(0).path("description"));
        return new ChainProduct.Sale(label != null ? label : "Sale", promotion.path("effectiveValue").asDouble(), last);
    }

    /** Runs the call with the token, once more with a fresh token when Migros rejects it. */
    private JsonNode withToken(Function<String, JsonNode> call) {
        try {
            return call.apply(token());
        } catch (ChainHttp.StatusException e) {
            if (e.status != 401 && e.status != 403) {
                throw e;
            }
            token = null;
            return call.apply(token());
        }
    }

    private String token() {
        String t = token;
        if (t == null) {
            t = http.send(HttpRequest.newBuilder(URI.create(url + "/authentication/public/v1/api/guest")).GET(),
                            "User-Agent", USER_AGENT)
                    .headers().firstValue("leshopch")
                    .orElseThrow(() -> new IllegalStateException("no Migros guest token"));
            token = t;
        }
        return t;
    }

    private static String[] headers(String token) {
        return new String[]{"User-Agent", USER_AGENT, "Accept-Language", "fr", "leshopch", token};
    }
}
