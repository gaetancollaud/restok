# Tasks

## 1. Persistent token storage

- [ ] 1.1 In `src/main/webui/src/app/app.config.ts`, provide `{ provide: OAuthStorage, useFactory: () => localStorage }` next to `provideOAuthClient`. Verify `npm run build` in `src/main/webui` passes and, in `./mvnw quarkus:dev` (JDK 25), after login DevTools → Application shows `access_token` and `refresh_token` under Local Storage and nothing under Session Storage.

## 2. Offline scope and startup refresh

- [x] 2.1 In `src/main/webui/src/app/auth/auth.ts`, add `offline_access` to `scope` and replace `loadDiscoveryDocumentAndLogin()` with: `loadDiscoveryDocumentAndTryLogin()`; render if `hasValidAccessToken()`; else if `getRefreshToken()`, `await refreshToken()` and render; otherwise or on failure, `logOut(true)` then `initCodeFlow()` and return a never-resolving promise (`ponytail:` comment: any refresh failure means log in again). Update the doc comment.
- [x] 2.2 Add `src/main/webui/src/app/auth/auth.spec.ts` (Vitest, `OAuthService` mocked, `fetch` stubbed for `/auth-config`) covering the spec scenarios: valid stored token resolves without `initCodeFlow`; expired token + refresh token calls `refreshToken` and resolves; refresh rejects → `logOut(true)` and `initCodeFlow` called, promise pending; no refresh token → `initCodeFlow`; configured `scope` contains `offline_access`. Verify `npm test` in `src/main/webui` passes.
- [x] 2.3 In `README.md`, extend the `QUARKUS_OIDC_CLIENT_ID` row: the client must allow the `offline_access` scope (Keycloak default), login lasts for the realm's "Offline Session Idle"/"Offline Session Max", and "Revoke Refresh Token" should stay off. Verify the table still renders (one row, pipes intact).

## 3. Integration check

- [x] 3.1 Run `./mvnw quarkus:dev` (JDK 25) against the Keycloak realm: log in, close the tab, reopen → no login page. Delete the Keycloak cookies for the provider domain, reopen → no login page. In Local Storage, set `expires_at` to a past timestamp, reload → no login page and a token request shows in the Network tab. In Keycloak's account console revoke Restok's offline access, expire the token the same way, reload → login page.
