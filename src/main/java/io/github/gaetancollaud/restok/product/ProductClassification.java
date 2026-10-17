package io.github.gaetancollaud.restok.product;

public enum ProductClassification {
    /** Waiting for the AI to pick a category. */
    PENDING,
    /** Has a category, chosen by the AI or by hand. */
    CLASSIFIED,
    /** No category: none matched, the AI failed, or it was cleared by hand. */
    UNCLASSIFIED
}
