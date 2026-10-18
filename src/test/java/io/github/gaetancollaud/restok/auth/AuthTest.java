package io.github.gaetancollaud.restok.auth;

import io.github.gaetancollaud.restok.GraphQL;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.is;

@QuarkusTest
class AuthTest {

    @Test
    void graphqlRequiresToken() {
        given().contentType("application/json").body(Map.of("query", "{ me }"))
                .post("/graphql").then().statusCode(401);
    }

    @Test
    void meIsTheTokenUser() {
        GraphQL.post("{ me }").body("data.me", is("alice"));
    }

    @Test
    void authConfigIsPublic() {
        given().get("/auth-config").then().statusCode(200)
                .body("issuer", endsWith("/realms/quarkus/"))
                .body("clientId", is("restok"));
    }
}
