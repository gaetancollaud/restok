package io.github.gaetancollaud.restok.product;

import com.github.tomakehurst.wiremock.client.WireMock;
import io.agroal.api.AgroalDataSource;
import io.github.gaetancollaud.restok.TestDb;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static io.github.gaetancollaud.restok.ai.AiChatTest.completion;
import static io.github.gaetancollaud.restok.GraphQL.post;
import static io.github.gaetancollaud.restok.product.ProductGraphQLApiTest.addProduct;
import static io.github.gaetancollaud.restok.product.ProductGraphQLApiTest.setCategory;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@QuarkusTest
@ConnectWireMock
class ProductClassifierTest {

    static final String PATH = "/v1/chat/completions";

    WireMock wiremock;

    @Inject
    AgroalDataSource ds;

    @BeforeEach
    void reset() throws SQLException {
        TestDb.reset(ds);
        wiremock.resetToDefaultMappings();
    }

    void stubAnswer(String answer, int delayMs) {
        wiremock.register(WireMock.post(urlEqualTo(PATH)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json").withBody(completion(answer)).withFixedDelay(delayMs)));
    }

    /** Polls until the product leaves PENDING (5 s deadline) and returns it. */
    static Map<String, Object> awaitClassified(String id) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 5000;
        while (true) {
            Map<String, Object> product = post("{ products { id classification category { name } } }")
                    .extract().path("data.products.find { it.id == '" + id + "' }");
            if (!"PENDING".equals(product.get("classification")) || System.currentTimeMillis() > deadline) {
                return product;
            }
            Thread.sleep(100);
        }
    }

    @SuppressWarnings("unchecked")
    static String categoryName(Map<String, Object> product) {
        Map<String, Object> category = (Map<String, Object>) product.get("category");
        return category == null ? null : (String) category.get("name");
    }

    @Test
    void matchingAnswerSetsCategory() throws InterruptedException {
        stubAnswer(" fruits ", 0);
        Map<String, Object> apple = awaitClassified(addProduct("apple"));
        assertEquals("CLASSIFIED", apple.get("classification"));
        assertEquals("Fruits", categoryName(apple));
        wiremock.verifyThat(postRequestedFor(urlEqualTo(PATH))
                .withRequestBody(containing("Produit : apple"))
                .withRequestBody(containing("Ménage")));
    }

    @Test
    void unknownAnswerLeavesUncategorized() throws InterruptedException {
        stubAnswer("Electronics", 0);
        Map<String, Object> batteries = awaitClassified(addProduct("batteries"));
        assertEquals("UNCLASSIFIED", batteries.get("classification"));
        assertNull(categoryName(batteries));
    }

    @Test
    void upstreamErrorLeavesUncategorized() throws InterruptedException {
        wiremock.register(WireMock.post(urlEqualTo(PATH)).willReturn(aResponse().withStatus(503)));
        Map<String, Object> product = awaitClassified(addProduct("apple"));
        assertEquals("UNCLASSIFIED", product.get("classification"));
        assertNull(categoryName(product));
        given().get("/q/health/ready").then().statusCode(200).body("status", is("UP"));
    }

    @Test
    void manualChoiceWinsOverLateAnswer() throws InterruptedException {
        stubAnswer("fruits", 1000);
        String id = addProduct("apple");
        setCategory(id, "Légumes");
        Thread.sleep(2000); // let the delayed AI answer arrive and be applied (or not)
        Map<String, Object> apple = awaitClassified(id);
        assertEquals("CLASSIFIED", apple.get("classification"));
        assertEquals("Légumes", categoryName(apple));
        wiremock.verifyThat(postRequestedFor(urlEqualTo(PATH)).withRequestBody(containing("Produit : apple")));
    }
}
