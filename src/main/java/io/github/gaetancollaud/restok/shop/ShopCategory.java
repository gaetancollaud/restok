package io.github.gaetancollaud.restok.shop;

import io.github.gaetancollaud.restok.category.ProductCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.util.UUID;

/** Position of a category in a shop's aisle order. Gaps are fine: only the ordering matters. */
@Entity
@Table(name = "shop_category_order")
@IdClass(ShopCategory.Key.class)
public class ShopCategory {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shop_id")
    public Shop shop;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    public ProductCategory category;

    @Column(nullable = false)
    public int position;

    public record Key(UUID shop, UUID category) implements Serializable {
    }
}
