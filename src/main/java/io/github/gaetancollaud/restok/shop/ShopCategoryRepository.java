package io.github.gaetancollaud.restok.shop;

import io.github.gaetancollaud.restok.category.ProductCategory;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class ShopCategoryRepository implements PanacheRepositoryBase<ShopCategory, ShopCategory.Key> {

    /** Ordered categories per shop id; shops without an order are absent from the map. */
    public Map<UUID, List<ProductCategory>> orderOf(Collection<UUID> shopIds) {
        return list("from ShopCategory sc join fetch sc.category where sc.shop.id in ?1 order by sc.position", shopIds)
                .stream().collect(Collectors.groupingBy(sc -> sc.shop.id,
                        Collectors.mapping(sc -> sc.category, Collectors.toCollection(ArrayList::new))));
    }

    /** Replaces the shop's whole order. Must run in a transaction. */
    public void replace(Shop shop, List<ProductCategory> ordered) {
        delete("shop.id", shop.id);
        for (int i = 0; i < ordered.size(); i++) {
            ShopCategory row = new ShopCategory();
            row.shop = shop;
            row.category = ordered.get(i);
            row.position = i;
            persist(row);
        }
    }
}
