package io.github.gaetancollaud.restok.shop;

import io.agroal.api.AgroalDataSource;
import io.github.gaetancollaud.restok.TestDb;
import io.github.gaetancollaud.restok.product.ProductGraphQLApiTest;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.github.gaetancollaud.restok.GraphQL.post;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
public class ShopGraphQLApiTest {

    static final String LIST = "{ shops { id name latitude longitude categoryOrder { name } } }";
    static final String ADD = """
            mutation($name: String!, $lat: Float, $lon: Float) {
              addShop(name: $name, latitude: $lat, longitude: $lon) { id name latitude longitude categoryOrder { name } }
            }""";
    static final String UPDATE = """
            mutation($id: String!, $name: String!, $lat: Float, $lon: Float) {
              updateShop(id: $id, name: $name, latitude: $lat, longitude: $lon) { id name latitude longitude }
            }""";
    static final String DELETE = "mutation($id: String!) { deleteShop(id: $id) }";
    static final String SET_ORDER = """
            mutation($id: String!, $ids: [String!]!) {
              setShopCategoryOrder(shopId: $id, categoryIds: $ids) { id categoryOrder { name } }
            }""";

    @Inject
    AgroalDataSource ds;

    @BeforeEach
    void clean() throws SQLException {
        TestDb.reset(ds);
    }

    public static String addShop(String name) {
        return post(ADD, Map.of("name", name, "lat", 46.52, "lon", 6.63))
                .body("errors", nullValue()).extract().path("data.addShop.id");
    }

    public static String categoryId(String name) {
        return post("{ categories { id name } }").extract().path("data.categories.find { it.name == '" + name + "' }.id");
    }

    public static void setOrder(String shopId, String... categoryNames) {
        List<String> ids = List.of(categoryNames).stream().map(ShopGraphQLApiTest::categoryId).toList();
        post(SET_ORDER, Map.of("id", shopId, "ids", ids)).body("errors", nullValue());
    }

    public static List<String> orderOf(String shopId) {
        return post(LIST).extract().path("data.shops.find { it.id == '" + shopId + "' }.categoryOrder.name");
    }

    @Test
    void emptyList() {
        post(LIST).body("data.shops", empty());
    }

    @Test
    void listIsSortedByName() {
        addShop("Migros");
        addShop("Coop");
        post(LIST)
                .body("data.shops.name", contains("Coop", "Migros"))
                .body("data.shops.latitude", contains(46.52f, 46.52f))
                .body("data.shops.longitude", contains(6.63f, 6.63f));
    }

    @Test
    void addTrimsNameWithEmptyOrder() {
        post(ADD, Map.of("name", " Coop ", "lat", 46.52, "lon", 6.63))
                .body("errors", nullValue())
                .body("data.addShop.id", notNullValue())
                .body("data.addShop.name", is("Coop"))
                .body("data.addShop.categoryOrder", empty());
    }

    @Test
    void addWithoutLocation() {
        post(ADD, Map.of("name", "Lidl"))
                .body("errors", nullValue())
                .body("data.addShop.name", is("Lidl"))
                .body("data.addShop.latitude", nullValue())
                .body("data.addShop.longitude", nullValue());
    }

    @Test
    void invalidInputIsRejected() {
        post(ADD, Map.of("name", "Coop", "lat", 46.52)).body("errors[0].message", is("latitude and longitude must be given together"));
        post(ADD, Map.of("name", "  ", "lat", 0, "lon", 0)).body("errors[0].message", is("name must not be blank"));
        post(ADD, Map.of("name", "Coop", "lat", 91, "lon", 0)).body("errors[0].message", is("latitude must be between -90 and 90"));
        post(ADD, Map.of("name", "Coop", "lat", 0, "lon", -181)).body("errors[0].message", is("longitude must be between -180 and 180"));
        post(LIST).body("data.shops", empty());
    }

    @Test
    void updateMovesShop() {
        String id = addShop("Coop");
        post(UPDATE, Map.of("id", id, "name", "Coop City", "lat", -33.9, "lon", 151.2))
                .body("errors", nullValue())
                .body("data.updateShop.name", is("Coop City"))
                .body("data.updateShop.latitude", is(-33.9f));
        post(LIST).body("data.shops.longitude", contains(151.2f));
    }

    @Test
    void invalidUpdateChangesNothing() {
        String id = addShop("Coop");
        post(UPDATE, Map.of("id", id, "name", "Coop", "lat", 100, "lon", 0)).body("errors[0].message", is("latitude must be between -90 and 90"));
        post(LIST).body("data.shops.latitude", contains(46.52f));
    }

    @Test
    void unknownShopIsRejected() {
        String unknown = UUID.randomUUID().toString();
        post(UPDATE, Map.of("id", unknown, "name", "x", "lat", 0, "lon", 0)).body("errors[0].message", is("shop not found"));
        post(DELETE, Map.of("id", unknown)).body("errors[0].message", is("shop not found"));
        post(SET_ORDER, Map.of("id", unknown, "ids", List.of())).body("errors[0].message", is("shop not found"));
    }

    @Test
    void deleteKeepsCategories() {
        String id = addShop("Coop");
        setOrder(id, "Pain", "Fruits");
        post(DELETE, Map.of("id", id)).body("errors", nullValue()).body("data.deleteShop", is(id));
        post(LIST).body("data.shops", empty());
        post("{ categories { name } }").body("data.categories", hasSize(TestDb.DEFAULT_CATEGORIES.size()));
    }

    @Test
    void deleteFreesRestrictedProducts() {
        String lidl = addShop("Lidl");
        String parmesan = ProductGraphQLApiTest.addProduct("parmesan");
        ProductGraphQLApiTest.setShop(parmesan, lidl);
        post(DELETE, Map.of("id", lidl)).body("errors", nullValue());
        post("{ products { name shop { name } } }").body("data.products.name", contains("parmesan"))
                .body("data.products[0].shop", nullValue());
    }

    @Test
    void setOrderReplacesWholeOrder() {
        String id = addShop("Coop");
        post(SET_ORDER, Map.of("id", id, "ids", List.of(categoryId("Pain"), categoryId("Fruits"))))
                .body("errors", nullValue())
                .body("data.setShopCategoryOrder.categoryOrder.name", contains("Pain", "Fruits"));
        setOrder(id, "Fromage");
        assertEquals(List.of("Fromage"), orderOf(id));
        setOrder(id);
        assertEquals(List.of(), orderOf(id));
    }

    @Test
    void ordersArePerShop() {
        String a = addShop("A");
        String b = addShop("B");
        setOrder(a, "Pain", "Fruits");
        setOrder(b, "Fruits", "Pain");
        assertEquals(List.of("Pain", "Fruits"), orderOf(a));
        assertEquals(List.of("Fruits", "Pain"), orderOf(b));
    }

    @Test
    void invalidOrderKeepsPreviousOrder() {
        String id = addShop("Coop");
        setOrder(id, "Pain", "Fruits");
        String bread = categoryId("Pain");
        post(SET_ORDER, Map.of("id", id, "ids", List.of(bread, bread))).body("errors[0].message", is("duplicate category in order"));
        post(SET_ORDER, Map.of("id", id, "ids", List.of(bread, UUID.randomUUID().toString()))).body("errors[0].message", is("category not found"));
        assertEquals(List.of("Pain", "Fruits"), orderOf(id));
    }

    @Test
    void deletingCategoryRemovesItFromOrders() {
        String id = addShop("Coop");
        String spices = post("mutation { addCategory(name: \"Spices\") { id } }").extract().path("data.addCategory.id");
        setOrder(id, "Pain", "Spices", "Fruits");
        post("mutation($id: String!) { deleteCategory(id: $id) }", Map.of("id", spices)).body("errors", nullValue());
        assertEquals(List.of("Pain", "Fruits"), orderOf(id));
    }
}
