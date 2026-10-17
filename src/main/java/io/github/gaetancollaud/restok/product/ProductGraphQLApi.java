package io.github.gaetancollaud.restok.product;

import io.github.gaetancollaud.restok.category.ProductCategory;
import io.github.gaetancollaud.restok.category.ProductCategoryRepository;
import io.github.gaetancollaud.restok.shop.ShopRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.vertx.core.eventbus.EventBus;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.GraphQLException;
import org.eclipse.microprofile.graphql.Mutation;
import org.eclipse.microprofile.graphql.NonNull;
import org.eclipse.microprofile.graphql.Query;

import java.time.Instant;
import java.util.List;
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
    public @NonNull Product addProduct(@NonNull String name) throws GraphQLException {
        String trimmed = name.strip();
        if (trimmed.isEmpty()) {
            throw new GraphQLException("name must not be blank");
        }
        Product product = new Product();
        product.name = trimmed;
        product.classification = ProductClassification.PENDING;
        // Explicit transaction (not @Transactional) so the event is sent after commit and the consumer sees the row
        QuarkusTransaction.requiringNew().run(() -> repository.persist(product));
        bus.send(ClassificationConsumer.ADDRESS, product.id.toString());
        return product;
    }

    @Mutation("setProductBought") // without the name, SmallRye strips the "set" prefix
    @Transactional
    public @NonNull Product setProductBought(@NonNull UUID id, boolean bought) throws GraphQLException {
        Product product = find(id);
        if (product.bought != bought) {
            product.bought = bought;
            product.boughtAt = bought ? Instant.now() : null;
        }
        return product;
    }

    @Mutation("setProductCategory")
    @Transactional
    public @NonNull Product setProductCategory(@NonNull UUID id, UUID categoryId) throws GraphQLException {
        Product product = find(id);
        if (categoryId == null) {
            product.category = null;
            product.classification = ProductClassification.UNCLASSIFIED;
            return product;
        }
        ProductCategory category = categoryRepository.findByIdOptional(categoryId)
                .orElseThrow(() -> new GraphQLException("category not found"));
        product.category = category;
        product.classification = ProductClassification.CLASSIFIED;
        return product;
    }

    @Mutation("setProductShop")
    @Transactional
    public @NonNull Product setProductShop(@NonNull UUID id, UUID shopId) throws GraphQLException {
        Product product = find(id);
        if (shopId == null) {
            product.shop = null;
            return product;
        }
        product.shop = shopRepository.findByIdOptional(shopId).orElseThrow(() -> new GraphQLException("shop not found"));
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
}
