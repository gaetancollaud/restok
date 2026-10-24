# user-auth Specification

## Purpose

Lets only people with an account at the configured OpenID Connect provider use Restok, and tells the backend who each caller is, so per-user data can be added later.

## Requirements

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
On startup the SPA SHALL read `/auth-config` and, without a valid token, redirect to the provider's login using the authorization code flow with PKCE as a public client (no secret). After login it SHALL return to the app and render it. It SHALL NOT render without a token. A stored token that is still valid, or that can be renewed with a stored refresh token, SHALL count as a valid token: the SPA SHALL render without a redirect.

#### Scenario: First visit
- **WHEN** a user without a session opens the app
- **THEN** the browser is redirected to the provider's login page

#### Scenario: Return from login
- **WHEN** the provider redirects back to the app with an authorization code
- **THEN** the SPA exchanges it for tokens, removes the code from the URL, and shows the shopping list

#### Scenario: Stored access token still valid
- **WHEN** the app is reopened while the stored access token has not expired
- **THEN** the shopping list is shown without a redirect to the provider

#### Scenario: Stored access token expired
- **WHEN** the app is reopened after the access token expired and a refresh token is stored
- **THEN** the SPA renews the tokens and shows the shopping list without a redirect to the provider

#### Scenario: Refresh rejected
- **WHEN** the app is reopened and the provider rejects the stored refresh token (expired, revoked, or session ended)
- **THEN** the SPA removes the stored tokens and redirects to the provider's login page

### Requirement: Login kept across restarts
The SPA SHALL request the `offline_access` scope at login and SHALL store its tokens in persistent browser storage, so a login survives closing the tab, the browser or the installed app, independently of the provider's browser session cookie. The login SHALL last until the provider ends the offline session (idle or maximum lifetime, or revocation).

#### Scenario: Reopen the installed app
- **WHEN** a user logs in, closes the installed app, and opens it again the next day
- **THEN** the shopping list is shown without a login page

#### Scenario: Provider cookie gone
- **WHEN** the provider's session cookie has been cleared but the stored offline refresh token is still valid
- **THEN** the app opens without a login page

#### Scenario: Offline scope requested
- **WHEN** the SPA redirects to the provider's login
- **THEN** the authorization request's `scope` includes `offline_access`

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

### Requirement: Profile link
The menu's user entry SHALL show the logged-in user's name, taken from the provider's username claim (`preferred_username`), and SHALL open the provider's account page (`<issuer>/account`) in a new browser tab.

#### Scenario: Open the profile
- **WHEN** user `alice` taps "alice" in the menu
- **THEN** a new tab opens on `<issuer>/account`

### Requirement: Logout
Logout SHALL revoke the stored refresh and access tokens at the provider, so the offline session ends, remove them from browser storage, end the provider's browser session, and return to the app, which then requires a new login. If revocation fails, the SPA SHALL still remove the tokens and end the provider session.

#### Scenario: Log out
- **WHEN** a logged-in user taps Logout
- **THEN** the browser goes through the provider's logout and back to the app, which redirects to the provider's login page

#### Scenario: No silent login after logout
- **WHEN** a user has logged out and reopens the app
- **THEN** the provider's login page is shown, not the shopping list

#### Scenario: Revocation unreachable
- **WHEN** the user taps Logout and the provider's revocation request fails
- **THEN** the stored tokens are still removed and the provider's logout still runs
