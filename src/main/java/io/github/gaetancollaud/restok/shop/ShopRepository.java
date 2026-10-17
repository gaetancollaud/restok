package io.github.gaetancollaud.restok.shop;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ShopRepository implements PanacheRepositoryBase<Shop, UUID> {

    public List<Shop> listByName() {
        return list("order by name");
    }
}
