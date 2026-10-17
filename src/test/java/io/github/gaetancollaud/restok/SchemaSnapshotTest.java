package io.github.gaetancollaud.restok;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Keeps the frontend's copy of the generated GraphQL schema in sync.
 * On change it rewrites the snapshot and fails, so the diff must be committed.
 */
@QuarkusTest
class SchemaSnapshotTest {

    static final Path SNAPSHOT = Path.of("src/main/webui/schema.graphql");

    @Test
    void snapshotIsUpToDate() throws IOException {
        String schema = given().get("/graphql/schema.graphql").then().statusCode(200).extract().asString();
        String previous = Files.exists(SNAPSHOT) ? Files.readString(SNAPSHOT) : "";
        if (!schema.equals(previous)) {
            Files.createDirectories(SNAPSHOT.getParent());
            Files.writeString(SNAPSHOT, schema);
            fail("GraphQL schema changed: " + SNAPSHOT + " was updated, commit it and re-run the build");
        }
    }
}
