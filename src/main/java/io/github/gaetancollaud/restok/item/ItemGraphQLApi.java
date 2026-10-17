package io.github.gaetancollaud.restok.item;

import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.GraphQLException;
import org.eclipse.microprofile.graphql.Mutation;
import org.eclipse.microprofile.graphql.NonNull;
import org.eclipse.microprofile.graphql.Query;

import java.util.List;

@GraphQLApi
public class ItemGraphQLApi {

    @Inject
    ItemRepository repository;

    @Query("items")
    @WithSession
    public Uni<@NonNull List<@NonNull Item>> items() {
        return repository.listByName();
    }

    @Mutation
    @WithTransaction
    public Uni<@NonNull Item> addItem(@NonNull String name) {
        String trimmed = name.strip();
        if (trimmed.isEmpty()) {
            return Uni.createFrom().failure(new GraphQLException("name must not be blank"));
        }
        Item item = new Item();
        item.name = trimmed;
        return repository.persist(item);
    }
}
