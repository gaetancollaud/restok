## MODIFIED Requirements

### Requirement: Login before the app renders
On startup the SPA SHALL read `/auth-config` and, without a valid token, redirect to the provider's login using the authorization code flow with PKCE as a public client (no secret). After login it SHALL return to the app on the path the user first opened and render it. It SHALL NOT render without a token. The provider's redirect URI SHALL stay the app's root URL.

#### Scenario: First visit
- **WHEN** a user without a session opens the app
- **THEN** the browser is redirected to the provider's login page

#### Scenario: Return from login
- **WHEN** the provider redirects back to the app with an authorization code
- **THEN** the SPA exchanges it for tokens, removes the code from the URL, and shows the shopping list

#### Scenario: Deep link through login
- **WHEN** a user without a session opens `/shop/{id}` and logs in
- **THEN** the app opens on `/shop/{id}` with the Shops panel on that shop
