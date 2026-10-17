package io.github.gaetancollaud.restok.product;

import io.agroal.api.AgroalDataSource;
import io.github.gaetancollaud.restok.TestDb;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static io.github.gaetancollaud.restok.GraphQL.post;
import static io.github.gaetancollaud.restok.shop.ShopGraphQLApiTest.addShop;
import static io.github.gaetancollaud.restok.shop.ShopGraphQLApiTest.categoryId;
import static io.github.gaetancollaud.restok.shop.ShopGraphQLApiTest.setOrder;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class ProductGraphQLApiTest {

    static final String FIELDS = "{ id name bought classification category { name } }";
    static final String LIST = "query($shopId: String) { products(shopId: $shopId) " + FIELDS + " }";
    static final String ADD = "mutation($name: String!) { addProduct(name: $name) " + FIELDS + " }";
    static final String SET_BOUGHT = "mutation($id: String!, $b: Boolean!) { setProductBought(id: $id, bought: $b) " + FIELDS + " }";
    static final String SET_CATEGORY = "mutation($id: String!, $c: String) { setProductCategory(id: $id, categoryId: $c) " + FIELDS + " }";
    static final String DELETE = "mutation($id: String!) { deleteProduct(id: $id) }";

    @Inject
    AgroalDataSource ds;

    @BeforeEach
    void clean() throws SQLException {
        TestDb.reset(ds);
    }

    public static String addProduct(String name) {
        return post(ADD, Map.of("name", name)).body("errors", nullValue()).extract().path("data.addProduct.id");
    }

    public static void setCategory(String productId, String categoryName) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("id", productId);
        vars.put("c", categoryName == null ? null : categoryId(categoryName));
        post(SET_CATEGORY, vars).body("errors", nullValue());
    }

    static Map<String, Object> shop(String shopId) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("shopId", shopId);
        return vars;
    }

    @Test
    void emptyList() {
        post(LIST, shop(null)).body("data.products", empty());
    }

    @Test
    void listIsSortedByName() {
        addProduct("tomato");
        addProduct("apple");
        post(LIST, shop(null)).body("data.products.name", contains("apple", "tomato"));
    }

    @Test
    void addTrimsNameAndStartsPending() {
        post(ADD, Map.of("name", " tomato "))
                .body("errors", nullValue())
                .body("data.addProduct.id", notNullValue())
                .body("data.addProduct.name", is("tomato"))
                .body("data.addProduct.bought", is(false))
                .body("data.addProduct.category", nullValue())
                .body("data.addProduct.classification", is("PENDING"));
    }

    @Test
    void blankNameIsRejected() {
        post(ADD, Map.of("name", "  ")).body("errors[0].message", is("name must not be blank"));
        post(LIST, shop(null)).body("data.products", empty());
    }

    @Test
    void sortedByShopOrder() {
        String coop = addShop("Coop");
        String migros = addShop("Migros");
        setOrder(coop, "Pain", "Fruits");
        setOrder(migros, "Fruits", "Pain");
        setCategory(addProduct("apple"), "Fruits");
        setCategory(addProduct("baguette"), "Pain");
        setCategory(addProduct("feta"), "Fromage");
        setCategory(addProduct("foo"), null);

        post(LIST, shop(coop)).body("errors", nullValue()).body("data.products.name", contains("baguette", "apple", "feta", "foo"));
        post(LIST, shop(migros)).body("data.products.name", contains("apple", "baguette", "feta", "foo"));
    }

    @Test
    void unknownShopIsRejected() {
        post(LIST, shop(UUID.randomUUID().toString())).body("errors[0].message", is("shop not found"));
    }

    @Test
    void boughtCanBeCheckedAndUnchecked() {
        String id = addProduct("apple");
        post(SET_BOUGHT, Map.of("id", id, "b", true)).body("data.setProductBought.bought", is(true));
        post(SET_BOUGHT, Map.of("id", id, "b", false)).body("data.setProductBought.bought", is(false));
        post(LIST, shop(null)).body("data.products.bought", contains(false));
    }

    @Test
    void categoryCanBeSetAndCleared() {
        String id = addProduct("tomato");
        post(SET_CATEGORY, Map.of("id", id, "c", categoryId("Légumes")))
                .body("data.setProductCategory.category.name", is("Légumes"))
                .body("data.setProductCategory.classification", is("CLASSIFIED"));
        Map<String, Object> clear = new HashMap<>();
        clear.put("id", id);
        clear.put("c", null);
        post(SET_CATEGORY, clear)
                .body("data.setProductCategory.category", nullValue())
                .body("data.setProductCategory.classification", is("UNCLASSIFIED"));
    }

    @Test
    void unknownIdsAreRejected() {
        String unknown = UUID.randomUUID().toString();
        post(SET_BOUGHT, Map.of("id", unknown, "b", true)).body("errors[0].message", is("product not found"));
        post(SET_CATEGORY, Map.of("id", unknown, "c", categoryId("Fruits"))).body("errors[0].message", is("product not found"));
        post(SET_CATEGORY, Map.of("id", addProduct("apple"), "c", unknown)).body("errors[0].message", is("category not found"));
        post(DELETE, Map.of("id", unknown)).body("errors[0].message", is("product not found"));
    }

    @Test
    void deleteRemoves() {
        String id = addProduct("apple");
        post(DELETE, Map.of("id", id)).body("errors", nullValue()).body("data.deleteProduct", is(id));
        post(LIST, shop(null)).body("data.products.id", not(hasItem(id)));
    }

    @Test
    void deletingCategoryUncategorizesProducts() {
        String spices = post("mutation { addCategory(name: \"Spices\") { id } }").extract().path("data.addCategory.id");
        String id = addProduct("pepper");
        setCategory(id, "Spices");
        post("mutation($id: String!) { deleteCategory(id: $id) }", Map.of("id", spices)).body("errors", nullValue());
        post(LIST, shop(null)).body("data.products[0].category", nullValue());
    }
}
