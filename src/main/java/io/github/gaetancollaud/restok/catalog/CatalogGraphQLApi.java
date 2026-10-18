package io.github.gaetancollaud.restok.catalog;

import io.github.gaetancollaud.restok.product.Product;
import io.quarkus.logging.Log;
import jakarta.inject.Inject;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.GraphQLException;
import org.eclipse.microprofile.graphql.NonNull;
import org.eclipse.microprofile.graphql.Query;
import org.eclipse.microprofile.graphql.Source;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@GraphQLApi
public class CatalogGraphQLApi {

    @Inject
    Catalog catalog;

    @Query("chainSearch")
    @Description("Up to 10 of the chain's products matching the query; Lidl searches its current leaflet only")
    public @NonNull List<@NonNull ChainProduct> chainSearch(@NonNull Chain chain, @NonNull String query)
            throws GraphQLException {
        String trimmed = query.strip();
        if (trimmed.isEmpty()) {
            throw new GraphQLException("query must not be blank");
        }
        try {
            return catalog.search(chain, trimmed);
        } catch (RuntimeException e) {
            Log.warnf("%s search failed: %s", chain.label, e.toString());
            throw new GraphQLException(chain.label + " is unavailable");
        }
    }

    /** Batched: one products query fetches each chain's linked products in one go. */
    @Description("Its links to chain products, in chain order")
    public @NonNull List<@NonNull List<@NonNull ProductLink>> links(@Source List<Product> products) {
        Map<Catalog.Key, ChainProduct> found = catalog.products(products.stream()
                .flatMap(p -> p.codes.entrySet().stream().map(e -> new Catalog.Key(e.getKey(), e.getValue())))
                .toList());
        return products.stream()
                .map(p -> new TreeMap<>(p.codes).entrySet().stream()
                        .map(e -> new ProductLink(e.getKey(), e.getValue(),
                                found.get(new Catalog.Key(e.getKey(), e.getValue()))))
                        .toList())
                .toList();
    }
}
