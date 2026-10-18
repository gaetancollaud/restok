# Tasks

## 1. Popup delete button

- [x] 1.1 In `basket/product-popup`, add a `removed` output and a "Delete product" button inside the saved-product branch (not for local `n…` ids), copying `ShopEditor`'s two-tap confirm (`confirming` signal, 4 s timer, "Tap again to delete <name>", `.danger` / `.danger.confirm` styles); the second tap emits `removed` and closes the dialog. Verify with new `product-popup.spec.ts` cases: one tap emits nothing and shows the confirm label, a second tap emits once, the label resets after 4 s (fake timers), and a local item has no button.

## 2. Screen and API wiring

- [x] 2.1 Add `mutation DeleteProduct($id: String!) { deleteProduct(id: $id) }` to `grocery/grocery.graphql` and verify `npm run codegen` in `src/main/webui` generates `DeleteProductGQL`.
- [x] 2.2 In `basket/grocery-screen`, handle the popup's `removed`: drop the item from local `state`, clear `selectedId`, and emit a new `productRemoved` output with the id. Verify with a `grocery-screen.spec.ts` case: long-press a To-buy tile, tap delete twice, the tile is gone, the popup is closed and `productRemoved` emitted its id; same for a Bought tile.
- [x] 2.3 In `grocery/grocery.ts` + `grocery.html`, bind `(productRemoved)` to a `removeProduct(id)` that runs `DeleteProductGQL` through `save()` (refetch after), so errors land in `error()`. Verify `npm test` in `src/main/webui` passes.

## 3. Integration check

- [ ] 3.1 Run the app (`./mvnw quarkus:dev` with JDK 25), long-press a product, delete it with two taps, reload the page and confirm it is gone.
