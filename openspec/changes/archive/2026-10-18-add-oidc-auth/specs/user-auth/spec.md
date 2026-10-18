# Spec Delta

## Purpose

Lets only people with an account at the configured OpenID Connect provider use Restok, and tells the backend who each caller is, so per-user data can be added later.

## ADDED Requirements

### Requirement: One provider setting
The OIDC provider SHALL be configured once, on the backend, by its issuer (realm) URL. The client id SHALL default to `restok` and be overridable. The frontend build SHALL NOT contain any provider URL or client id.

#### Scenario: Change the provider
- **WHEN** the backend is restarted with a different issuer URL and the same frontend build
- **THEN** the SPA logs users in against the new provider

#### Scenario: Provider not configured
- **WHEN** the backend starts in production without an issuer URL
- **THEN** startup fails with an error naming the missing setting

### Requirement: Public auth configuration endpoint
The backend SHALL serve `GET /auth-config` without authentication, returning JSON `{"issuer": <issuer URL>, "clientId": <client id>}` with the values the backend validates tokens against. The SPA route fallback SHALL NOT shadow it.

#### Scenario: Read the configuration
- **WHEN** an unauthenticated client requests `GET /auth-config`
- **THEN** the response is 200 with JSON containing `issuer` and `clientId`

### Requirement: Login before the app renders
On startup the SPA SHALL read `/auth-config` and, without a valid token, redirect to the provider's login using the authorization code flow with PKCE as a public client (no secret). After login it SHALL return to the app and render it. It SHALL NOT render without a token.

#### Scenario: First visit
- **WHEN** a user without a session opens the app
- **THEN** the browser is redirected to the provider's login page

#### Scenario: Return from login
- **WHEN** the provider redirects back to the app with an authorization code
- **THEN** the SPA exchanges it for tokens, removes the code from the URL, and shows the shopping list

### Requirement: Token sent and kept fresh
The SPA SHALL send the access token as `Authorization: Bearer <token>` on every request to `/graphql` and SHALL renew it before it expires while the app is open, without user interaction.

#### Scenario: Long session
- **WHEN** the app stays open past the access token's lifetime
- **THEN** later `/graphql` calls still succeed without a new login

### Requirement: Caller identity
The backend SHALL derive the caller's name from the validated token (the provider's username claim, e.g. `preferred_username`) and expose it as the GraphQL query `me: String!`.

#### Scenario: Who am I
- **WHEN** user `alice` sends `{ me }` with a valid token
- **THEN** the response data is `{"me": "alice"}`

### Requirement: Shared data for all users
Every authenticated user SHALL see and change the same shops, categories and products. The caller's identity SHALL NOT filter or restrict any data.

#### Scenario: Two users
- **WHEN** user `alice` adds a product and user `bob` then lists products
- **THEN** `bob` sees the product added by `alice`
