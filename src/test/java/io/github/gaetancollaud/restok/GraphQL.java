package io.github.gaetancollaud.restok;

import io.restassured.response.ValidatableResponse;

import java.util.Map;

import static io.restassured.RestAssured.given;

/** Test helper: POST a GraphQL operation to /graphql. */
public final class GraphQL {

    private GraphQL() {
    }

    public static ValidatableResponse post(String query, Map<String, Object> variables) {
        return given().contentType("application/json")
                .body(Map.of("query", query, "variables", variables))
                .post("/graphql")
                .then().statusCode(200);
    }

    public static ValidatableResponse post(String query) {
        return post(query, Map.of());
    }
}
