package io.github.gaetancollaud.restok.catalog;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.zip.GZIPInputStream;

/** JSON over HTTP for the chain clients. Headers are name/value pairs. */
@ApplicationScoped
public class ChainHttp {

    static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Inject
    ObjectMapper json;

    /** A non-2xx answer. */
    public static class StatusException extends RuntimeException {
        public final int status;

        StatusException(int status, URI uri) {
            super("HTTP " + status + " from " + uri);
            this.status = status;
        }
    }

    public JsonNode get(String url, String... headers) {
        return read(send(HttpRequest.newBuilder(URI.create(url)).GET(), headers));
    }

    public JsonNode post(String url, Object body, String... headers) {
        try {
            HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
            return read(send(request, headers));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException(e);
        }
    }

    /**
     * The raw answer, for headers; throws StatusException when not 2xx. Asks for gzip: Aldi's Akamai rejects requests
     * without an Accept-Encoding, and the JDK client can't decode Brotli.
     */
    public HttpResponse<byte[]> send(HttpRequest.Builder request, String... headers) {
        request.timeout(TIMEOUT).header("Accept", "application/json").header("Accept-Encoding", "gzip");
        for (int i = 0; i < headers.length; i += 2) {
            request.header(headers[i], headers[i + 1]);
        }
        HttpRequest built = request.build();
        try {
            HttpResponse<byte[]> response = client.send(built, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() / 100 != 2) {
                throw new StatusException(response.statusCode(), built.uri());
            }
            return response;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    public static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20");
    }

    /** Text of a JSON field, or null when missing, null or blank. */
    public static String text(JsonNode node) {
        String s = node.isValueNode() ? node.asText().strip() : "";
        return s.isEmpty() || node.isNull() ? null : s;
    }

    private JsonNode read(HttpResponse<byte[]> response) {
        try {
            boolean gzip = response.headers().firstValue("Content-Encoding").filter("gzip"::equalsIgnoreCase).isPresent();
            return json.readTree(gzip ? new GZIPInputStream(new ByteArrayInputStream(response.body())).readAllBytes()
                    : response.body());
        } catch (IOException e) {
            throw new IllegalStateException("not JSON from " + response.uri(), e);
        }
    }
}
