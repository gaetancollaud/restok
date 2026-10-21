package io.github.gaetancollaud.restok.product;

import io.github.gaetancollaud.restok.category.ProductCategory;
import io.github.gaetancollaud.restok.category.ProductCategoryRepository;
import io.github.gaetancollaud.restok.shop.Shop;
import io.github.gaetancollaud.restok.shop.ShopRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.vertx.core.eventbus.EventBus;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.graphql.DefaultValue;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.GraphQLException;
import org.eclipse.microprofile.graphql.Mutation;
import org.eclipse.microprofile.graphql.NonNull;
import org.eclipse.microprofile.graphql.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@GraphQLApi
public class ProductGraphQLApi {

    @Inject
    ProductRepository repository;

    @Inject
    ShopRepository shopRepository;

    @Inject
    ProductCategoryRepository categoryRepository;

    @Inject
    EventBus bus;

    @Query("products")
    public @NonNull List<@NonNull Product> products(UUID shopId) throws GraphQLException {
        if (shopId == null) {
            return repository.listByName();
        }
        if (shopRepository.findById(shopId) == null) {
            throw new GraphQLException("shop not found");
        }
        return repository.listForShop(shopId);
    }

    @Mutation
    public @NonNull Product addProduct(@NonNull String name, @DefaultValue("1") Integer quantity) throws GraphQLException {
        String trimmed = name.strip();
        if (trimmed.isEmpty()) {
            throw new GraphQLException("name must not be blank");
        }
        Product product = new Product();
        product.name = trimmed;
        product.quantity = quantity == null ? 1 : validQuantity(quantity);
        product.classification = ProductClassification.PENDING;
        // Explicit transaction (not @Transactional) so the event is sent after commit and the consumer sees the row
        QuarkusTransaction.requiringNew().run(() -> repository.persist(product));
        bus.send(ClassificationConsumer.ADDRESS, product.id.toString());
        return product;
    }

    @Mutation("updateProduct")
    @Transactional
    public @NonNull Product updateProduct(@NonNull UUID id, @NonNull ProductUpdate input) throws GraphQLException {
        Product product = find(id);
        // Resolve every field before assigning any: a GraphQLException is checked, so it doesn't roll back
        String name = input.name == null ? null : validName(input.name, id);
        Integer quantity = input.quantity == null ? null : validQuantity(input.quantity);
        ProductCategory category = input.categoryId == null || input.categoryId.isEmpty() ? null
                : uuid(input.categoryId).flatMap(categoryRepository::findByIdOptional)
                .orElseThrow(() -> new GraphQLException("category not found"));
        Shop shop = input.shopId == null || input.shopId.isEmpty() ? null
                : uuid(input.shopId).flatMap(shopRepository::findByIdOptional)
                .orElseThrow(() -> new GraphQLException("shop not found"));

        if (name != null) {
            product.name = name;
        }
        if (quantity != null) {
            product.quantity = quantity;
        }
        if (input.bought != null && product.bought != input.bought) {
            product.bought = input.bought;
            product.boughtAt = input.bought ? Instant.now() : null;
        }
        if (input.categoryId != null) {
            product.category = category;
            product.classification = category == null ? ProductClassification.UNCLASSIFIED : ProductClassification.CLASSIFIED;
        }
        if (input.shopId != null) {
            product.shop = shop;
        }
        return product;
    }

    @Mutation
    @Transactional
    public @NonNull UUID deleteProduct(@NonNull UUID id) throws GraphQLException {
        if (!repository.deleteById(id)) {
            throw new GraphQLException("product not found");
        }
        return id;
    }

    private Product find(UUID id) throws GraphQLException {
        return repository.findByIdOptional(id).orElseThrow(() -> new GraphQLException("product not found"));
    }

    /** Trimmed name, rejected when blank or used by another product (ignoring case). */
    private String validName(String name, UUID self) throws GraphQLException {
        String trimmed = name.strip();
        if (trimmed.isEmpty()) {
            throw new GraphQLException("name must not be blank");
        }
        // ponytail: check-then-update race can leave two products with one name; a unique index on lower(name) closes it
        if (repository.nameTakenByOther(trimmed, self)) {
            throw new GraphQLException("product name already exists");
        }
        return trimmed;
    }

    private static int validQuantity(int quantity) throws GraphQLException {
        if (quantity < 1) {
            throw new GraphQLException("quantity must be at least 1");
        }
        return quantity;
    }

    /** Empty for a malformed id, so it is reported like an unknown one. */
    private static Optional<UUID> uuid(String id) {
        try {
            return Optional.of(UUID.fromString(id));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
