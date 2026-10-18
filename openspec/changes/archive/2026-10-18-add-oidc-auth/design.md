# Design

## Context

The backend is Quarkus, with GraphQL at `/graphql` as the only API. Quinoa serves the Angular SPA from the same origin, and an Angular service worker caches the app shell (PWA). The OIDC provider is an existing Keycloak instance. See proposal.md for motivation and specs/ for the required behavior.

## Goals / Non-Goals

**Goals:**
- One setting (the issuer URL) drives both backend validation and frontend login.
- Standard OIDC only, nothing Keycloak-specific, so the provider can change.
- Tests run without a real provider.

**Non-Goals:**
- Server-side sessions or cookies.
- Authorization rules beyond "authenticated".
- Making login work offline.

## Decisions

### Bearer tokens checked by the backend, login done by the SPA
The backend runs `quarkus-oidc` as a service application: it validates JWT access tokens against the provider's JWKS and never redirects. The SPA runs the authorization code flow with PKCE itself.
- Alternative: Quarkus `web-app` mode (server-side code flow with a session cookie). The frontend would need no OIDC code, but an expired session turns a GraphQL `fetch` into a cross-origin redirect it can't follow, and the cached PWA shell would need special handling. Rejected.

### Protect `/graphql` by path, not by annotation
A single `authenticated` HTTP permission on the exact path `/graphql` in `application.yaml`. `/graphql/schema.graphql` (the codegen snapshot), `/auth-config`, health and SPA assets stay public.
- Alternative: `@Authenticated` on each `@GraphQLApi` class. A new API class could easily be left unprotected. Rejected.

### Provider handoff through `/auth-config`
A Vert.x route registered by observing `Router` returns `{issuer, clientId}`, read from the same `quarkus.oidc.*` config the token validation uses, so the two can't drift. No new dependency: the route reuses `quarkus-vertx-http`, and the JSON is built with `JsonObject` so the native image needs no reflection.
- Alternatives: a REST endpoint (adds a `quarkus-rest` dependency), a GraphQL query (`/graphql` is protected, and splitting public and protected queries needs annotations), or build-time injection into `index.html` (breaks "one build, any provider"). Rejected.
- The SPA strips a trailing `/` from the issuer, because the library compares it to the token's `iss` claim exactly and Keycloak writes it without the slash.

### `angular-oauth2-oidc` in the frontend
Version 22 matches Angular 22 and ships `provideOAuthClient`, a DI interceptor scoped to `allowedUrls: ['/graphql']`, refresh-token renewal, and PKCE.
- Alternatives: `oidc-client-ts` (framework-agnostic, so the interceptor and initializer glue would be ours to write), `keycloak-js` (provider-specific). Hand-rolling PKCE is security code. All rejected.
- An app initializer (`provideAppInitializer`) blocks rendering until a token is present. While the browser redirects to the provider, it returns a promise that never resolves, so no unauthenticated GraphQL call fires.
- Tokens stay in the library's default `sessionStorage`.

### Identity
The `me` query returns `SecurityIdentity.getPrincipal().getName()`. Quarkus resolves it from `upn`, then `preferred_username`, then `sub`. No user table yet: private lists will key on this name or `sub` when they arrive.

### Tests with a mock provider
`quarkus-test-oidc-server` provides a WireMock OIDC provider and signed test tokens. A subclass sets `quarkus.oidc.auth-server-url` from its URL and is registered as a global `@QuarkusTestResource`, so it also serves `@QuarkusIntegrationTest` (`NativeIT`), where a `%test` config profile wouldn't apply. The shared `GraphQL` test helper sends a token for user `alice`, so the existing API tests didn't change.
- Alternative: Keycloak Dev Services. It starts a slow container, and its default client is confidential, which the SPA flow can't use. Disabled globally, so a missing URL fails loudly instead of quietly starting a container.

## Risks / Trade-offs

- [The provider is unreachable at backend startup or at SPA load] → The app is unusable, as it already is without the backend. The SPA can't start offline from the cached shell. Accepted (offline use was already out of scope for the PWA).
- [The refresh token expires (Keycloak SSO idle timeout) while the app sits open] → `/graphql` calls get 401 until reload. Reload re-runs the redirect, which is silent while the Keycloak session is alive. Possible later improvement: on 401, call `initLoginFlow`.
- [`sessionStorage` is cleared when the PWA closes] → Each launch bounces through Keycloak, without a prompt while the SSO session lives. Switching to `localStorage` would persist the refresh token, at more XSS exposure.
- [Missing Web origins on the Keycloak client] → The browser blocks the token request (CORS, Keycloak answers 403). Documented in the README configuration table.
- [The dev-mode GraphQL explorer gets 401] → Accepted. Use the app or curl with a token.

## Migration Plan

1. In Keycloak, create the public client `restok`: standard flow, PKCE S256, the app URL in Valid redirect URIs (`<url>/*`) and Web origins.
2. Set `QUARKUS_OIDC_AUTH_SERVER_URL` in each environment (the k8s ConfigMap overlay, `.env` for compose and dev).
3. Deploy. Users are redirected to log in on their next load. No data migration.

Rollback: redeploy the previous image. The extra env var is ignored.
