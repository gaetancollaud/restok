package io.github.gaetancollaud.restok.catalog;

import java.util.Collection;
import java.util.List;

/** One chain's product API. Methods throw when the chain can't be reached or answers an error. */
public interface ChainClient {

    int MAX_RESULTS = 10;

    Chain chain();

    /** Up to MAX_RESULTS products matching the query, in the chain's order. */
    List<ChainProduct> search(String query);

    /** The products with these codes; codes the chain doesn't know are left out. */
    List<ChainProduct> products(Collection<String> codes);
}
