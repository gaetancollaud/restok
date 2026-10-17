package io.github.gaetancollaud.restok.item;

import io.quarkus.hibernate.reactive.panache.PanacheRepositoryBase;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ItemRepository implements PanacheRepositoryBase<Item, UUID> {

    public Uni<List<Item>> listByName() {
        return list("order by name");
    }
}
