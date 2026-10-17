package io.github.gaetancollaud.restok.category;

import io.agroal.api.AgroalDataSource;
import io.github.gaetancollaud.restok.TestDb;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.github.gaetancollaud.restok.GraphQL.post;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class CategoryGraphQLApiTest {

    static final String LIST = "{ categories { id name } }";
    static final String ADD = "mutation($name: String!) { addCategory(name: $name) { id name } }";
    static final String RENAME = "mutation($id: String!, $name: String!) { renameCategory(id: $id, name: $name) { id name } }";
    static final String DELETE = "mutation($id: String!) { deleteCategory(id: $id) }";

    @Inject
    AgroalDataSource ds;

    @BeforeEach
    void clean() throws SQLException {
        TestDb.reset(ds);
    }

    String add(String name) {
        return post(ADD, Map.of("name", name)).body("errors", nullValue()).extract().path("data.addCategory.id");
    }

    @Test
    void listIsSortedByNameAndHasDefaults() {
        add("Aaa");
        List<String> expected = new ArrayList<>(TestDb.DEFAULT_CATEGORIES);
        expected.add("Aaa");
        expected.sort(null);
        post(LIST)
                .body("data.categories.name", is(expected))
                .body("data.categories.id", not(hasItem(nullValue())));
    }

    @Test
    void addTrimsName() {
        post(ADD, Map.of("name", " Spices "))
                .body("errors", nullValue())
                .body("data.addCategory.name", is("Spices"))
                .body("data.addCategory.id", notNullValue());
        post(LIST).body("data.categories.name", hasItem("Spices"));
    }

    @Test
    void blankNameIsRejected() {
        post(ADD, Map.of("name", "   "))
                .body("errors[0].message", is("name must not be blank"))
                .body("data.addCategory", nullValue());
        post(LIST).body("data.categories", hasSize(TestDb.DEFAULT_CATEGORIES.size()));
    }

    @Test
    void duplicateNameIgnoringCaseIsRejected() {
        post(ADD, Map.of("name", "fruits"))
                .body("errors[0].message", is("category name already exists"))
                .body("data.addCategory", nullValue());
        post(LIST).body("data.categories", hasSize(TestDb.DEFAULT_CATEGORIES.size()));
    }

    @Test
    void renameKeepsId() {
        String id = add("Spices");
        post(RENAME, Map.of("id", id, "name", " Herbs "))
                .body("errors", nullValue())
                .body("data.renameCategory.id", is(id))
                .body("data.renameCategory.name", is("Herbs"));
        // changing only the case of its own name is allowed
        post(RENAME, Map.of("id", id, "name", "HERBS")).body("data.renameCategory.name", is("HERBS"));
        post(LIST).body("data.categories.name", hasItem("HERBS")).body("data.categories.name", not(hasItems("Spices", "Herbs")));
    }

    @Test
    void renameToExistingNameIsRejected() {
        String id = add("Spices");
        post(RENAME, Map.of("id", id, "name", "pain")).body("errors[0].message", is("category name already exists"));
        post(LIST).body("data.categories.name", hasItem("Spices"));
    }

    @Test
    void unknownIdIsRejected() {
        String unknown = UUID.randomUUID().toString();
        post(RENAME, Map.of("id", unknown, "name", "x")).body("errors[0].message", is("category not found"));
        post(DELETE, Map.of("id", unknown)).body("errors[0].message", is("category not found"));
    }

    @Test
    void deleteReturnsIdAndRemoves() {
        String id = add("Spices");
        post(DELETE, Map.of("id", id)).body("errors", nullValue()).body("data.deleteCategory", is(id));
        post(LIST).body("data.categories.name", not(hasItem("Spices")));
    }
}
