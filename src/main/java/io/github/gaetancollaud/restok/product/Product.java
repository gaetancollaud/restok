package io.github.gaetancollaud.restok.product;

import io.github.gaetancollaud.restok.catalog.Chain;
import io.github.gaetancollaud.restok.category.ProductCategory;
import io.github.gaetancollaud.restok.shop.Shop;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.MapKeyEnumerated;
import org.eclipse.microprofile.graphql.Ignore;
import org.eclipse.microprofile.graphql.NonNull;

import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
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

    /** Its product code at each linked chain. GraphQL shows them resolved, as CatalogGraphQLApi.links. Eager like category. */
    @Ignore
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_link", joinColumns = @JoinColumn(name = "product_id"))
    @MapKeyColumn(name = "chain", columnDefinition = "text")
    @MapKeyEnumerated(EnumType.STRING)
    @Column(name = "code", nullable = false, columnDefinition = "text")
    public Map<Chain, String> codes = new EnumMap<>(Chain.class);

    @NonNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "text")
    public ProductClassification classification;
}
