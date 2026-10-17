package io.github.gaetancollaud.restok;

import io.agroal.api.AgroalDataSource;

import java.sql.SQLException;
import java.util.List;
import java.util.stream.Collectors;

/** Test helper: reset the database between tests, keeping the seeded default categories. */
public final class TestDb {

    public static final List<String> DEFAULT_CATEGORIES = List.of(
            "Fruits", "Légumes", "Pain", "Fromage", "Produits laitiers", "Viande", "Poisson", "Boissons", "Surgelés", "Ménage");

    private TestDb() {
    }

    public static void reset(AgroalDataSource ds) throws SQLException {
        String defaults = DEFAULT_CATEGORIES.stream().map(n -> "'" + n + "'").collect(Collectors.joining(","));
        try (var c = ds.getConnection(); var s = c.createStatement()) {
            s.execute("delete from product");
            s.execute("delete from shop");
            s.execute("delete from product_category where name not in (" + defaults + ")");
        }
    }
}
