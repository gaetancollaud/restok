# Design

## Context

- `auth/auth.ts#login` is the app initializer: it configures `OAuthService` from `/auth-config`, calls `setupAutomaticSilentRefresh()` (refresh-token based, since `responseType: 'code'`), then `loadDiscoveryDocumentAndLogin()`, which redirects to the provider whenever the access or id token in storage is not valid.
- No `OAuthStorage` is provided, so `angular-oauth2-oidc` uses `sessionStorage`: tokens die with the tab or installed app window.
- Scope today: `openid profile email`. Keycloak issues a normal refresh token tied to the SSO session; "remember me" only extends that session's cookie.
- No logout exists in the app. The backend only validates access tokens on `/graphql`.
- Frontend tests run with Vitest via `ng test`.

## Goals / Non-Goals

**Goals:** survive app restarts for as long as the provider keeps the offline session; never show the login page when a stored token can be renewed.

**Non-Goals:** a logout button; opening the app with no network (the initializer already needs `/auth-config`); moving tokens out of JS reach (BFF / httpOnly cookie); changing provider lifetimes from the app.

## Decisions

- **`offline_access` scope.** Append it to `scope`. Keycloak then issues an offline refresh token, bound to an offline session instead of the SSO cookie. Alternative: keep the normal refresh token in `localStorage`, rejected because it dies with the SSO session (hours by default, or "remember me" lifetime), which is the bug being fixed.
- **`localStorage` via `OAuthStorage`.** In `app.config.ts`: `{ provide: OAuthStorage, useFactory: () => localStorage }`, the library's documented hook. PKCE verifier and nonce move there too, which is harmless. Alternative: IndexedDB, rejected as more code for the same exposure.
- **Startup: try login, then refresh, then redirect.** Replace `loadDiscoveryDocumentAndLogin()` with:
  1. `await oauth.loadDiscoveryDocumentAndTryLogin()` (handles the `?code=` return).
  2. `oauth.hasValidAccessToken()` → render.
  3. else if `oauth.getRefreshToken()` → `await oauth.refreshToken()`; success → render.
  4. else, or on refresh failure → `oauth.logOut(true)` (clears storage, no redirect to the provider) then `oauth.initCodeFlow()` and never resolve.
  Only the access token is checked: refresh responses may not refresh the id token's validity, and the app never uses the id token for API calls.
- **Any refresh failure means "log in again".** No split between network errors and `invalid_grant`. A transient failure costs one extra login, and the redirect needs the network anyway. `ponytail:` comment marks it.
- **Keep `setupAutomaticSilentRefresh()`.** It keeps the access token fresh while the app is open and stores the rotated refresh token through the same `OAuthStorage`.

## Risks / Trade-offs

- [Long-lived refresh token in `localStorage` is readable by any script on the origin (XSS)] → same-origin SPA with no third-party scripts and Angular's template sanitizing; the user can revoke the offline session in Keycloak's account console ("Applications"). Acceptable for a household grocery app.
- [Provider doesn't allow `offline_access`] → Keycloak rejects the scope at login with `invalid_scope`. README states the requirement; Keycloak's defaults satisfy it.
- [Two tabs refresh at once with Keycloak "Revoke Refresh Token" on] → one tab gets `invalid_grant` and redirects to login. Default is off; noted in README.
- [Offline session idle timeout (30 days default)] → a user who doesn't open the app for that long logs in again; tune "Offline Session Idle" in the realm if needed.

## Migration Plan

Ship as usual. Existing sessions in `sessionStorage` are not read; each user logs in once more and is then kept logged in. Rollback: redeploy the previous build; tokens left in `localStorage` are ignored.
