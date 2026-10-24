## MODIFIED Requirements

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

## ADDED Requirements

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
