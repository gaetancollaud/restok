package io.github.gaetancollaud.restok.category;

import io.agroal.api.AgroalDataSource;
import io.github.gaetancollaud.restok.TestDb;
import io.github.gaetancollaud.restok.product.ProductGraphQLApiTest;
import io.github.gaetancollaud.restok.shop.ShopGraphQLApiTest;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import static io.github.gaetancollaud.restok.GraphQL.post;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
class CategoryGraphQLApiTest {

    static final String LIST = "{ categories { id name } }";
    static final String ADD = "mutation($name: String!) { addCategory(name: $name) { id name } }";
    static final String UPDATE = "mutation($id: String!, $input: CategoryUpdateInput!) { updateCategory(id: $id, input: $input) { id name } }";
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

    ValidatableResponse update(String id, Map<String, Object> input) {
        return post(UPDATE, Map.of("id", id, "input", input));
    }

    @Test
    void renameKeepsId() {
        String id = add("Spices");
        update(id, Map.of("name", " Herbs "))
                .body("errors", nullValue())
                .body("data.updateCategory.id", is(id))
                .body("data.updateCategory.name", is("Herbs"));
        // changing only the case of its own name is allowed
        update(id, Map.of("name", "HERBS")).body("data.updateCategory.name", is("HERBS"));
        post(LIST).body("data.categories.name", hasItem("HERBS")).body("data.categories.name", not(hasItems("Spices", "Herbs")));
    }

    @Test
    void emptyInputChangesNothing() {
        String id = add("Spices");
        update(id, Map.of()).body("errors", nullValue()).body("data.updateCategory.name", is("Spices"));
    }

    @Test
    void renameToExistingNameIsRejected() {
        String id = add("Spices");
        update(id, Map.of("name", "pain")).body("errors[0].message", is("category name already exists"));
        update(id, Map.of("name", "  ")).body("errors[0].message", is("name must not be blank"));
        post(LIST).body("data.categories.name", hasItem("Spices"));
    }

    @Test
    void unknownIdIsRejected() {
        String unknown = UUID.randomUUID().toString();
        update(unknown, Map.of("name", "x")).body("errors[0].message", is("category not found"));
        post(DELETE, Map.of("id", unknown)).body("errors[0].message", is("category not found"));
    }

    @Test
    void renameCategoryIsGone() {
        String id = add("Spices");
        post("mutation($id: String!) { renameCategory(id: $id, name: \"x\") { id } }", Map.of("id", id))
                .body("errors[0].message", containsString("renameCategory"));
    }

    @Test
    void deleteReturnsIdAndRemoves() {
        String id = add("Spices");
        post(DELETE, Map.of("id", id)).body("errors", nullValue()).body("data.deleteCategory", is(id));
        post(LIST).body("data.categories.name", not(hasItem("Spices")));
    }

    @Test
    void deleteUnclassifiesItsProducts() {
        String spices = add("Spices"); // not a default: TestDb.reset doesn't restore deleted defaults
        String pepper = ProductGraphQLApiTest.addProduct("pepper");
        ProductGraphQLApiTest.setCategory(pepper, "Spices");
        post(DELETE, Map.of("id", spices)).body("errors", nullValue());
        post("{ products { name classification category { name } } }")
                .body("data.products[0].classification", is("UNCLASSIFIED"))
                .body("data.products[0].category", nullValue());
    }

    @Test
    void addAppendsToEveryShop() {
        String coop = ShopGraphQLApiTest.addShop("Coop");
        String lidl = ShopGraphQLApiTest.addShop("Lidl");
        ShopGraphQLApiTest.setOrder(coop, "Pain", "Fruits");
        List<String> coopBefore = ShopGraphQLApiTest.orderOf(coop);
        List<String> lidlBefore = ShopGraphQLApiTest.orderOf(lidl);
        add("Épices");
        assertEquals(Stream.concat(coopBefore.stream(), Stream.of("Épices")).toList(), ShopGraphQLApiTest.orderOf(coop));
        assertEquals(Stream.concat(lidlBefore.stream(), Stream.of("Épices")).toList(), ShopGraphQLApiTest.orderOf(lidl));
    }

    @Test
    void rejectedAddChangesNoOrder() {
        String coop = ShopGraphQLApiTest.addShop("Coop");
        ShopGraphQLApiTest.setOrder(coop, "Pain", "Fruits");
        post(ADD, Map.of("name", "fruits")).body("errors[0].message", is("category name already exists"));
        post(ADD, Map.of("name", "  ")).body("errors[0].message", is("name must not be blank"));
        assertEquals(ShopGraphQLApiTest.full("Pain", "Fruits"), ShopGraphQLApiTest.orderOf(coop));
    }

    @Test
    void shopAddedLaterGetsIt() {
        add("Épices");
        String coop = ShopGraphQLApiTest.addShop("Coop");
        assertEquals(ShopGraphQLApiTest.full(), ShopGraphQLApiTest.orderOf(coop));
    }
}
