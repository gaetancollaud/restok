package io.github.gaetancollaud.restok.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import static io.github.gaetancollaud.restok.catalog.ChainHttp.encode;
import static io.github.gaetancollaud.restok.catalog.ChainHttp.text;

/** coop.ch's "coop@home" API. Search and details share one product shape. */
@ApplicationScoped
public class CoopClient implements ChainClient {

    // DataDome lets this mobile Safari through; swap it here if Coop starts answering 403
    static final String USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
    static final String API = "/rest/v2/coopathome/products/";

    @ConfigProperty(name = "restok.catalog.coop-url")
    String url;

    @Inject
    ChainHttp http;

    @Override
    public Chain chain() {
        return Chain.COOP;
    }

    @Override
    public List<ChainProduct> search(String query) {
        JsonNode found = http.get(url + API + "search/" + encode(query)
                + "?currentPage=0&pageSize=" + MAX_RESULTS + "&query=availableOnline:false&language=fr", headers());
        List<ChainProduct> products = new ArrayList<>();
        found.path("products").forEach(p -> {
            if (products.size() < MAX_RESULTS) products.add(parse(p));
        });
        return products;
    }

    /** One call per code; an unknown code is a 400 or 404. */
    @Override
    public List<ChainProduct> products(Collection<String> codes) {
        List<ChainProduct> products = new ArrayList<>();
        for (String code : codes) {
            try {
                products.add(parse(http.get(url + API + encode(code) + "?language=fr", headers())));
            } catch (ChainHttp.StatusException e) {
                if (e.status != 400 && e.status != 404) {
                    throw e;
                }
            }
        }
        return products;
    }

    /** On sale when Coop reports an original price above the current one. */
    static ChainProduct parse(JsonNode p) {
        String code = p.path("code").asText();
        double price = p.path("price").path("value").asDouble();
        double original = p.path("originalPrice").path("value").asDouble();
        ChainProduct.Sale sale = null;
        if (original > price) {
            String label = text(p.path("listPromotions").path(0));
            sale = new ChainProduct.Sale(label != null ? label : "Sale", price, null);
        }
        String title = text(p.path("title"));
        String content = text(p.path("content"));
        String unit = text(p.path("contentUnit"));
        return new ChainProduct(Chain.COOP, code,
                title != null ? title : text(p.path("name")),
                null,
                content == null ? null : unit == null ? content : content + " " + unit,
                sale != null ? original : price,
                "https://www.coop.ch/fr/p/" + code,
                sale);
    }

    private static String[] headers() {
        return new String[]{"User-Agent", USER_AGENT, "Accept-Language", "fr-CH,fr;q=0.9"};
    }
}
