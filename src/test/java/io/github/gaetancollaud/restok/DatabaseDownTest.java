package io.github.gaetancollaud.restok;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

/** Points the datasources at a closed port: readiness must be DOWN, liveness still UP. */
@QuarkusTest
@TestProfile(DatabaseDownTest.NoDatabase.class)
class DatabaseDownTest {

    public static class NoDatabase implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "quarkus.datasource.devservices.enabled", "false",
                    "quarkus.datasource.jdbc.url", "jdbc:postgresql://localhost:1/none",
                    "quarkus.datasource.username", "none",
                    "quarkus.datasource.password", "none",
                    "quarkus.flyway.migrate-at-start", "false",
                    "quarkus.hibernate-orm.schema-management.strategy", "none");
        }
    }

    @Test
    void readinessDownLivenessUp() {
        given().get("/q/health/ready").then().statusCode(503).body("status", is("DOWN"));
        given().get("/q/health/live").then().statusCode(200).body("status", is("UP"));
    }
}
