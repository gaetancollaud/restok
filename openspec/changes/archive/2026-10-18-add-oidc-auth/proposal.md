# Proposal

## Why

Anyone who can reach Restok can read and change the shopping list. The app needs a login, and the backend needs to know who is calling so that private shopping lists can be added later. Users already have accounts in a Keycloak instance, so Restok should use OpenID Connect against it, not its own user store.

## What Changes

- **BREAKING**: `/graphql` requires a valid OIDC bearer token. Requests without one get HTTP 401.
- The backend validates tokens against one OIDC provider, set by a single setting: the realm URL (`QUARKUS_OIDC_AUTH_SERVER_URL`). The client id defaults to `restok`.
- A new public endpoint, `GET /auth-config`, returns `{issuer, clientId}`. The SPA reads it at startup, so the provider is configured once, on the backend, and never baked into the frontend build.
- The SPA logs the user in before it renders: authorization code flow with PKCE, a public client, no client secret. It sends the access token on every `/graphql` call and refreshes it in the background.
- A new GraphQL query `me` returns the caller's name from the token (`preferred_username` with Keycloak).
- Data stays shared: every logged-in user sees and edits the same shops, categories and products. The username reaches the backend but nothing is filtered by it yet.
- Out of scope: per-user data, roles or authorization rules, a logout button and a "logged in as" display, offline login.

## Capabilities

### New Capabilities
- `user-auth`: OIDC login in the SPA, bearer-token protection of the API, provider discovery via `/auth-config`, and the caller identity (`me`).

### Modified Capabilities
- `graphql-api`: `/graphql` now requires authentication, and `/auth-config` is a second non-GraphQL endpoint besides health.

## Impact

- Backend: new dependency `quarkus-oidc` (test: `quarkus-test-oidc-server`). `application.yaml` gains the OIDC client id, an `authenticated` permission on `/graphql`, and Keycloak Dev Services off. New `auth/Auth.java` (the `me` query and the `/auth-config` route).
- Frontend: new dependency `angular-oauth2-oidc` (v22, for Angular 22). New `auth/auth.ts` app initializer. `app.config.ts` registers the OAuth client and its HTTP interceptor.
- Tests: a WireMock OIDC provider runs for all tests, including the packaged-app ITs. The `GraphQL` test helper sends a token for user `alice`.
- Configuration: `QUARKUS_OIDC_AUTH_SERVER_URL` is required in every environment, dev included (via `.env`). Documented in the README, `.env.example`, `docker-compose.yml` and the k8s example overlay.
- Keycloak: a public client `restok` with standard flow, PKCE S256, and the app URL in both Valid redirect URIs and Web origins.
- Dev tooling: the dev-mode GraphQL explorer can no longer call `/graphql`, because it sends no token.
