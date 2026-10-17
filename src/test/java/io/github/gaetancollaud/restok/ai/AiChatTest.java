package io.github.gaetancollaud.restok.ai;

import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
public class AiChatTest {

    static final String PATH = "/v1/chat/completions";

    /** An OpenAI-compatible chat completion response answering {@code content}. */
    public static String completion(String content) {
        return """
                {"id":"1","object":"chat.completion","created":1,"model":"test/model",\
                "choices":[{"index":0,"message":{"role":"assistant","content":"%s"},"finish_reason":"stop"}],\
                "usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}""".formatted(content);
    }

    WireMock wiremock;

    @Inject
    AiChat aiChat;

    @BeforeEach
    void reset() {
        wiremock.resetToDefaultMappings();
    }

    void stubAnswer() {
        wiremock.register(post(urlEqualTo(PATH)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody(completion("Hello"))));
    }

    @Test
    void returnsTheAnswerWithConfiguredModelAndKey() {
        stubAnswer();
        assertEquals("Hello", aiChat.chat("hi"));
        wiremock.verifyThat(postRequestedFor(urlEqualTo(PATH))
                .withHeader("Authorization", equalTo("Bearer sk-or-test-0123456789abcdefghijklmnopqrstuvwxyz"))
                .withRequestBody(matchingJsonPath("$.model", equalTo("test/model")))
                .withRequestBody(matchingJsonPath("$.messages[0].content", equalTo("hi"))));
    }

    @Test
    void upstreamErrorThrows() {
        wiremock.register(post(urlEqualTo(PATH)).willReturn(aResponse().withStatus(503)));
        assertThrows(Exception.class, () -> aiChat.chat("hi"));
        given().get("/q/health/ready").then().statusCode(200).body("status", is("UP"));
    }

    @Test
    void timeoutThrows() {
        wiremock.register(post(urlEqualTo(PATH)).willReturn(aResponse()
                .withHeader("Content-Type", "application/json").withBody(completion("Hello")).withFixedDelay(4000)));
        assertThrows(Exception.class, () -> aiChat.chat("hi"));
        given().get("/q/health/ready").then().statusCode(200).body("status", is("UP"));
    }
}
