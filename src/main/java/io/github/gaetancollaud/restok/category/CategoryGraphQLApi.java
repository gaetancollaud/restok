package io.github.gaetancollaud.restok.category;

import io.github.gaetancollaud.restok.product.ProductClassification;
import io.github.gaetancollaud.restok.product.ProductRepository;
import io.github.gaetancollaud.restok.shop.ShopCategoryRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.GraphQLException;
import org.eclipse.microprofile.graphql.Mutation;
import org.eclipse.microprofile.graphql.NonNull;
import org.eclipse.microprofile.graphql.Query;

import java.util.List;
import java.util.UUID;

@GraphQLApi
public class CategoryGraphQLApi {

    @Inject
    ProductCategoryRepository repository;

    @Inject
    ShopCategoryRepository orderRepository;

    @Inject
    ProductRepository productRepository;

    @Query("categories")
    public @NonNull List<@NonNull ProductCategory> categories() {
        return repository.listByName();
    }

    @Mutation
    @Transactional
    public @NonNull ProductCategory addCategory(@NonNull String name) throws GraphQLException {
        ProductCategory category = new ProductCategory();
        category.name = validName(name, null);
        repository.persist(category);
        repository.flush(); // the native insert below references the new row
        orderRepository.appendToAllShops(category);
        return category;
    }

    @Mutation
    @Transactional
    public @NonNull ProductCategory updateCategory(@NonNull UUID id, @NonNull CategoryUpdate input) throws GraphQLException {
        ProductCategory category = repository.findByIdOptional(id)
                .orElseThrow(() -> new GraphQLException("category not found"));
        if (input.name != null) {
            category.name = validName(input.name, id);
        }
        return category;
    }

    @Mutation
    @Transactional
    public @NonNull UUID deleteCategory(@NonNull UUID id) throws GraphQLException {
        // FKs: products in it become uncategorized, shop orders drop it; the status shows the red dot again
        productRepository.update("classification = ?1 where category.id = ?2", ProductClassification.UNCLASSIFIED, id);
        if (!repository.deleteById(id)) {
            throw new GraphQLException("category not found");
        }
        return id;
    }

    /** Trimmed name, rejected when blank or used by another category (ignoring case). */
    private String validName(String name, UUID self) throws GraphQLException {
        String trimmed = name.strip();
        if (trimmed.isEmpty()) {
            throw new GraphQLException("name must not be blank");
        }
        // ponytail: check-then-insert race is caught by the unique index on lower(name), surfacing as a generic error
        ProductCategory existing = repository.findByNameIgnoreCase(trimmed);
        if (existing != null && !existing.id.equals(self)) {
            throw new GraphQLException("category name already exists");
        }
        return trimmed;
    }
}
