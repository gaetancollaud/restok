package io.github.gaetancollaud.restok.item;

import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.Map;

import static io.github.gaetancollaud.restok.GraphQL.post;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class ItemGraphQLApiTest {

    static final String ADD = "mutation($name: String!) { addItem(name: $name) { id name } }";

    @Inject
    AgroalDataSource ds;

    @BeforeEach
    void clean() throws SQLException {
        try (var c = ds.getConnection(); var s = c.createStatement()) {
            s.execute("delete from item");
        }
    }

    @Test
    void emptyList() {
        post("{ items { id name } }").body("data.items", empty());
    }

    @Test
    void listIsOrderedByName() {
        post(ADD, Map.of("name", "b"));
        post(ADD, Map.of("name", "a"));
        post("{ items { id name } }")
                .body("data.items.name", contains("a", "b"))
                .body("data.items.id", contains(notNullValue(), notNullValue()));
    }

    @Test
    void addTrimsName() {
        post(ADD, Map.of("name", "  bolt "))
                .body("errors", nullValue())
                .body("data.addItem.name", is("bolt"))
                .body("data.addItem.id", notNullValue());
        post("{ items { name } }").body("data.items.name", hasItem("bolt"));
    }

    @Test
    void blankNameIsRejected() {
        post(ADD, Map.of("name", "   "))
                .body("errors[0].message", is("name must not be blank"))
                .body("data.addItem", nullValue());
        post("{ items { id } }").body("data.items", empty());
    }
}
