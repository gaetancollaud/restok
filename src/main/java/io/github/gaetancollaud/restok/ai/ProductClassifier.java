package io.github.gaetancollaud.restok.ai;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Picks the grocery category of a product, in French. Blocking, like {@link AiChat}.
 */
@ApplicationScoped
@RegisterAiService(chatMemoryProviderSupplier = RegisterAiService.NoChatMemoryProviderSupplier.class)
public interface ProductClassifier {

    /**
     * @param product    product name, e.g. "pomme"
     * @param categories one category name per line
     * @return the category name exactly as listed, or AUCUNE when none fits
     */
    @SystemMessage("""
            Tu classes des produits d'épicerie dans exactement une de ces catégories :
            {categories}
            Réponds uniquement par le nom de la catégorie, tel qu'il figure dans la liste, ou par AUCUNE si aucune ne convient.""")
    @UserMessage("Produit : {product}")
    String classify(String product, String categories);
}
