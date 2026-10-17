package io.github.gaetancollaud.restok.ai;

import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.junit.QuarkusTest;
import io.vertx.core.Vertx;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.matchingJsonPath;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@QuarkusTest
@ConnectWireMock
class AiChatTest {

    static final String PATH = "/v1/chat/completions";
    static final String SSE = """
            data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"test/model","choices":[{"index":0,"delta":{"role":"assistant","content":"Hel"},"finish_reason":null}]}

            data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"test/model","choices":[{"index":0,"delta":{"content":"lo"},"finish_reason":"stop"}]}

            data: [DONE]

            """;

    WireMock wiremock;

    @Inject
    AiChat aiChat;

    @Inject
    Vertx vertx;

    @BeforeEach
    void reset() {
        wiremock.resetToDefaultMappings();
    }

    void stubStream() {
        wiremock.register(post(urlEqualTo(PATH)).willReturn(aResponse()
                .withHeader("Content-Type", "text/event-stream")
                .withBody(SSE)));
    }

    @Test
    void streamsChunksInOrderWithConfiguredModelAndKey() {
        stubStream();
        List<String> chunks = aiChat.chat("hi").collect().asList().await().atMost(Duration.ofSeconds(5));
        assertEquals(List.of("Hel", "lo"), chunks);
        wiremock.verifyThat(postRequestedFor(urlEqualTo(PATH))
                .withHeader("Authorization", equalTo("Bearer sk-or-test-0123456789abcdefghijklmnopqrstuvwxyz"))
                .withRequestBody(matchingJsonPath("$.model", equalTo("test/model")))
                .withRequestBody(matchingJsonPath("$.messages[0].content", equalTo("hi"))));
    }

    @Test
    void worksFromAnIoThread() throws Exception {
        stubStream();
        CompletableFuture<String> answer = new CompletableFuture<>();
        vertx.runOnContext(v -> aiChat.chat("hi").collect().with(java.util.stream.Collectors.joining())
                .subscribe().with(answer::complete, answer::completeExceptionally));
        assertEquals("Hello", answer.get(5, TimeUnit.SECONDS));
    }

    @Test
    void upstreamErrorFailsTheStream() {
        wiremock.register(post(urlEqualTo(PATH)).willReturn(aResponse().withStatus(503)));
        assertThrows(Exception.class, () -> aiChat.chat("hi").collect().asList().await().atMost(Duration.ofSeconds(5)));
        given().get("/q/health/ready").then().statusCode(200).body("status", is("UP"));
    }

    @Test
    void timeoutFailsTheStream() {
        wiremock.register(post(urlEqualTo(PATH)).willReturn(aResponse()
                .withHeader("Content-Type", "text/event-stream").withBody(SSE).withFixedDelay(4000)));
        assertThrows(Exception.class, () -> aiChat.chat("hi").collect().asList().await().atMost(Duration.ofSeconds(10)));
        given().get("/q/health/ready").then().statusCode(200).body("status", is("UP"));
    }
}
