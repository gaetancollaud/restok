package io.github.gaetancollaud.restok.auth;

import io.quarkus.security.identity.SecurityIdentity;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.NonNull;
import org.eclipse.microprofile.graphql.Query;

/**
 * OIDC glue. /graphql requires a bearer token (see application.yaml); the SPA learns where to get one
 * from the public /auth-config route, so the provider is configured once, on the backend.
 */
@GraphQLApi
public class Auth {

    @Inject
    SecurityIdentity identity;

    @ConfigProperty(name = "quarkus.oidc.auth-server-url")
    String issuer;

    @ConfigProperty(name = "quarkus.oidc.client-id")
    String clientId;

    /** The caller's name from the token (preferred_username with Keycloak). */
    @Query
    public @NonNull String me() {
        return identity.getPrincipal().getName();
    }

    void authConfig(@Observes Router router) {
        JsonObject config = new JsonObject().put("issuer", issuer).put("clientId", clientId);
        router.get("/auth-config").handler(rc -> rc.json(config));
    }
}
