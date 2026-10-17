# Tasks

Checks: `./mvnw test` (JDK 25) for the backend; `npm run build && npm test` in `src/main/webui` for the frontend.

## 1. Backend

- [x] 1.1 Add `bought_at timestamptz` with `check (bought = (bought_at is not null))` to `product` in `V1__shopping_domain.sql`; add `Product.boughtAt` (`Instant`); `setProductBought` sets it when the flag turns true and clears it on false. Verify: `ProductGraphQLApiTest` checks `boughtAt` is set then null; schema snapshot refreshed.

## 2. Frontend

- [x] 2.1 Delete `src/app/list`, `src/app/shops`, `src/app/categories`, `app.routes.ts`, the router provider and the nav; the App renders the grocery page. Verify: build passes.
- [x] 2.2 Add `src/app/grocery` (`.ts`, `.html`, `.css`, `.graphql`, spec): the `Grocery` query mapped to `GroceryScreen`, `setProductBought` on tap, `addProduct` + refetch on add, polling while `PENDING`. Global body styles from the design. Verify: spec covers shop ordering, tap → mutation, add → mutation + refetch, polling start/stop.
- [x] 2.3 `GroceryScreen` keeps the selected shop when the shop list is refreshed. Verify: a spec re-sets `shops` and the selection stays.

- [x] 2.4 Status dot from the updated design: `status-*` tokens and `size-status-dot`; `ItemTile` `status`/`category` inputs with the dot, tooltip and state in the accessible label; `GroceryScreen.classify`; the page maps `classification` and passes a never-settling `classify`. Verify: specs cover the three states, labels, and pending → classified with re-sorting.
- [x] 2.5 Category name from the updated design: `ItemTile` top row with the light category text left of the dot ("Sorting…" italic, "No category"), none on Bought tiles. Verify: spec checks the three texts and none on Bought.

## 3. Wrap-up

- [x] 3.1 Run `openspec validate grocery-screen --strict`, the backend tests and the frontend checks. Verify: all green.
