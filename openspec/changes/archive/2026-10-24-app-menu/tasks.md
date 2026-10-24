# Tasks

## 1. Menu component

- [x] 1.1 Add `src/main/webui/src/app/menu/menu.ts|html|css`: a `.iconbtn` with three stripes (`aria-label="Menu"`) that `showModal()`s a `<dialog>` pinned to the right edge at full height; top group Products and Shops buttons (`aria-current="page"` from a `current` input, emit `go` with `'list'`/`'shops'` and close), bottom group the user name from `getIdentityClaims()?.preferred_username` (fallback "Account") as a link to `${oauth.issuer}/account` in a new tab, and Logout calling `revokeTokenAndLogout().catch(() => logOut())`; backdrop click closes. Verify with `menu.spec.ts` (OAuthService stubbed): button opens the dialog; entry order is Products, Shops, alice, Logout; Shops has `aria-current` when `current` is `'shops'`; choosing Shops emits `'shops'` and closes; the profile link has the account URL and `target="_blank"`; Logout calls `revokeTokenAndLogout`, and `logOut` when it rejects; a backdrop click closes without emitting.

## 2. Wire it into both panels

- [x] 2.1 Add a trailing `<ng-content />` to the headers of `grocery-screen.html` (after the Install/Update buttons) and `shop-editor.html`; remove the pencil button and the `editShops` output from `GroceryScreen`; in `grocery.html` project `<app-menu [current]="panel()" (go)="panel.set($event)" />` into both panels. Provide an `OAuthService` stub in `grocery.spec.ts` and switch "opens from the list and goes back" to open Shops through the menu, then return once with the back arrow and once with the menu's Products entry. Verify `npm test` and `npm run build` in `src/main/webui` pass.
- [x] 2.2 In `README.md`, extend the `QUARKUS_OIDC_CLIENT_ID` row: "Valid post logout redirect URIs" must include the app URL (`+` in Keycloak). Verify the row keeps 4 pipes.

## 3. Integration check

- [ ] 3.1 Run `./mvnw quarkus:dev` (JDK 25) and log in: the menu button sits at the header's right end on both panels; the menu shows Products, Shops at the top and your username, Logout at the bottom; Shops/Products switch panels; tapping the name opens the Keycloak account page in a new tab; Logout lands on the Keycloak login page, and in Keycloak's admin console the user has no Restok offline session left.
