package io.github.gaetancollaud.restok.product;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ProductRepository implements PanacheRepositoryBase<Product, UUID> {

    public List<Product> listByName() {
        return list("from Product p left join fetch p.category order by p.name");
    }

    /** Sorted by the category's position in the shop's order; unordered categories and uncategorized last. */
    public List<Product> listForShop(UUID shopId) {
        return list("""
                select p from Product p
                left join fetch p.category c
                left join ShopCategory sc on sc.category = c and sc.shop.id = ?1
                order by sc.position nulls last, p.name""", shopId);
    }
}
