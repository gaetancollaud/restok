# Design

## Context

See proposal.md for why and specs/shopping-list/spec.md for the behavior. Current state that shapes the approach:

- `addProduct(name)` in `ProductGraphQLApi` only trims the name. `updateProduct(id, ProductUpdate)` resolves every field before it assigns any.
- The add bar emits raw text. `GroceryScreen.add` dedupes by name (case-insensitive) *before* anything reaches the server, adds an optimistic local item (`id` starting with `n`), and emits `added`. `Grocery.add` calls `addProduct` and refetches.
- `GroceryScreen.productChange` emits `{ id, name }`, and `Grocery.updateProduct` spreads it into `ProductUpdateInput` as is.
- `ItemTile` has an unused `meta` input ("2 ×", "500 g") that nothing in `Grocery` fills.
- Migrations are Flyway `V1`, `V2`.

## Goals / Non-Goals

**Goals:**
- One parser for the add-bar text, run only on create.
- The API stays explicit: the quantity is a field, never guessed from the name.

**Non-Goals:**
- Units ("500 g", "2 kg"), decimals, a stepper or +/- buttons on tiles.
- Merging quantities when re-adding (3 + 2): re-adding *sets* the typed quantity.
- Parsing existing product names into quantities during the migration.

## Decisions

### Parse in the SPA, not in `addProduct`
The duplicate check runs in `GroceryScreen.add` on the name, so the name must already be stripped of its quantity there. Parsing on the server too would mean two parsers. So `parseQuantity(text): { name, quantity }` lives in `basket.ts`, next to the other pure list helpers, and `addProduct` gets an explicit `quantity: Int` argument with default 1.
*Alternative:* parse on the server in `addProduct`. Rejected: dedup would miss "2 apple" vs "apple", and API callers would get guessed names.

### Parser rule
The parser trims the text and splits it on whitespace. If the first word, then the last word, matches `^[x×]?(\d{1,3})[x×]?$` (case-insensitive), its value is from 1 to 999, and at least one other word remains, that word becomes the quantity and the rest is the name. Otherwise the result is `{ name: text, quantity: 1 }`. The 999 cap keeps the value well inside a GraphQL `Int`, and a big number like "2024" stays in the name. The first word wins over the last ("2 apples 3" → 2, "apples 3").
*Alternative:* any number anywhere in the text. Rejected: it breaks names such as "7up" or "coca 0%".

### Storage and API
- `V3__product_quantity.sql`: `alter table product add column quantity integer not null default 1 check (quantity >= 1);`. Existing rows get 1. The DB check backs up the API check.
- `Product.quantity`: an `int` that defaults to 1 and is `@NonNull` in GraphQL.
- `addProduct(@NonNull String name, @DefaultValue("1") int quantity)` rejects a quantity below 1 before persisting.
- `ProductUpdate.quantity`: an `Integer` (null leaves it unchanged). It is checked with the other fields before any assignment, so one bad field changes nothing.

### SPA wiring
- `Item` gets `quantity: number` and loses `meta`. `ItemTile` loses `meta` and gets `quantity` (default 1). The label shows `quantity > 1 ? `${quantity}x ${name}` : name` on both variants, and the aria label starts the same way. The `.meta` CSS goes too.
- `GroceryScreen.add(text)` calls `parseQuantity`. For an existing match it emits `productChange({ id, bought: false, quantity })`: one `updateProduct` instead of `boughtChange`, sent even when the item is already in To buy, so the quantity is set. A new product goes into local state with its quantity and `added` emits `{ name, quantity }`.
- `productChange` widens to `{ id } & Partial<{ name; quantity; bought }>`, and `Grocery.updateProduct` already forwards it. `Grocery.add` sends `quantity`. `grocery.graphql` selects `quantity` in `Grocery` and `UpdateProduct`, and `AddProduct` takes `$quantity: Int`.
- `ProductPopup`: an `<input type="number" min="1" step="1" inputmode="numeric" aria-label="Quantity">` under a "Quantity" section heading, saved on `(change)` like `rename()`. It emits `quantityChange` only for a whole number ≥ 1 that differs from the saved value, and always puts the bound value back. Local (unsaved) items don't show it, the same as the other fields.

## Risks / Trade-offs

- [A name that really starts with a number, e.g. "7 grain bread"] → it is added as "grain bread" ×7. The user fixes it in the popup: rename it and set the quantity to 1. Renaming never parses, so the fix sticks.
- [Re-adding resets a hand-set quantity to 1] → this is intended: re-adding means "I need this again", and the spec states it. If it annoys in practice, the change is to keep the old quantity when none was typed.
- [Optimistic re-add] → the local state flips `bought` but the tile shows the old quantity until the `updateProduct` response updates the cache. That takes milliseconds, so no extra local patching.

## Migration Plan

Flyway applies V3 on startup. The column is additive with a default, so rollback = deploy the previous image (it ignores the column). `MigrationTest` covers the migration chain.
