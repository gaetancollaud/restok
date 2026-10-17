package io.github.gaetancollaud.restok.shop;

import io.github.gaetancollaud.restok.category.ProductCategory;
import io.github.gaetancollaud.restok.category.ProductCategoryRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.GraphQLException;
import org.eclipse.microprofile.graphql.Mutation;
import org.eclipse.microprofile.graphql.NonNull;
import org.eclipse.microprofile.graphql.Query;
import org.eclipse.microprofile.graphql.Source;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@GraphQLApi
public class ShopGraphQLApi {

    @Inject
    ShopRepository repository;

    @Inject
    ShopCategoryRepository orderRepository;

    @Inject
    ProductCategoryRepository categoryRepository;

    @Query("shops")
    public @NonNull List<@NonNull Shop> shops() {
        return repository.listByName();
    }

    /** Batched: one query for all shops of a response. */
    public @NonNull List<@NonNull List<@NonNull ProductCategory>> categoryOrder(@Source List<Shop> shops) {
        Map<UUID, List<ProductCategory>> byShop = orderRepository.orderOf(shops.stream().map(s -> s.id).toList());
        return shops.stream().map(s -> byShop.getOrDefault(s.id, List.of())).toList();
    }

    @Mutation
    @Transactional
    public @NonNull Shop addShop(@NonNull String name, double latitude, double longitude) throws GraphQLException {
        validate(name, latitude, longitude);
        Shop shop = new Shop();
        apply(shop, name, latitude, longitude);
        repository.persist(shop);
        return shop;
    }

    @Mutation
    @Transactional
    public @NonNull Shop updateShop(@NonNull UUID id, @NonNull String name, double latitude, double longitude)
            throws GraphQLException {
        validate(name, latitude, longitude);
        Shop shop = find(id);
        apply(shop, name, latitude, longitude);
        return shop;
    }

    @Mutation
    @Transactional
    public @NonNull UUID deleteShop(@NonNull UUID id) throws GraphQLException {
        // FK cascade removes the shop's category order
        if (!repository.deleteById(id)) {
            throw new GraphQLException("shop not found");
        }
        return id;
    }

    @Mutation("setShopCategoryOrder") // without the name, SmallRye strips the "set" prefix
    @Transactional
    public @NonNull Shop setShopCategoryOrder(@NonNull UUID shopId, @NonNull List<@NonNull UUID> categoryIds)
            throws GraphQLException {
        if (new HashSet<>(categoryIds).size() != categoryIds.size()) {
            throw new GraphQLException("duplicate category in order");
        }
        Shop shop = find(shopId);
        Map<UUID, ProductCategory> byId = categoryIds.isEmpty() ? Map.of()
                : categoryRepository.list("id in ?1", categoryIds).stream()
                .collect(Collectors.toMap(c -> c.id, Function.identity()));
        if (byId.size() != categoryIds.size()) {
            throw new GraphQLException("category not found");
        }
        orderRepository.replace(shop, categoryIds.stream().map(byId::get).toList());
        return shop;
    }

    private Shop find(UUID id) throws GraphQLException {
        return repository.findByIdOptional(id).orElseThrow(() -> new GraphQLException("shop not found"));
    }

    private static void validate(String name, double latitude, double longitude) throws GraphQLException {
        if (name.isBlank()) {
            throw new GraphQLException("name must not be blank");
        }
        if (latitude < -90 || latitude > 90) {
            throw new GraphQLException("latitude must be between -90 and 90");
        }
        if (longitude < -180 || longitude > 180) {
            throw new GraphQLException("longitude must be between -180 and 180");
        }
    }

    private static void apply(Shop shop, String name, double latitude, double longitude) {
        shop.name = name.strip();
        shop.latitude = latitude;
        shop.longitude = longitude;
    }
}
