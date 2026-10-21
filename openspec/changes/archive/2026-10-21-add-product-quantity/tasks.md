# Tasks

Backend commands need `JAVA_HOME` set to the 25.0.3-tem JDK.

## 1. Backend: store and expose the quantity

- [x] 1.1 Add `src/main/resources/db/migration/V3__product_quantity.sql` (`quantity integer not null default 1 check (quantity >= 1)`) and `Product.quantity` (`int`, default 1); verify `./mvnw test -Dtest=MigrationTest` passes
- [x] 1.2 Add the `quantity` argument to `addProduct` (default 1, rejected below 1) and `ProductUpdate.quantity` (null = unchanged, rejected below 1, checked before any field is assigned); verify with new `ProductGraphQLApiTest` cases: add with and without a quantity, "2 apples" stays the name, quantity 0 rejected on add and update, update quantity, empty input keeps the quantity, and an invalid shop plus a quantity changes nothing
- [x] 1.3 Run `./mvnw test` once so `SchemaSnapshotTest` rewrites `src/main/webui/schema.graphql`, check that the diff only adds `quantity`, then verify a second `./mvnw test` passes

## 2. SPA: parse, show, edit

- [x] 2.1 Add `parseQuantity(text)` to `basket.ts` per the design's parser rule; verify `basket.spec.ts` covers "2 apples", "3x eggs", "eggs x3", "eggs 3", "2X eggs", "apples", "500g butter", "7", "0 apples", "1000 apples" and "2 apples 3"
- [x] 2.2 Add `quantity` to `grocery.graphql` (the `Grocery` and `UpdateProduct` selections, and a `$quantity: Int` arg on `AddProduct`), map it in `Grocery.items`, and send it in `Grocery.add`; verify `npm run codegen` succeeds and `grocery.spec.ts` checks the quantity sent by `addProduct`
- [x] 2.3 Replace `meta` with `quantity` on `Item` and `ItemTile` (`{quantity}x {name}` when above 1, on both variants, aria label included; delete the `.meta` CSS); verify `item-tile.spec.ts` covers quantity 2 → "2x apples" and quantity 1 → "apples"
- [x] 2.4 In `GroceryScreen.add`, parse the text, then either re-add the existing product with `productChange({ id, bought: false, quantity })` or create it with its quantity (`added` emits `{ name, quantity }`); widen `productChange` to a partial update; verify `grocery-screen.spec.ts` covers "2 apples" creating "apples" ×2, "3 apple" re-adding a bought "apple" with quantity 3, and "apple" resetting it to 1
- [x] 2.5 Add the "Quantity" number field to `ProductPopup` (hidden for unsaved items, `quantityChange` emitted only for a changed whole number ≥ 1, value always put back) and wire it through `GroceryScreen` to `productChange`; verify `product-popup.spec.ts` covers saving 3, setting back to 1, 0 not emitted, and a rename to "2 apples" leaving the quantity alone
- [x] 2.6 Verify `npm test` and `npm run build` pass in `src/main/webui`

## 3. Integration check

- [x] 3.1 Run the app (`./mvnw quarkus:dev`) and check by hand: add "2 apples" → the tile reads "2x apples"; set Quantity to 1 in the popup → the tile reads "apples"; buy it, then add "3 apples" → it is back in To buy as "3x apples"; reload → the quantity is kept

## Workflow follow-up

- Archive the change with `/opsx:archive` once it is merged.
