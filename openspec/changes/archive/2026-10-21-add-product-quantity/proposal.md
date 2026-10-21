# Proposal

## Why

A product has no quantity, so "2 apples" can only be written into its name. The list needs a real quantity: typed once when adding, shown on the tile, and editable later.

## What Changes

- Products get a `quantity`, a whole number ≥ 1, default 1, stored and returned by the GraphQL API.
- `addProduct` takes an optional `quantity` (default 1); `updateProduct` takes an optional `quantity`.
- The add bar reads a quantity from the typed text when the product is created: "2 apples", "2x apples", "apples 2" and "apples x2" add "apples" with quantity 2. Text without such a number adds quantity 1. Renaming never parses a number.
- Re-adding an existing product from the add bar (no-duplicate rule) puts it back to buy with the typed quantity.
- A tile with a quantity above 1 shows `{quantity}x {name}` (e.g. "2x apples"); quantity 1 shows the name alone.
- The product popup gets a "Quantity" number field, saved with `updateProduct`.
- The tile's unused `meta` text slot is replaced by the quantity.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: products carry a quantity; `addProduct` and `updateProduct` accept it; the add bar parses it from the typed text; tiles show it; the popup edits it; re-adding sets it.

## Impact

- DB: new Flyway migration `V3__product_quantity.sql` (`quantity integer not null default 1`, check ≥ 1). Existing products get 1.
- Backend: `Product`, `ProductUpdate`, `ProductGraphQLApi`, `ProductGraphQLApiTest`; GraphQL schema snapshot.
- Frontend: `schema.graphql`, `grocery.graphql` + generated types, `grocery.ts`, `basket.ts`, `grocery-screen`, `item-tile`, `product-popup`, and their specs.
- API: additive only; existing clients keep working.
