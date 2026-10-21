package io.github.gaetancollaud.restok.product;

import io.agroal.api.AgroalDataSource;
import io.github.gaetancollaud.restok.TestDb;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.ValidatableResponse;
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
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
public class ProductGraphQLApiTest {

    static final String FIELDS = "{ id name quantity bought boughtAt classification category { name } shop { name } }";
    static final String LIST = "query($shopId: String) { products(shopId: $shopId) " + FIELDS + " }";
    static final String ADD = "mutation($name: String!) { addProduct(name: $name) " + FIELDS + " }";
    static final String ADD_QUANTITY = "mutation($name: String!, $quantity: Int) { addProduct(name: $name, quantity: $quantity) " + FIELDS + " }";
    static final String UPDATE = "mutation($id: String!, $input: ProductUpdateInput!) { updateProduct(id: $id, input: $input) " + FIELDS + " }";
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

    static ValidatableResponse update(String id, Map<String, Object> input) {
        return post(UPDATE, Map.of("id", id, "input", input));
    }

    /** A null category name clears it. */
    public static void setCategory(String productId, String categoryName) {
        update(productId, Map.of("categoryId", categoryName == null ? "" : categoryId(categoryName))).body("errors", nullValue());
    }

    /** A null shop lets it be bought anywhere. */
    public static void setShop(String productId, String shopId) {
        update(productId, Map.of("shopId", shopId == null ? "" : shopId)).body("errors", nullValue());
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
                .body("data.addProduct.quantity", is(1))
                .body("data.addProduct.bought", is(false))
                .body("data.addProduct.category", nullValue())
                .body("data.addProduct.shop", nullValue())
                .body("data.addProduct.classification", is("PENDING"));
    }

    @Test
    void blankNameIsRejected() {
        post(ADD, Map.of("name", "  ")).body("errors[0].message", is("name must not be blank"));
        post(LIST, shop(null)).body("data.products", empty());
    }

    @Test
    void addWithQuantity() {
        post(ADD_QUANTITY, Map.of("name", "apple", "quantity", 3))
                .body("errors", nullValue())
                .body("data.addProduct.name", is("apple"))
                .body("data.addProduct.quantity", is(3));
        post(LIST, shop(null)).body("data.products[0].quantity", is(3));
    }

    @Test
    void addDoesNotParseTheName() {
        post(ADD, Map.of("name", "2 apples"))
                .body("data.addProduct.name", is("2 apples"))
                .body("data.addProduct.quantity", is(1));
    }

    @Test
    void quantityBelowOneIsRejectedOnAdd() {
        post(ADD_QUANTITY, Map.of("name", "apple", "quantity", 0)).body("errors[0].message", is("quantity must be at least 1"));
        post(LIST, shop(null)).body("data.products", empty());
    }

    @Test
    void quantityCanBeUpdated() {
        String id = addProduct("apple");
        update(id, Map.of("quantity", 4)).body("errors", nullValue()).body("data.updateProduct.quantity", is(4));
        post(LIST, shop(null)).body("data.products[0].quantity", is(4)).body("data.products[0].name", is("apple"));
    }

    @Test
    void quantityBelowOneIsRejectedOnUpdate() {
        String id = addProduct("apple");
        update(id, Map.of("quantity", 2));
        update(id, Map.of("quantity", 0)).body("errors[0].message", is("quantity must be at least 1"));
        post(LIST, shop(null)).body("data.products[0].quantity", is(2));
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
        update(id, Map.of("bought", true)).body("data.updateProduct.bought", is(true))
                .body("data.updateProduct.boughtAt", notNullValue());
        update(id, Map.of("bought", false)).body("data.updateProduct.bought", is(false))
                .body("data.updateProduct.boughtAt", nullValue());
        post(LIST, shop(null)).body("data.products.bought", contains(false));
    }

    @Test
    void categoryCanBeSetAndCleared() {
        String id = addProduct("tomato");
        update(id, Map.of("categoryId", categoryId("Légumes")))
                .body("data.updateProduct.category.name", is("Légumes"))
                .body("data.updateProduct.classification", is("CLASSIFIED"));
        update(id, Map.of("categoryId", ""))
                .body("data.updateProduct.category", nullValue())
                .body("data.updateProduct.classification", is("UNCLASSIFIED"));
    }

    @Test
    void shopCanBeSetAndCleared() {
        String lidl = addShop("Lidl");
        String parmesan = addProduct("parmesan");
        addProduct("apple");
        update(parmesan, Map.of("shopId", lidl)).body("data.updateProduct.shop.name", is("Lidl"));
        post(LIST, shop(null)).body("data.products.find { it.name == 'parmesan' }.shop.name", is("Lidl"))
                .body("data.products.find { it.name == 'apple' }.shop", nullValue());
        update(parmesan, Map.of("shopId", "")).body("data.updateProduct.shop", nullValue());
        post(LIST, shop(null)).body("data.products.find { it.name == 'parmesan' }.shop", nullValue());
    }

    @Test
    void unknownShopKeepsPreviousShop() {
        String parmesan = addProduct("parmesan");
        setShop(parmesan, addShop("Lidl"));
        update(parmesan, Map.of("shopId", UUID.randomUUID().toString())).body("errors[0].message", is("shop not found"));
        post(LIST, shop(null)).body("data.products[0].shop.name", is("Lidl"));
    }

    @Test
    void severalFieldsAtOnce() {
        String lidl = addShop("Lidl");
        String parmesan = addProduct("parmesan");
        update(parmesan, Map.of("bought", true, "shopId", lidl))
                .body("errors", nullValue())
                .body("data.updateProduct.bought", is(true))
                .body("data.updateProduct.shop.name", is("Lidl"));
    }

    @Test
    void emptyInputChangesNothing() {
        String lidl = addShop("Lidl");
        String apple = addProduct("apple");
        update(apple, Map.of("categoryId", categoryId("Fruits"), "shopId", lidl, "bought", true, "quantity", 2));
        update(apple, Map.of())
                .body("errors", nullValue())
                .body("data.updateProduct.name", is("apple"))
                .body("data.updateProduct.quantity", is(2))
                .body("data.updateProduct.bought", is(true))
                .body("data.updateProduct.category.name", is("Fruits"))
                .body("data.updateProduct.shop.name", is("Lidl"));
    }

    @Test
    void oneInvalidFieldChangesNothing() {
        String apple = addProduct("apple");
        update(apple, Map.of("bought", true, "name", "pomme", "quantity", 5, "shopId", UUID.randomUUID().toString()))
                .body("errors[0].message", is("shop not found"));
        post(LIST, shop(null)).body("data.products[0].name", is("apple")).body("data.products[0].bought", is(false))
                .body("data.products[0].quantity", is(1));
    }

    @Test
    void unknownIdsAreRejected() {
        String unknown = UUID.randomUUID().toString();
        update(unknown, Map.of("bought", true)).body("errors[0].message", is("product not found"));
        update(unknown, Map.of("categoryId", categoryId("Fruits"))).body("errors[0].message", is("product not found"));
        String apple = addProduct("apple");
        update(apple, Map.of("categoryId", unknown)).body("errors[0].message", is("category not found"));
        update(apple, Map.of("categoryId", "not-a-uuid")).body("errors[0].message", is("category not found"));
        update(unknown, Map.of("shopId", addShop("Lidl"))).body("errors[0].message", is("product not found"));
        post(DELETE, Map.of("id", unknown)).body("errors[0].message", is("product not found"));
    }

    @Test
    void oldMutationsAreGone() {
        String id = addProduct("apple");
        post("mutation($id: String!) { setProductBought(id: $id, bought: true) { id } }", Map.of("id", id))
                .body("errors[0].message", containsString("setProductBought"));
        post("mutation($id: String!) { setProductCategory(id: $id, categoryId: null) { id } }", Map.of("id", id))
                .body("errors[0].message", containsString("setProductCategory"));
        post("mutation($id: String!) { setProductShop(id: $id, shopId: null) { id } }", Map.of("id", id))
                .body("errors[0].message", containsString("setProductShop"));
    }

    @Test
    void renameKeepsCategoryShopAndClassification() {
        String coop = addShop("Coop");
        String id = addProduct("tomatoe");
        setCategory(id, "Légumes");
        setShop(id, coop);
        update(id, Map.of("name", " tomato "))
                .body("errors", nullValue())
                .body("data.updateProduct.name", is("tomato"));
        post(LIST, shop(null))
                .body("data.products[0].name", is("tomato"))
                .body("data.products[0].category.name", is("Légumes"))
                .body("data.products[0].classification", is("CLASSIFIED"))
                .body("data.products[0].shop.name", is("Coop"));
    }

    @Test
    void renameMayChangeOnlyTheCase() {
        String id = addProduct("apple");
        update(id, Map.of("name", "Apple")).body("errors", nullValue()).body("data.updateProduct.name", is("Apple"));
    }

    @Test
    void nullNameKeepsTheName() {
        String id = addProduct("apple");
        Map<String, Object> input = new HashMap<>();
        input.put("name", null);
        update(id, input).body("errors", nullValue()).body("data.updateProduct.name", is("apple"));
    }

    @Test
    void blankRenameIsRejected() {
        String id = addProduct("apple");
        update(id, Map.of("name", "  ")).body("errors[0].message", is("name must not be blank"));
        post(LIST, shop(null)).body("data.products[0].name", is("apple"));
    }

    @Test
    void renameToTakenNameIsRejected() {
        addProduct("apple");
        String aple = addProduct("aple");
        update(aple, Map.of("name", "APPLE")).body("errors[0].message", is("product name already exists"));
        post(LIST, shop(null)).body("data.products.name", contains("aple", "apple"));
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
