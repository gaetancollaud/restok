package io.github.gaetancollaud.restok;

import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.ok;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.client.WireMock.urlMatching;
import static org.junit.jupiter.api.Assertions.fail;

/** Uses the WireMock stub as an OTLP/HTTP collector and checks HTTP server metrics arrive. */
@QuarkusTest
@ConnectWireMock
@TestProfile(OtelMetricsTest.OtelOn.class)
class OtelMetricsTest {

    public static class OtelOn implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "quarkus.otel.sdk.disabled", "false",
                    "quarkus.otel.exporter.otlp.protocol", "http/protobuf",
                    "quarkus.otel.exporter.otlp.endpoint", "http://localhost:${quarkus.wiremock.devservices.port}",
                    "quarkus.otel.metric.export.interval", "1s");
        }
    }

    WireMock wiremock;

    @Test
    void httpServerMetricsAreExported() throws InterruptedException {
        wiremock.register(post(urlMatching("/v1/.*")).willReturn(ok()));
        GraphQL.post("{ items { id } }");
        var exported = postRequestedFor(urlEqualTo("/v1/metrics")).withRequestBody(containing("http.server.request.duration"));
        for (int i = 0; i < 20; i++) {
            if (!wiremock.find(exported).isEmpty()) {
                return;
            }
            Thread.sleep(500);
        }
        fail("no http.server.request.duration metric exported; requests seen: "
                + wiremock.find(postRequestedFor(urlMatching(".*"))).stream().map(r -> r.getUrl()).toList());
    }
}
