package io.github.gaetancollaud.restok;

import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.oidc.server.OidcWiremockTestResource;

import java.util.HashMap;
import java.util.Map;

/** Mock OIDC provider for every test, including the packaged-app ITs; tokens via {@link GraphQL#TOKEN}. */
@QuarkusTestResource(OidcMock.class)
public class OidcMock extends OidcWiremockTestResource {

    @Override
    public Map<String, String> start() {
        Map<String, String> config = new HashMap<>(super.start());
        config.put("quarkus.oidc.auth-server-url", config.get("keycloak.url") + "/realms/quarkus/");
        return config;
    }
}
