package io.github.gaetancollaud.restok.catalog;

/** A supermarket chain whose products a list product can be linked to. Declaration order is the display order. */
public enum Chain {
    MIGROS("Migros"),
    COOP("Coop"),
    ALDI("Aldi"),
    LIDL("Lidl");

    public final String label;

    Chain(String label) {
        this.label = label;
    }
}
