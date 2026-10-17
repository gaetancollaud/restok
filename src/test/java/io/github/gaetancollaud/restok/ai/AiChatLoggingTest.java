package io.github.gaetancollaud.restok.ai;

import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.logging.Handler;
import java.util.logging.LogRecord;
import java.util.logging.Logger;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Even with request/response logging switched on, the OpenRouter API key must never be logged. */
@QuarkusTest
@ConnectWireMock
@TestProfile(AiChatLoggingTest.LoggingOn.class)
class AiChatLoggingTest {

    public static class LoggingOn implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("quarkus.langchain4j.openai.log-requests", "true",
                    "quarkus.langchain4j.openai.log-responses", "true");
        }
    }

    static final String KEY = "sk-or-test-0123456789abcdefghijklmnopqrstuvwxyz";

    WireMock wiremock;

    @Inject
    AiChat aiChat;

    @Test
    void apiKeyIsNotLogged() {
        wiremock.register(post(urlEqualTo("/v1/chat/completions")).willReturn(aResponse()
                .withHeader("Content-Type", "text/event-stream").withBody(AiChatTest.SSE)));
        List<String> logged = new CopyOnWriteArrayList<>();
        Handler handler = new Handler() {
            @Override
            public void publish(LogRecord r) {
                // the WireMock stub server logs what it receives; only the app's own logging matters here
                if (r.getLoggerName() == null || !r.getLoggerName().startsWith("io.quarkiverse.wiremock")) {
                    logged.add(String.valueOf(r.getMessage()) + " " + java.util.Arrays.toString(r.getParameters()));
                }
            }

            @Override
            public void flush() {
            }

            @Override
            public void close() {
            }
        };
        Logger.getLogger("").addHandler(handler);
        try {
            aiChat.chat("hi").collect().asList().await().atMost(Duration.ofSeconds(5));
        } finally {
            Logger.getLogger("").removeHandler(handler);
        }
        assertTrue(logged.stream().anyMatch(l -> l.contains("chat/completions")), "request logging should be active");
        assertFalse(logged.stream().anyMatch(l -> l.contains(KEY)), "API key leaked into logs");
    }
}
