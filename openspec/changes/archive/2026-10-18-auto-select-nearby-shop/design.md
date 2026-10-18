# Design

## Context

- `Grocery` (`grocery/grocery.ts`) owns the selected shop as `shopId = signal('')`, shared with `GroceryScreen` and `ShopEditor` through `[(shopId)]`. `''` falls back to the first shop (`findShop`); `ALL_SHOPS` (`'*'`) means no shop.
- The `Grocery` GraphQL query already fetches each shop's `latitude` and `longitude`, but the `Shop` view model in `basket/basket.ts` drops them.
- No geolocation code exists yet. The SPA is a PWA served over HTTPS, so `navigator.geolocation` is available.

## Goals / Non-Goals

**Goals:**
- Open on All shops; switch once to the nearest shop within 200 m when the position and the shops are both known.

**Non-Goals:**
- Watching the position (`watchPosition`) or re-checking when the PWA returns to the foreground.
- Any backend change, or a server-side "nearest shop" query.

## Decisions

1. **Default `shopId` is `ALL_SHOPS`.** One-line change in `Grocery`. `ShopEditor` keeps working: `findShop` already falls back to the first shop for an unknown id, so the panel opens on the first shop while the list shows All shops (current behavior when All shops is picked by hand).

2. **Geolocation lives in `Grocery`, not `GroceryScreen`.** `GroceryScreen` is a presentational component fed by inputs; `Grocery` already does the I/O (GraphQL). One `navigator.geolocation.getCurrentPosition(ok, noop, { timeout: 10_000, maximumAge: 60_000 })` call at construction, writing the coordinates into a `position` signal. Errors are ignored (spec: no error shown). Missing `navigator.geolocation` is treated like a refusal.

3. **Apply once with an `effect` over `position` and the loaded shops.** Position and the GraphQL data arrive in either order. The effect waits until both exist, then runs once: if `shopId()` is still `ALL_SHOPS` and `nearestShop(...)` returns a shop, it sets `shopId`. A `done` flag stops it from running again when shops are later edited or refetched (polling while classifying). Alternative considered: RxJS `combineLatest` + `take(1)`; the effect matches the signal style already used in `Grocery` (`pollWhilePending`).

4. **Hand-pick detection = "is the selection still `ALL_SHOPS`".** No separate "user touched it" flag: any hand-picked shop changes `shopId` away from `ALL_SHOPS`, so the effect leaves it alone. Ceiling: picking a shop and then All shops again before the position arrives lets the position still switch. Acceptable; the window is a few seconds.

5. **`nearestShop(shops, lat, lon)` in `basket.ts`, haversine distance, 200 m limit.** Pure function, unit-tested next to `orderFor`. Haversine over an equirectangular approximation: same size, correct everywhere. Shops without coordinates are skipped. The 200 m limit is a module constant.

6. **`Shop` gets optional `latitude` / `longitude`.** Mapped from the GraphQL nulls to `undefined` in `Grocery.shops`. No other component reads them.

## Risks / Trade-offs

- [Browser asks for location on every fresh install / first open] → Expected for this feature; refusing just keeps All shops.
- [GPS accuracy indoors can exceed 200 m] → The nearest shop may not be picked inside a large mall. Accepted; the user can still pick by hand. The constant is easy to tune.
- [Shops have no coordinates yet, and the SPA can't set them] → Feature does nothing until locations are set through `addShop`/`updateShop`. Called out as out of scope in the proposal.
- [Tests touching `navigator.geolocation`] → Stub it per test in `grocery.spec.ts`; default stub never calls back, so existing tests see All shops.
