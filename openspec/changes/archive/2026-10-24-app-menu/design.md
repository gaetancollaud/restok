# Design

## Context

- `Grocery` owns `panel = signal<'list' | 'shops'>` and keeps both panels mounted (`[hidden]`). `GroceryScreen` emits `editShops` from its pencil button; `ShopEditor` emits `back` from its arrow.
- Each panel renders its own sticky `.header` (global styles); `.iconbtn` is the square header button.
- `OAuthService` is only provided by `provideOAuthClient` in `app.config.ts`; component specs don't provide it.
- `ProductPopup` already uses a native `<dialog>` with `showModal()` and a backdrop-click close.
- `angular-oauth2-oidc`: `revokeTokenAndLogout()` revokes both tokens at the discovery document's `revocation_endpoint`, then `logOut()` (clears storage, redirects to `end_session_endpoint` with `id_token_hint`). It rejects without logging out on some errors. `post_logout_redirect_uri` falls back to `redirectUri` by default.

## Goals / Non-Goals

**Goals:** one menu component reused by both panels; logout that ends the offline session, not just the browser one.

**Non-Goals:** URL routing (panels stay a signal); a products management page (Products = the existing list); showing the user's full name or avatar.

## Decisions

- **`app-menu` projected by `Grocery`.** Each panel's header gets a trailing `<ng-content />`; `Grocery` passes `<app-menu [current]="panel()" (go)="panel.set($event)" />` into both. Navigation stays where the panel state lives, `GroceryScreen` loses its `editShops` output and pencil button, and only `Grocery`'s spec needs an `OAuthService` stub. Alternative: menu inside each panel with outputs bubbled up, rejected as two more outputs and three specs needing the stub.
- **Native `<dialog>` drawer.** `showModal()` gives the backdrop, Escape and focus trapping for free. CSS pins it to the right edge at full height (`margin-right: 0`, `height: 100dvh`) as a flex column; the account group gets `margin-top: auto`. Backdrop click closes it, like `ProductPopup`.
- **Entries.** Products and Shops are buttons with `aria-current="page"` on the current one; they emit `go` and close. The user entry is `<a href="{issuer}/account" target="_blank" rel="noopener">`. Logout is a button.
- **Name from the id token claims.** `getIdentityClaims()?.preferred_username`, read once. Alternative: the `me` GraphQL query, rejected as a request and generated code for a value the browser already holds.
- **Logout.** `oauth.revokeTokenAndLogout().catch(() => oauth.logOut())`: revoking the refresh token ends Keycloak's offline session; the catch keeps logout working when revocation fails. No `auth.ts` change.
- **Back arrow stays** in the Shops panel: the shops spec keeps it, and it's one tap versus two.

## Risks / Trade-offs

- [Keycloak rejects `post_logout_redirect_uri` when the client's "Valid post logout redirect URIs" is empty] → README: set it to `+` (reuse redirect URIs).
- [Id token claims missing (e.g. provider omits `preferred_username`)] → the entry falls back to "Account", still linking the profile.
- [Account page in a new tab leaves the installed app] → the app stays open in its own window; the user switches back.
- [Account page path is Keycloak-specific] → the project only targets Keycloak; another provider would need its own URL.
