# Tasks

## 1. Nearest shop helper

- [x] 1.1 In `src/main/webui/src/app/basket/basket.ts`, add optional `latitude` / `longitude` to `Shop` and a pure `nearestShop(shops, lat, lon)` (haversine, 200 m constant, skips shops without coordinates); verify with new cases in `basket.spec.ts`: 50 m → that shop, 80 m vs 150 m → the 80 m one, 250 m → undefined, shop without coordinates → ignored

## 2. Open on All shops, then the nearby shop

- [x] 2.1 In `src/main/webui/src/app/grocery/grocery.ts`, start `shopId` at `ALL_SHOPS` and map shop `latitude` / `longitude` (null → undefined); fix the `shopId` doc comment; verify a `grocery.spec.ts` test that the dropdown shows "All shops" after load
- [x] 2.2 In `grocery.ts`, call `navigator.geolocation.getCurrentPosition` once (timeout 10 s, errors ignored, missing API tolerated) into a `position` signal, and add a one-shot effect that sets `shopId` to `nearestShop(...)` once shops and position are both known and `shopId` is still `ALL_SHOPS`; verify with `grocery.spec.ts` tests stubbing `navigator.geolocation`: position 50 m from Coop → "Coop" selected; position 250 m away → "All shops"; error callback → "All shops", no error shown; shop picked before the position resolves → kept
- [x] 2.3 Run `npm test` in `src/main/webui` and verify the whole suite passes (update any existing test that assumed the first shop on open)

## 3. Integration check

- [x] 3.1 Run the app (`./mvnw quarkus:dev`), set a shop's coordinates to the device's position through `updateShop` in the GraphQL UI, reload the SPA, accept the location prompt, and verify that shop is selected; deny the prompt in a fresh profile and verify "All shops" stays

## Workflow follow-up

- Archive the change once implemented and reviewed (`/opsx:archive`).
