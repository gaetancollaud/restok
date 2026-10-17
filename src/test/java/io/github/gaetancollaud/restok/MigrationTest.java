package io.github.gaetancollaud.restok;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
class MigrationTest {

    @Inject
    Flyway flyway;

    @Test
    void v1AppliedExactlyOnce() {
        long v1 = Arrays.stream(flyway.info().applied())
                .filter(m -> m.getVersion() != null && "1".equals(m.getVersion().getVersion()))
                .count();
        assertEquals(1, v1);
    }

    @Test
    void readinessIsUp() {
        given().get("/q/health/ready").then().statusCode(200).body("status", is("UP"))
                .body("checks.name", hasItem(containsString("Reactive PostgreSQL")));
    }
}
