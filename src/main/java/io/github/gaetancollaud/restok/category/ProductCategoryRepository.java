package io.github.gaetancollaud.restok.category;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ProductCategoryRepository implements PanacheRepositoryBase<ProductCategory, UUID> {

    public List<ProductCategory> listByName() {
        return list("order by name");
    }

    public ProductCategory findByNameIgnoreCase(String name) {
        return find("lower(name) = lower(?1)", name).firstResult();
    }
}
