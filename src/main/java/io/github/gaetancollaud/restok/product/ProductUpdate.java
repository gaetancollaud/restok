package io.github.gaetancollaud.restok.product;

import org.eclipse.microprofile.graphql.Input;

/** Fields to change on a product; null leaves a field unchanged, "" clears an id. */
@Input("ProductUpdateInput")
public class ProductUpdate {

    public String name;

    /** At least 1. */
    public Integer quantity;

    public Boolean bought;

    /** "" removes the category. */
    public String categoryId;

    /** "" lets it be bought anywhere again. */
    public String shopId;
}
