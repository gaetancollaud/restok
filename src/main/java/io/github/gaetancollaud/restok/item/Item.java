package io.github.gaetancollaud.restok.item;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import org.eclipse.microprofile.graphql.NonNull;

import java.util.UUID;

@Entity
public class Item {

    @Id
    @NonNull
    @GeneratedValue
    public UUID id;

    @NonNull
    @Column(nullable = false, columnDefinition = "text")
    public String name;
}
