package io.github.gaetancollaud.restok.catalog;

import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.NonNull;

/** A list product's link to a chain product. */
public record ProductLink(
        @NonNull Chain chain,
        @NonNull String code,
        @Description("Null when the chain doesn't know the code anymore or can't be reached") ChainProduct product) {
}
