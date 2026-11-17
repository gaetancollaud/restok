## Context

The SPA has no router. `Grocery` (`src/main/webui/src/app/grocery/grocery.ts`) is the only page. Two signals drive it: `panel: 'list' | 'shops'` and `shopId` (`ALL_SHOPS` = `'*'` or a shop UUID). Both panels stay mounted and are toggled with `[hidden]`, so the list keeps its scroll position. `findShop` falls back to the first shop when an id is gone. The server already returns `index.html` for unknown paths (Quinoa `enable-spa-routing`), and `<base href="/">` is set. See proposal.md for motivation and specs/ for the required behaviour.

## Goals / Non-Goals

**Goals:**
- Keep the URL and the two signals in sync both ways, without remounting the panels.

**Non-Goals:**
- No product-level URLs, such as the product popup.
- No query parameters, and no other pages.

## Decisions

### Angular `Location`, not `@angular/router`
`Location` (from `@angular/common`, provided in root, path strategy by default) gives `path()`, `go()`, `replaceState()` and `onUrlChange()`. That's all we need.
- Alternative, `provideRouter` with `''`, `list/:id` and `shop/:id`: each route config gets its own component instance, so switching panels would destroy `Grocery`. That loses the scroll position, refetches, and fights the "both panels stay mounted" design. Working around it needs a custom `RouteReuseStrategy` or a `**` route that parses the URL by hand anyway. Router: add later if the app grows real pages.

### Signals are the source of truth; the URL is written from them
- **On construct**: parse `location.path()` once (`/shop/:id` → shops panel; `/list/:id` → list on that shop; anything else → list on `ALL_SHOPS`) and seed `panel` and `shopId`.
- **One `effect`** writes the URL from `panel()` and the effective shop id. The editor uses `findShop(...)?.id` and the list uses `ALL_SHOPS` or `findShop`, so a stale or deleted id gets corrected once the shops arrive. Unknown paths become `/`. It calls `go()` (push) only when the panel changes from list to shops. In every other case it calls `replaceState()`. It skips the write when the path is already the same.
- **`onUrlChange`** (Back/Forward) parses the new path:
  - To `shops`: set the panel and the shop from the URL.
  - To `list`: set the panel only and keep the current `shopId`, so a shop picked in the editor survives Back. The effect then replaces the URL with `/list/{current}`.
- **The in-app back button** in the Shops panel calls `location.back()` when this session pushed the editor entry. Otherwise, for example after landing directly on `/shop/…`, it sets `panel` to `'list'`, which replaces the URL. This keeps the in-app button and the browser button from piling up entries.

### Nearby selection is skipped when the URL names a shop
`selectNearby` already only acts while `shopId` is `ALL_SHOPS`. Seeding `shopId` from the URL on construct gives the spec's "URL wins" behaviour without new code.

### Login keeps the path: `preserveRequestedRoute: true`
angular-oauth2-oidc saves `pathname + search` before redirecting to the provider and restores it with `history.replaceState` after the code exchange. That's one config line in `auth/auth.ts`. `redirectUri` stays `location.origin + '/'`, so the Keycloak client config doesn't change. Login runs as an app initializer, before `Grocery` is constructed, so `Grocery` sees the restored path.

## Risks / Trade-offs

- [Path read before the shops load] → the editor seeds an id that may not exist. The effect corrects the URL once `shops()` arrives. Before then it leaves the URL untouched: no write while `data()` is undefined.
- [Effect writes during tests change jsdom's URL] → reset with `history.replaceState(null, '', '/')` in `beforeEach` of `grocery.spec.ts`.
- [Service worker navigation] → ngsw serves `index.html` for any navigation by default, so offline deep links work. No config change.

## Migration Plan

Frontend-only and stateless. Deploy as usual. Rolling back restores the always-`/` behaviour, and old links like `/shop/x` still load the app thanks to the SPA fallback.
