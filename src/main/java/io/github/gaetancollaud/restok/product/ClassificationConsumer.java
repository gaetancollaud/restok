package io.github.gaetancollaud.restok.product;

import io.github.gaetancollaud.restok.ai.ProductClassifier;
import io.github.gaetancollaud.restok.category.ProductCategory;
import io.github.gaetancollaud.restok.category.ProductCategoryRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.vertx.ConsumeEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static io.github.gaetancollaud.restok.product.ProductClassification.CLASSIFIED;
import static io.github.gaetancollaud.restok.product.ProductClassification.PENDING;
import static io.github.gaetancollaud.restok.product.ProductClassification.UNCLASSIFIED;

/**
 * Picks a category for a newly added product with the AI, in the background.
 * Results only apply while the product is still PENDING, so a category set by hand always wins.
 */
@ApplicationScoped
public class ClassificationConsumer {

    /** Event bus address; the message is the product id as a String. */
    public static final String ADDRESS = "product.classify";

    private static final Logger LOG = Logger.getLogger(ClassificationConsumer.class);

    private record Request(String productName, List<ProductCategory> categories) {
    }

    @Inject
    ProductClassifier classifier;

    @Inject
    ProductRepository products;

    @Inject
    ProductCategoryRepository categories;

    // ponytail: in-process only; a product whose replica dies mid-classification stays PENDING until set by hand.
    // Upgrade path: re-send events for products PENDING longer than the AI timeout, at startup or on a schedule.
    @ConsumeEvent(value = ADDRESS, blocking = true)
    public void classify(String productId) {
        UUID id = UUID.fromString(productId);
        try {
            // Two short transactions around the slow AI call, so no DB connection is held while waiting for it
            Request request = QuarkusTransaction.requiringNew().call(() -> load(id));
            if (request != null) {
                ProductCategory match = ask(request);
                QuarkusTransaction.requiringNew().run(() -> save(id, match));
            }
        } catch (RuntimeException e) {
            LOG.errorf(e, "Classification of product %s failed", id);
        }
    }

    /** Null when the product is gone or no longer pending. */
    private Request load(UUID id) {
        Product product = products.findById(id);
        return product == null || product.classification != PENDING
                ? null
                : new Request(product.name, categories.listByName());
    }

    /** The matching category, or null when the answer matches none or the AI call fails. */
    private ProductCategory ask(Request request) {
        String names = request.categories().stream().map(c -> c.name).collect(Collectors.joining("\n"));
        try {
            String answer = classifier.classify(request.productName(), names).strip();
            return request.categories().stream().filter(c -> c.name.equalsIgnoreCase(answer)).findFirst().orElse(null);
        } catch (RuntimeException e) {
            LOG.warnf("AI classification of '%s' failed: %s", request.productName(), e.toString());
            return null;
        }
    }

    private void save(UUID id, ProductCategory match) {
        if (match == null) {
            products.update("classification = ?1 where id = ?2 and classification = ?3", UNCLASSIFIED, id, PENDING);
        } else {
            products.update("category = ?1, classification = ?2 where id = ?3 and classification = ?4",
                    match, CLASSIFIED, id, PENDING);
        }
    }
}
