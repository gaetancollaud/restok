package io.github.gaetancollaud.restok;

import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class MigrationTest {

    @Inject
    Flyway flyway;

    @Inject
    AgroalDataSource ds;

    @Test
    void v1AppliedExactlyOnce() {
        long v1 = Arrays.stream(flyway.info().applied())
                .filter(m -> m.getVersion() != null && "1".equals(m.getVersion().getVersion()))
                .count();
        assertEquals(1, v1);
    }

    @Test
    void defaultCategoriesAreSeeded() throws SQLException {
        List<String> names = new ArrayList<>();
        try (var c = ds.getConnection(); var rs = c.createStatement().executeQuery("select name from product_category")) {
            while (rs.next()) {
                names.add(rs.getString(1));
            }
        }
        assertTrue(names.containsAll(TestDb.DEFAULT_CATEGORIES), "missing defaults in " + names);
    }

    @Test
    void readinessIsUp() {
        given().get("/q/health/ready").then().statusCode(200).body("status", is("UP"))
                .body("checks.name", hasItem(containsString("Database connections")));
    }
}
