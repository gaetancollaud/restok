package io.github.gaetancollaud.restok.catalog;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** All chains behind one cache: answers are reused for TTL, failures are not cached. */
@ApplicationScoped
public class Catalog {

    static final Duration TTL = Duration.ofHours(1);

    public record Key(Chain chain, String code) {
    }

    private record Entry(ChainProduct product, Instant fetched) {
    }

    private final Map<Chain, ChainClient> clients = new EnumMap<>(Chain.class);
    // ponytail: unbounded, but only linked and searched products land here (hundreds); quarkus-cache if it grows
    private final Map<Key, Entry> cache = new ConcurrentHashMap<>();

    Catalog(Instance<ChainClient> all) {
        all.forEach(c -> clients.put(c.chain(), c));
    }

    /** Throws when the chain can't be reached or answers an error. */
    public List<ChainProduct> search(Chain chain, String query) {
        List<ChainProduct> found = clients.get(chain).search(query);
        Instant now = Instant.now();
        found.forEach(p -> cache.put(new Key(chain, p.code()), new Entry(p, now)));
        return found;
    }

    /**
     * The products found, one batch per chain for those not cached. Codes a chain doesn't know, and all codes of a
     * chain that fails, are missing; the failure is only logged.
     */
    // ponytail: chains are called one after the other; run them in parallel if a list waits on a slow one
    public Map<Key, ChainProduct> products(Collection<Key> keys) {
        Map<Key, ChainProduct> found = new HashMap<>();
        Map<Chain, List<String>> missing = new EnumMap<>(Chain.class);
        Instant now = Instant.now();
        for (Key key : new LinkedHashSet<>(keys)) {
            Entry entry = cache.get(key);
            if (entry != null && entry.fetched.plus(TTL).isAfter(now)) {
                found.put(key, entry.product);
            } else {
                missing.computeIfAbsent(key.chain, c -> new ArrayList<>()).add(key.code);
            }
        }
        missing.forEach((chain, codes) -> {
            try {
                for (ChainProduct p : clients.get(chain).products(codes)) {
                    Key key = new Key(chain, p.code());
                    cache.put(key, new Entry(p, now));
                    found.put(key, p);
                }
            } catch (RuntimeException e) {
                Log.warnf("%s is unavailable: %s", chain.label, e.toString());
            }
        });
        return found;
    }

    /** For tests: forget every answer. */
    void clear() {
        cache.clear();
    }
}
