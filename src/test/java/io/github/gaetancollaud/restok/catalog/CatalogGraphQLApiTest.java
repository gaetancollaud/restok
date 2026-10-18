package io.github.gaetancollaud.restok.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.stubbing.Scenario;
import io.agroal.api.AgroalDataSource;
import io.github.gaetancollaud.restok.TestDb;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.anyRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.anyUrl;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.matchingJsonPath;
import static com.github.tomakehurst.wiremock.client.WireMock.ok;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static io.github.gaetancollaud.restok.GraphQL.post;
import static io.github.gaetancollaud.restok.product.ProductGraphQLApiTest.addProduct;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
@ConnectWireMock
public class CatalogGraphQLApiTest {

    static final String GUEST = "/authentication/public/v1/api/guest";
    static final String MIGROS_SEARCH = "/onesearch-oc-seaapi/public/v5/search";
    static final String MIGROS_CARDS = "/product-display/public/v4/product-cards";
    static final String COOP_SEARCH = "/rest/v2/coopathome/products/search/lait";
    static final String COOP_PRODUCT = "/rest/v2/coopathome/products/3542161";

    static final String PRODUCT = "{ chain code name description quantity price url sale { label price endDate } }";
    static final String SEARCH = "query($chain: Chain!, $q: String!) { chainSearch(chain: $chain, query: $q) " + PRODUCT + " }";
    static final String LINKS = "{ products { name links { chain code product " + PRODUCT + " } } }";
    static final String LINK = "mutation($id: String!, $chain: Chain!, $code: String) "
            + "{ setProductLink(id: $id, chain: $chain, code: $code) { id } }";

    WireMock wiremock;

    @Inject
    Catalog catalog;

    @Inject
    AgroalDataSource ds;

    static String fixture(String name) throws IOException {
        try (InputStream in = CatalogGraphQLApiTest.class.getResourceAsStream("/catalog/" + name)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /** Every chain answers from the fixtures. */
    @BeforeEach
    void stubChains() throws IOException, SQLException {
        TestDb.reset(ds);
        catalog.clear();
        wiremock.resetToDefaultMappings();
        wiremock.resetRequests();
        wiremock.register(get(urlEqualTo(GUEST)).willReturn(ok().withHeader("leshopch", "guest-token")));
        wiremock.register(WireMock.post(urlEqualTo(MIGROS_SEARCH)).willReturn(
                okJson("{\"productIds\":[100006357,100068039,1,2,3,4,5,6,7,8,9,10]}")));
        wiremock.register(WireMock.post(urlEqualTo(MIGROS_CARDS)).willReturn(okJson(fixture("migros-cards.json"))));
        String coop = fixture("coop-search.json");
        wiremock.register(get(urlPathEqualTo(COOP_SEARCH)).willReturn(okJson(coop)));
        wiremock.register(get(urlPathEqualTo(COOP_PRODUCT)).willReturn(
                okJson(new ObjectMapper().readTree(coop).path("products").path(1).toString())));
        wiremock.register(get(urlPathEqualTo("/v3/product-search")).willReturn(okJson(fixture("aldi-search.json"))));
        wiremock.register(get(urlPathEqualTo("/v2/products/000000000000319612"))
                .willReturn(okJson(fixture("aldi-product.json"))));
        wiremock.register(get(urlEqualTo("/api/v1/CH/campaignGroups")).willReturn(okJson(fixture("lidl-groups.json"))));
        wiremock.register(get(urlEqualTo("/api/v1/CH/campaigns/10104656"))
                .willReturn(okJson(fixture("lidl-campaign.json"))));
    }

    static Map<String, Object> search(String chain, String q) {
        return Map.of("chain", chain, "q", q);
    }

    static void link(String id, String chain, String code) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("id", id);
        vars.put("chain", chain);
        vars.put("code", code);
        post(LINK, vars).body("errors", nullValue());
    }

    @Test
    void searchMigrosAsksForTenCards() {
        post(SEARCH, search("MIGROS", " lait "))
                .body("errors", nullValue())
                .body("data.chainSearch.name", contains("Lait entier", "Kopfsalat"))
                .body("data.chainSearch[0].code", is("100006357"))
                .body("data.chainSearch[0].price", is(1.9f))
                .body("data.chainSearch[0].quantity", is("1l"))
                .body("data.chainSearch[0].url", is("https://www.migros.ch/fr/product/204003200000"));
        wiremock.verifyThat(postRequestedFor(urlEqualTo(MIGROS_SEARCH))
                .withHeader("leshopch", equalTo("guest-token"))
                .withRequestBody(matchingJsonPath("$.query", equalTo("lait"))));
        wiremock.verifyThat(postRequestedFor(urlEqualTo(MIGROS_CARDS))
                .withRequestBody(matchingJsonPath("$.productFilter.uids.length()", equalTo("10"))));
    }

    @Test
    void searchCoopWithSale() {
        post(SEARCH, search("COOP", "lait"))
                .body("errors", nullValue())
                .body("data.chainSearch.name", contains(
                        "Free From Lait écrémé UHT 1.5% gras sans lactose", "Naturaplan Bio Tomates cerises Datterino"))
                .body("data.chainSearch[0].quantity", is("1 l"))
                .body("data.chainSearch[0].description", nullValue())
                .body("data.chainSearch[0].sale", nullValue())
                .body("data.chainSearch[1].price", is(3.8f))
                .body("data.chainSearch[1].sale.label", is("22%"))
                .body("data.chainSearch[1].sale.price", is(2.95f))
                .body("data.chainSearch[1].sale.endDate", nullValue());
    }

    @Test
    void searchAldiWithSale() {
        post(SEARCH, search("ALDI", "lait"))
                .body("errors", nullValue())
                .body("data.chainSearch[0].name", is("Lait entier, pasteurisé"))
                .body("data.chainSearch[0].price", is(1.89f))
                .body("data.chainSearch[0].url",
                        is("https://www.aldi-suisse.ch/fr/p.lait-entier-pasteurise.000000000000319612.html"))
                .body("data.chainSearch[1].price", is(3.79f))
                .body("data.chainSearch[1].sale.label", is("Sale"))
                .body("data.chainSearch[1].sale.price", is(3.59f));
        wiremock.verifyThat(getRequestedFor(urlPathEqualTo("/v3/product-search"))
                .withQueryParam("q", equalTo("lait"))
                .withHeader("Origin", equalTo("https://www.aldi-suisse.ch")));
    }

    @Test
    void searchLidlLeafletIgnoringCase() {
        post(SEARCH, search("LIDL", "pommes"))
                .body("errors", nullValue())
                .body("data.chainSearch.name", contains("Pommes de terre à chair ferme suisses bio", "Pommes Gala"))
                .body("data.chainSearch[0].sale.label", is("-23%"))
                .body("data.chainSearch[0].sale.endDate", notNullValue());
        post(SEARCH, search("LIDL", "lait")).body("data.chainSearch", empty());
    }

    @Test
    void blankQueryCallsNoChain() {
        post(SEARCH, search("COOP", "  ")).body("errors[0].message", is("query must not be blank"));
        wiremock.verifyThat(0, anyRequestedFor(anyUrl()));
    }

    @Test
    void migrosTokenIsRefreshedOnceWhenRejected() throws IOException {
        wiremock.register(WireMock.post(urlEqualTo(MIGROS_CARDS)).inScenario("expired")
                .whenScenarioStateIs(Scenario.STARTED).willSetStateTo("refreshed")
                .willReturn(aResponse().withStatus(401)));
        wiremock.register(WireMock.post(urlEqualTo(MIGROS_CARDS)).inScenario("expired")
                .whenScenarioStateIs("refreshed").willReturn(okJson(fixture("migros-cards.json"))));
        post(SEARCH, search("MIGROS", "lait")).body("errors", nullValue()).body("data.chainSearch[0].name", is("Lait entier"));
        wiremock.verifyThat(2, postRequestedFor(urlEqualTo(MIGROS_CARDS)));
        wiremock.verifyThat(getRequestedFor(urlEqualTo(GUEST)));
    }

    @Test
    void failingChainSearchIsUnavailable() {
        wiremock.register(WireMock.post(urlEqualTo(MIGROS_SEARCH)).willReturn(aResponse().withStatus(503)));
        post(SEARCH, search("MIGROS", "lait")).body("errors[0].message", is("Migros is unavailable"));
    }

    @Test
    void linksAreResolvedInChainOrderAndCached() {
        String id = addProduct("lait");
        addProduct("pomme");
        link(id, "COOP", "3542161");
        link(id, "MIGROS", "100006357");
        for (int i = 0; i < 2; i++) {
            post(LINKS)
                    .body("errors", nullValue())
                    .body("data.products.name", contains("lait", "pomme"))
                    .body("data.products[0].links.chain", contains("MIGROS", "COOP"))
                    .body("data.products[0].links[0].product.name", is("Lait entier"))
                    .body("data.products[0].links[1].product.sale.label", is("22%"))
                    .body("data.products[1].links", empty());
        }
        wiremock.verifyThat(1, postRequestedFor(urlEqualTo(MIGROS_CARDS)));
        wiremock.verifyThat(1, getRequestedFor(urlPathEqualTo(COOP_PRODUCT)));
    }

    @Test
    void oneCardsCallForAllLinkedMigrosProducts() {
        link(addProduct("lait"), "MIGROS", "100006357");
        link(addProduct("salade"), "MIGROS", "100068039");
        post(LINKS).body("errors", nullValue())
                .body("data.products[0].links[0].product.name", is("Lait entier"))
                .body("data.products[1].links[0].product.name", is("Kopfsalat"));
        wiremock.verifyThat(1, postRequestedFor(urlEqualTo(MIGROS_CARDS)));
    }

    @Test
    void failingChainKeepsItsLinksAndOtherChains() throws IOException {
        wiremock.register(WireMock.post(urlEqualTo(MIGROS_CARDS)).willReturn(aResponse().withStatus(500)));
        String id = addProduct("lait");
        link(id, "MIGROS", "100006357");
        link(id, "ALDI", "000000000000319612");
        post(LINKS)
                .body("errors", nullValue())
                .body("data.products[0].links.code", contains("100006357", "000000000000319612"))
                .body("data.products[0].links[0].product", nullValue())
                .body("data.products[0].links[1].product.description", is("Lait entier BIO, min. 3.9% de matières grasses"));
        // Not cached: Migros is asked again once it is back
        wiremock.register(WireMock.post(urlEqualTo(MIGROS_CARDS)).willReturn(okJson(fixture("migros-cards.json"))));
        post(LINKS).body("data.products[0].links[0].product.name", is("Lait entier"));
    }

    @Test
    void lidlCodeOutOfTheLeafletHasNoProduct() {
        link(addProduct("chips"), "LIDL", "999_1");
        post(LINKS).body("errors", nullValue())
                .body("data.products[0].links[0].code", is("999_1"))
                .body("data.products[0].links[0].product", nullValue());
    }

    @Test
    void relinkReplacesAndNullUnlinks() {
        String id = addProduct("lait");
        link(id, "COOP", "4446520");
        link(id, "MIGROS", "100006357");
        link(id, "COOP", "3542161");
        link(id, "MIGROS", null);
        post("{ products { links { chain code } } }")
                .body("data.products[0].links.chain", contains("COOP"))
                .body("data.products[0].links[0].code", is("3542161"));
    }

    @Test
    void linkingAnUnknownProductFails() {
        Map<String, Object> vars = new HashMap<>();
        vars.put("id", "00000000-0000-0000-0000-000000000000");
        vars.put("chain", "COOP");
        vars.put("code", "4446520");
        post(LINK, vars).body("errors[0].message", is("product not found"));
    }
}
