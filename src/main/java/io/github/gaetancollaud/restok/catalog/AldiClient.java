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

/** api.aldi-suisse.ch, the API behind aldi-suisse.ch. Prices are in centimes. */
@ApplicationScoped
public class AldiClient implements ChainClient {

    /** Prices are national; the API still wants a store. */
    static final String SERVICE_POINT = "E172";

    @ConfigProperty(name = "restok.catalog.aldi-url")
    String url;

    @Inject
    ChainHttp http;

    @Override
    public Chain chain() {
        return Chain.ALDI;
    }

    /** Aldi only accepts some page sizes; 12 is one. */
    @Override
    public List<ChainProduct> search(String query) {
        JsonNode found = http.get(url + "/v3/product-search?q=" + encode(query) + "&servicePoint=" + SERVICE_POINT
                + "&serviceType=walk-in&offset=0&limit=12", headers());
        List<ChainProduct> products = new ArrayList<>();
        found.path("data").forEach(p -> {
            if (products.size() < MAX_RESULTS) products.add(parse(p));
        });
        return products;
    }

    /** One call per code. */
    @Override
    public List<ChainProduct> products(Collection<String> codes) {
        List<ChainProduct> products = new ArrayList<>();
        for (String code : codes) {
            try {
                products.add(parse(http.get(url + "/v2/products/" + encode(code) + "?servicePoint=" + SERVICE_POINT,
                        headers()).path("data")));
            } catch (ChainHttp.StatusException e) {
                if (e.status != 404) {
                    throw e;
                }
            }
        }
        return products;
    }

    /** On sale when Aldi shows a "was" price, e.g. "CHF 3.79". */
    static ChainProduct parse(JsonNode p) {
        String sku = p.path("sku").asText();
        double price = p.path("price").path("amount").asInt() / 100.0;
        String was = text(p.path("price").path("wasPriceDisplay"));
        double regular = was == null ? 0 : Double.parseDouble("0" + was.replaceAll("[^0-9.]", ""));
        ChainProduct.Sale sale = null;
        if (regular > price) {
            String label = text(p.path("price").path("savingsDisplay"));
            sale = new ChainProduct.Sale(label != null ? label : "Sale", price, null);
        }
        String slug = text(p.path("urlSlugTextAlternatives").path("fr-CH"));
        if (slug == null) {
            slug = text(p.path("urlSlugText"));
        }
        return new ChainProduct(Chain.ALDI, sku, text(p.path("name")), text(p.path("description")),
                text(p.path("sellingSize")),
                sale != null ? regular : price,
                slug == null ? null : "https://www.aldi-suisse.ch/fr/p." + slug + "." + sku + ".html",
                sale);
    }

    /** Akamai lets the API through only for what looks like a request from aldi-suisse.ch. */
    private static String[] headers() {
        return new String[]{
                "User-Agent", MigrosClient.USER_AGENT,
                "Accept-Language", "fr-CH,fr;q=0.9",
                "Origin", "https://www.aldi-suisse.ch",
                "Referer", "https://www.aldi-suisse.ch/",
                "Sec-Fetch-Mode", "cors",
                "Sec-Fetch-Dest", "empty",
                "Sec-Fetch-Site", "same-site"};
    }
}
