package io.github.gaetancollaud.restok.ai;

import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Chat completions through OpenRouter. Blocking: returns the full answer, so call it from a worker thread.
 * No chat memory: every call is independent, so replicas stay stateless.
 */
@ApplicationScoped
@RegisterAiService(chatMemoryProviderSupplier = RegisterAiService.NoChatMemoryProviderSupplier.class)
public interface AiChat {

    String chat(@UserMessage String prompt);
}
