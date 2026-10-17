# Design

## Context

The Basket components (`src/app/basket`: ItemTile, ItemGrid, ShopSelect, AddBar, GroceryScreen) implement the design system with local state and outputs. The backend already returns products with `bought`, `category` and `classification`, and shops with `categoryOrder`.

## Goals / Non-Goals

**Goals:**
- One screen, no navigation; the GraphQL backend is the source of truth.

**Non-Goals:**
- Quantities (the design's `meta` line): no backend field yet.
- UI to manage shops and categories; the GraphQL API covers it for now.
- Remembering the selected shop across reloads.

## Decisions

### A `grocery` page feeds `GroceryScreen`
One `Grocery` query loads `shops { id name categoryOrder { name } }` and `products { id name bought boughtAt classification category { name } }`. Shops map to `{id, name, aisles: categoryOrder names}`, products to `{id, name, aisle: category name, bought, boughtAt}`. `GroceryScreen` sorts client-side with `orderFor`, so switching shop needs no request; the `products(shopId)` query stays in the API.

`boughtChange` calls `setProductBought`; its response updates the Apollo cache, so the screen re-renders from server data. `added` calls `addProduct` and refetches. The page polls every 2 s while any product is `PENDING`, as the old list page did, so classified tiles move to their aisle.

`GroceryScreen` keeps the selected shop across input refreshes while that shop still exists (polls replace the shop array).

### Classification status dot
`Product.classification` maps to the tile `status`; the category name feeds the light text on the tile's top row (To buy only), the dot's tooltip and the accessible label. `GroceryScreen.classify` is optional in the design (new items start `PENDING` while it runs, `UNCLASSIFIED` without it). Classification runs on the server here, so the page passes a `classify` that never settles: a new tile starts with the pending ring instead of flashing red, and the refetch and polling bring the real state.

### `boughtAt` as a nullable timestamp
`product.bought_at timestamptz` with `check (bought = (bought_at is not null))`. `setProductBought` sets it to now only when the flag changes to true, and clears it on false. GraphQL exposes `Instant` as the `DateTime` scalar (ISO string); the page parses it to ms for `boughtList`.

### No router
The App component renders the grocery page directly. Deep links still get `index.html` from the server-side SPA fallback, so the web-frontend spec is unchanged.

## Risks / Trade-offs

- [Two devices tap the same tile at once] → Last write wins; harmless for a shared list.
- [No UI to create shops or set their category order] → Use the GraphQL API (Dev UI in dev mode) until a settings screen is designed.
