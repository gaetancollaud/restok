package io.github.gaetancollaud.restok.shop;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import org.eclipse.microprofile.graphql.NonNull;

import java.util.UUID;

@Entity
public class Shop {

    @Id
    @NonNull
    @GeneratedValue
    public UUID id;

    @NonNull
    @Column(nullable = false, columnDefinition = "text")
    public String name;

    @Column(nullable = false)
    public double latitude;

    @Column(nullable = false)
    public double longitude;
}
