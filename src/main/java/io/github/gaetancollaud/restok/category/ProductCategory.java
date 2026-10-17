package io.github.gaetancollaud.restok.category;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.eclipse.microprofile.graphql.NonNull;

import java.util.UUID;

@Entity
@Table(name = "product_category")
public class ProductCategory {

    @Id
    @NonNull
    @GeneratedValue
    public UUID id;

    @NonNull
    @Column(nullable = false, columnDefinition = "text")
    public String name;
}
