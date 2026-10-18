# Proposal

## Why

The grocery screen opens on the first shop by name, which hides products restricted to other shops and sorts the list for a shop the user may not be in. At home, the useful view is everything still to buy; in a shop, it is that shop's order. Shops already store GPS coordinates, so the app can tell which case applies.

## What Changes

- The grocery screen opens on "All shops" instead of the first shop.
- When the app opens, the SPA asks the device for its position once. If a shop with coordinates is within 200 m, the screen switches to the nearest such shop.
- No position (permission denied, unavailable, timeout), or no shop within 200 m: the screen stays on "All shops", with no error shown.
- A shop the user picks by hand before the position arrives is kept; the position never overrides it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `shopping-list`: the "All shops view" requirement changes its default (opens on All shops, not the first shop); a new requirement covers selecting the nearby shop on open.

## Impact

- Frontend only: `src/main/webui/src/app/grocery/grocery.ts` (initial `shopId`, shop coordinates mapping, geolocation call), `basket/basket.ts` (`Shop` gets optional coordinates, a nearest-shop helper), and their specs.
- Browser Geolocation API: the browser shows its location permission prompt on first open. It needs a secure context (HTTPS or localhost), which the PWA already requires.
- No GraphQL or database change: `shops` already returns `latitude` and `longitude`.
- Out of scope: editing a shop's location from the SPA (the Shops panel doesn't edit it today), and re-checking the position while the app stays open.
