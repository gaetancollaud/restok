package io.github.gaetancollaud.restok.category;

import org.eclipse.microprofile.graphql.Input;

/** Fields to change on a category; null leaves a field unchanged. */
@Input("CategoryUpdateInput")
public class CategoryUpdate {

    public String name;
}
