package io.github.gaetancollaud.restok.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/** The date-dependent parts of the chains' answers, at fixed dates. */
class ChainParsersTest {

    static final LocalDate TODAY = LocalDate.of(2026, 10, 18);

    static JsonNode fixture(String name) throws IOException {
        try (InputStream in = ChainParsersTest.class.getResourceAsStream("/catalog/" + name)) {
            return new ObjectMapper().readTree(in);
        }
    }

    @Test
    void migrosSaleWhileItsRangeIncludesToday() throws IOException {
        JsonNode salad = fixture("migros-cards.json").path(1);
        ChainProduct product = MigrosClient.parse(salad, TODAY);
        assertEquals(new ChainProduct.Sale("Hit", 2.95, LocalDate.of(2026, 10, 21)), product.sale());
        assertEquals(2.95, product.price());
        assertNull(MigrosClient.parse(salad, LocalDate.of(2026, 10, 22)).sale());
        assertNull(MigrosClient.parse(salad, LocalDate.of(2026, 10, 14)).sale());
    }

    @Test
    void migrosWithoutPromotionIsNotOnSale() throws IOException {
        ChainProduct milk = MigrosClient.parse(fixture("migros-cards.json").path(0), TODAY);
        assertNull(milk.sale());
        assertEquals("1l", milk.quantity());
        assertEquals("https://www.migros.ch/fr/product/204003200000", milk.url());
    }

    @Test
    void lidlSaleEndsOnTheBadgesLastDay() throws IOException {
        ChainProduct potatoes = LidlClient.parse(fixture("lidl-campaign.json").path("products").path(0), TODAY);
        assertEquals(new ChainProduct.Sale("-23%", 2.19, LocalDate.of(2026, 10, 21)), potatoes.sale());
        assertEquals(2.85, potatoes.price());
        assertNull(potatoes.quantity());
    }

    @Test
    void lidlEndDateAcrossNewYear() throws IOException {
        JsonNode badges = new ObjectMapper().readTree("[{\"type\":\"AvailableInStoreFrom\",\"title\":\"28.12. - 03.01.\"}]");
        assertEquals(LocalDate.of(2027, 1, 3), LidlClient.endDate(badges, LocalDate.of(2026, 12, 30)));
        assertEquals(LocalDate.of(2027, 1, 3), LidlClient.endDate(badges, LocalDate.of(2027, 1, 2)));
    }

    @Test
    void lidlWithoutOldPriceIsNotOnSale() throws IOException {
        ChainProduct apples = LidlClient.parse(fixture("lidl-campaign.json").path("products").path(1), TODAY);
        assertNull(apples.sale());
        assertEquals(3.49, apples.price());
        assertEquals("1 kg", apples.quantity());
    }

    @Test
    void foldIgnoresCaseAndAccents() {
        assertEquals("creme brulee", LidlClient.fold("Crème Brûlée"));
    }
}
