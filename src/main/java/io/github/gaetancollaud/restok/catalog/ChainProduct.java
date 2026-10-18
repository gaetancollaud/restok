package io.github.gaetancollaud.restok.catalog;

import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.NonNull;

import java.time.LocalDate;

/** A chain's product as the chain reports it now. Null fields are ones the chain doesn't give. */
public record ChainProduct(
        @NonNull Chain chain,
        @NonNull @Description("The chain's own product id") String code,
        @NonNull String name,
        String description,
        String quantity,
        @Description("Regular price in CHF") double price,
        @Description("Its page on the chain's site") String url,
        @Description("Null when not on sale today") Sale sale) {

    public record Sale(
            @NonNull String label,
            @Description("Sale price in CHF") double price,
            @Description("Last day of the sale; null when the chain doesn't say") LocalDate endDate) {
    }
}
