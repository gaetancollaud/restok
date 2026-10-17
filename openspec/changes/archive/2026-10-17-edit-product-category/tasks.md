# Tasks

Checks: `npm run build && npm test` in `src/main/webui`. No backend change, so `./mvnw test` only needs to stay green.

## 1. Data

- [x] 1.1 `basket.ts`: add `Item.categoryId?: string` and `export type Category = { id: string; name: string }`. Verify: `npm run build` passes.
- [x] 1.2 `grocery.graphql`: add `SetProductCategory($id: String!, $categoryId: String)` returning `id classification category { id name }`; regenerate the GraphQL types. Verify: `SetProductCategoryGQL` exists in `src/app/graphql/generated` and the build passes.

## 2. Popup

- [x] 2.1 `ProductPopup`: `categories` input and `categoryChange` output (id or null); a `ShopSelect` labelled "Category" with "No category" first, bound to `categoryId`, above "Buy only at"; the `.cat` line shows only while `PENDING`; no category dropdown for a local `n…` id. Verify: `product-popup.spec.ts` checks the options ("No category" then categories), the current category selected, "No category" for an unclassified item, picking a category emits its id and "No category" emits null, "Sorting into a category…" while pending, and no dropdowns for an `n…` id. The existing shop tests still pass (pick the shop select by its label, not the first `select`).

## 3. Screen and page

- [x] 3.1 `GroceryScreen`: `categories` input passed to the popup; `setCategory` updates `categoryId`, `aisle` and `status` in local state and emits `categoryChange { id, categoryId }`. Verify: `grocery-screen.spec.ts` changes "tomato" from Fruits to Légumes with "Coop" ordering [Légumes, Pain, Fruits] and sees it move ahead in To buy with category text "Légumes"; clearing shows "No category"; the output fires both times.
- [x] 3.2 `Grocery` page: map `categoryId: p.category?.id`, pass `data.categories`, and call `SetProductCategory` on `categoryChange`. Verify: `grocery.spec.ts` checks `setProductCategory` is sent with the product id and the category id, and with null for "No category".

## 4. Wrap-up

- [x] 4.1 Run `openspec validate edit-product-category --strict` and the frontend checks; at phone width, long-press a tile, change its category, close, and see the tile in its new place. Verify: all green and the tile moved without a reload.
