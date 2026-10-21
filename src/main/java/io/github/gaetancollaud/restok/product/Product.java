package io.github.gaetancollaud.restok.product;

import io.github.gaetancollaud.restok.category.ProductCategory;
import io.github.gaetancollaud.restok.shop.Shop;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import org.eclipse.microprofile.graphql.NonNull;

import java.time.Instant;
import java.util.UUID;

@Entity
public class Product {

    @Id
    @NonNull
    @GeneratedValue
    public UUID id;

    @NonNull
    @Column(nullable = false, columnDefinition = "text")
    public String name;

    /** How many to buy, at least 1. */
    @Column(nullable = false)
    public int quantity = 1;

    @Column(nullable = false)
    public boolean bought;

    /** When it was last marked bought; null while not bought. */
    @Column(name = "bought_at")
    public Instant boughtAt;

    /** Null when uncategorized. Eager: GraphQL serializes it after the session is gone. */
    @ManyToOne
    @JoinColumn(name = "category_id")
    public ProductCategory category;

    /** The only shop to buy it at; null when it can be bought anywhere. */
    @ManyToOne
    @JoinColumn(name = "shop_id")
    public Shop shop;

    @NonNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "text")
    public ProductClassification classification;
}
