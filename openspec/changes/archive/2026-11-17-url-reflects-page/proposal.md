## Why

The URL is always `/`, whatever panel or shop is showing. A reload, a shared link, or the phone's Back button loses where the user was. Back even leaves the app instead of closing the Shops editor.

## What Changes

- The address bar reflects the current panel and shop:
  - `/`: list on All shops
  - `/list/{uuid}`: list on that shop
  - `/shop/{uuid}`: Shops editor on that shop
- Opening one of these URLs (reload, deep link, shared link) opens that panel and shop.
- Opening the Shops editor adds a browser history entry, so Back returns to the list. Switching shops replaces the current entry, so history doesn't fill up.
- Unknown or deleted shop ids fall back the way both panels already do, to the first shop. The URL is corrected to match.
- A shop named in the URL wins over the nearby-shop auto-selection.
- After an OIDC login redirect, the app returns to the URL the user first opened, not to `/`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `web-frontend`: new requirement: page URLs mirror the panel and shop, with history behaviour.
- `shopping-list`: "Nearby shop selected on open" and "All shops view" apply only when the URL names no shop.
- `user-auth`: "Login before the app renders" returns to the originally requested URL.

## Impact

- Frontend only (`src/main/webui`): the `Grocery` component (panel/shop state ↔ URL) and `auth/auth.ts` (keeps the path through the login redirect).
- No backend change: Quinoa's SPA routing already serves `index.html` for `/list/…` and `/shop/…`, and the service worker serves navigations from `index.html`.
- No new dependency.
