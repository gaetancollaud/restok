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

    /** Puts a flushed category last in every shop's order, first in an empty one. Must run in a transaction. */
    public void appendToAllShops(ProductCategory category) {
        getEntityManager().createNativeQuery("""
                        insert into shop_category_order (shop_id, category_id, position)
                        select s.id, :category,
                               coalesce((select max(o.position) + 1 from shop_category_order o where o.shop_id = s.id), 0)
                        from shop s""")
                .setParameter("category", category.id)
                .executeUpdate();
    }

    /** Gives a flushed shop every category, sorted by name. Must run in a transaction. */
    public void seed(Shop shop) {
        getEntityManager().createNativeQuery("""
                        insert into shop_category_order (shop_id, category_id, position)
                        select :shop, c.id, row_number() over (order by c.name) - 1
                        from product_category c""")
                .setParameter("shop", shop.id)
                .executeUpdate();
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
