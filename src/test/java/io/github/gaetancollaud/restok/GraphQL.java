package io.github.gaetancollaud.restok;

import io.quarkus.test.oidc.server.OidcWiremockTestResource;
import io.restassured.response.ValidatableResponse;

import java.util.Map;
import java.util.Set;

import static io.restassured.RestAssured.given;

/** Test helper: POST a GraphQL operation to /graphql as user "alice". */
public final class GraphQL {

    public static final String TOKEN = OidcWiremockTestResource.getAccessToken("alice", Set.of("user"));

    private GraphQL() {
    }

    public static ValidatableResponse post(String query, Map<String, Object> variables) {
        return given().auth().oauth2(TOKEN).contentType("application/json")
                .body(Map.of("query", query, "variables", variables))
                .post("/graphql")
                .then().statusCode(200);
    }

    public static ValidatableResponse post(String query) {
        return post(query, Map.of());
    }
}
