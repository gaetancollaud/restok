# Tasks

Implementation landed before this proposal was written. Checked items were verified in that session. Unchecked items are the remaining work.

## 1. Backend token validation

- [x] 1.1 Add `quarkus-oidc` and test-scoped `quarkus-test-oidc-server` to `pom.xml`; verify `./mvnw -q dependency:resolve` succeeds
- [x] 1.2 In `application.yaml`, set `quarkus.oidc.client-id: restok`, disable `quarkus.keycloak.devservices`, and add an `authenticated` permission on path `/graphql`; verify `AuthTest.graphqlRequiresToken` gets 401 without a token
- [x] 1.3 Add the global test resource `OidcMock` (a WireMock provider that sets `quarkus.oidc.auth-server-url`) and send `OidcWiremockTestResource.getAccessToken("alice", …)` from the `GraphQL` test helper; verify the existing API tests pass unchanged (`./mvnw test`)
- [ ] 1.4 Verify the "provider not configured" scenario: start the packaged JVM jar without `QUARKUS_OIDC_AUTH_SERVER_URL` and check startup fails with an error naming `quarkus.oidc.auth-server-url`

## 2. Auth configuration endpoint and identity

- [x] 2.1 Add `auth/Auth.java` with the `GET /auth-config` route (`{issuer, clientId}` from `quarkus.oidc.*`) and the `me: String!` query; verify `AuthTest.authConfigIsPublic` and `AuthTest.meIsTheTokenUser` pass
- [x] 2.2 Commit the regenerated `src/main/webui/schema.graphql` (adds `me`); verify `SchemaSnapshotTest` passes on rerun
- [x] 2.3 In dev mode, verify Quinoa doesn't shadow the route: `curl localhost:8080/auth-config` returns the JSON and `curl localhost:8080/` returns `<app-root`
- [ ] 2.4 Add a test that a product added with `alice`'s token is listed with `bob`'s token (the "shared data" scenario); verify it passes

## 3. SPA login

- [x] 3.1 Add `angular-oauth2-oidc@^22.0.2` to `src/main/webui`; verify `npm ls angular-oauth2-oidc` resolves
- [x] 3.2 Add `auth/auth.ts` (`login` initializer: fetch `/auth-config`, configure code flow + PKCE, strip the issuer's trailing `/`, automatic silent refresh, `loadDiscoveryDocumentAndLogin`, never resolve while redirecting) and register `provideOAuthClient({ resourceServer: { allowedUrls: ['/graphql'], sendAccessToken: true } })`, `withInterceptorsFromDi()` and `provideAppInitializer(login)` in `app.config.ts`; verify `npx ng build` succeeds and `npx ng test --watch=false` passes

## 4. Configuration and docs

- [x] 4.1 Document `QUARKUS_OIDC_AUTH_SERVER_URL` and `QUARKUS_OIDC_CLIENT_ID` in the README configuration table, `.env.example`, `docker-compose.yml` (required) and `deploy/overlays/example/kustomization.yaml`; verify `docker compose config` fails with "set it in .env" when the variable is unset
- [ ] 4.2 Add the Keycloak client settings to the README (public client, standard flow, PKCE S256, app URL in Valid redirect URIs and Web origins); verify a reader can create the client from them alone

## Workflow follow-up

- Archive the change once the open tasks are done, so `openspec/specs/user-auth/spec.md` becomes the main spec.
