package io.github.gaetancollaud.restok.ai;

import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;
import io.smallrye.mutiny.Multi;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Chat completions through OpenRouter. Returning {@link Multi} makes the call streaming and non-blocking;
 * collect with {@code .collect().with(Collectors.joining())} when the full answer is needed.
 * No chat memory: every call is independent, so replicas stay stateless.
 */
@ApplicationScoped
@RegisterAiService(chatMemoryProviderSupplier = RegisterAiService.NoChatMemoryProviderSupplier.class)
public interface AiChat {

    Multi<String> chat(@UserMessage String prompt);
}
