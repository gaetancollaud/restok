package io.github.gaetancollaud.restok;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.logging.Handler;
import java.util.logging.LogRecord;
import java.util.logging.Logger;
import java.util.stream.IntStream;

import static io.github.gaetancollaud.restok.GraphQL.post;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Exercises every GraphQL operation concurrently and fails if Vert.x reports a blocked I/O thread.
 * Blocking calls on an I/O thread already throw in Quarkus, so the other tests catch those.
 */
@QuarkusTest
class NonBlockingTest {

    final List<String> blocked = new CopyOnWriteArrayList<>();
    final Handler handler = new Handler() {
        @Override
        public void publish(LogRecord r) {
            String msg = r.getMessage();
            if (msg != null && msg.contains("has been blocked for")) {
                blocked.add(msg);
            }
        }

        @Override
        public void flush() {
        }

        @Override
        public void close() {
        }
    };

    @BeforeEach
    void listen() {
        Logger.getLogger("").addHandler(handler);
    }

    @AfterEach
    void stop() {
        Logger.getLogger("").removeHandler(handler);
    }

    @Test
    void graphQLOperationsDoNotBlockIoThreads() {
        IntStream.range(0, 50).parallel().forEach(i -> {
            post("mutation($n: String!) { addItem(name: $n) { id } }", Map.of("n", "item-" + i));
            post("{ items { id name } }");
        });
        assertEquals(List.of(), blocked);
    }
}
