package io.github.gaetancollaud.restok;

import io.quarkus.test.junit.QuarkusIntegrationTest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.github.gaetancollaud.restok.GraphQL.post;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

/** Runs against the packaged artifact (the native executable with -Dnative). */
@QuarkusIntegrationTest
class NativeIT {

    @Test
    void addAndListItems() {
        post("mutation($name: String!) { addItem(name: $name) { id name } }", Map.of("name", " native "))
                .body("errors", nullValue())
                .body("data.addItem.name", is("native"));
        post("{ items { name } }").body("data.items.name", hasItem("native"));
        post("mutation { addItem(name: \" \") { id } }").body("errors[0].message", is("name must not be blank"));
    }

    @Test
    void servesSpaWithRouteFallback() {
        given().get("/").then().statusCode(200).body(containsString("<app-root"));
        given().get("/items").then().statusCode(200).body(containsString("<app-root"));
    }

    @Test
    void healthAndNoExplorerInProd() {
        given().get("/q/health/ready").then().statusCode(200).body("status", is("UP"));
        given().get("/q/health/live").then().statusCode(200);
        given().get("/q/graphql-ui/").then().statusCode(404);
    }
}
