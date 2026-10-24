# Proposal

## Why

With `persistent-login` the login lasts for weeks, so users need a way to log out and to reach their account at the provider. The header only has an edit button for shops, and there is no place to grow navigation. A menu gives one entry point for pages and account actions.

## What Changes

- The grocery header's edit button is replaced by a menu button (three stripes) on the right. The Shops panel header gets the same button.
- The menu slides in from the right. Top: **Products** (the shopping list, home) and **Shops** (the Shops panel). Bottom: the logged-in **user name**, which opens the provider's account page (Keycloak: `<issuer>/account`) in a new tab, and **Logout**.
- The entry for the current page is marked; choosing an entry closes the menu. Escape or a tap outside closes it too.
- Logout revokes the stored tokens at the provider (ending the offline session), clears them from the browser, ends the provider session and returns to the app, which then shows the provider's login.
- The Shops panel keeps its back button.

## Capabilities

### New Capabilities

- `app-menu`: the menu button, the menu's layout and its navigation between the list and the Shops panel.

### Modified Capabilities

- `user-auth`: adds the profile link and logout.
- `shops`: "Shops panel in the SPA" opens from the menu instead of an edit button; the menu's Products entry also returns to the list.
- `pwa`: "Install button" sits next to the menu button instead of the edit button.

## Impact

- Frontend: new `menu/` component; `grocery.html` (places the menu), `grocery-screen` (edit button and `editShops` output removed), `shop-editor.html` headers; tests in `menu.spec.ts` and `grocery.spec.ts`.
- Backend: none.
- Provider: the client's "Valid post logout redirect URIs" must include the app URL (Keycloak `+` reuses the redirect URIs). README updated.
