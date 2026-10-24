# Proposal

## Why

The SPA keeps its tokens in `sessionStorage` (the `angular-oauth2-oidc` default), so closing the tab or the installed app drops them and the next start redirects to the provider's login. Keycloak's "remember me" only stretches the provider's SSO cookie, which installed PWAs and mobile browsers often lose, so users log in again and again. An installed Restok should open like a mobile app: log in once, stay logged in.

## What Changes

- The SPA asks for the `offline_access` scope, so the provider issues an offline refresh token that outlives the browser and SSO session (Keycloak's "Offline Session Idle", 30 days by default, renewed on each use).
- Tokens are stored in `localStorage` instead of `sessionStorage`, so they survive closing the tab or the app.
- On startup, the SPA renders at once when the stored access token is still valid; when it has expired but a refresh token is stored, it refreshes first and renders without a redirect. It redirects to the provider's login only when no refresh token is stored or the refresh is rejected, and then drops the stale tokens.
- Provider setup: the `restok` client must allow the `offline_access` scope (Keycloak's default: optional client scope plus the `offline_access` realm role in the default roles). Documented in the README.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `user-auth`: "Login before the app renders" now reuses stored tokens across app restarts and only redirects when they can't be renewed; a new requirement "Login kept across restarts" covers the offline token and its storage.

## Impact

- Frontend: `src/main/webui/src/app/auth/auth.ts` (scope, startup refresh, fallback to login), `app.config.ts` (`OAuthStorage` provider backed by `localStorage`), new `auth.spec.ts`.
- Backend: none. Quarkus validates the access token only; offline tokens are refresh tokens and never reach `/graphql`.
- Provider: the client needs `offline_access`; Keycloak allows it by default. README gets one line on it.
- Security: a long-lived refresh token sits in `localStorage`, readable by any script running on the origin (XSS). Accepted for this app; see design.
