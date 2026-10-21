# Tasks

## 1. Backend mutation

- [x] 1.1 In `ProductGraphQLApi`, add the `ProductUpdate` input (`@Input("ProductUpdateInput")`; nullable `bought`, `categoryId`, `shopId` as `String`/`Boolean`) and `updateProduct(id, input)` (`@Mutation("updateProduct")`, `@Transactional`): validate every given field first, then apply; `""` clears category/shop; keep the `boughtAt` and classification rules. Remove `setProductBought`, `setProductCategory`, `setProductShop`. Move `ProductGraphQLApiTest`'s `setCategory`/`setShop` helpers and the bought/category/shop tests to `updateProduct`, and add cases for empty input, several fields at once, one invalid field changes nothing, `""` clears, and an old mutation name rejected. Verify `./mvnw test -Dtest='ProductGraphQLApiTest,CategoryGraphQLApiTest,ShopGraphQLApiTest'` passes with JDK 25.
- [x] 1.2 Add `name` to the input and `findByNameIgnoreCase(String)` to `ProductRepository`: trim, reject blank, reject a name another product has ignoring case; no reclassification. Verify with new `ProductGraphQLApiTest` cases for each scenario of "Rename a product": `./mvnw test -Dtest=ProductGraphQLApiTest`.
- [x] 1.3 In `CategoryGraphQLApi`, replace `renameCategory` with `updateCategory(id, input)` (`CategoryUpdate` input, `@Input("CategoryUpdateInput")`, nullable `name` through `validName`; null keeps the name, empty input changes nothing). Move `CategoryGraphQLApiTest`'s `RENAME` mutation and its tests to `updateCategory`, and add cases for empty input, unknown id and `renameCategory` rejected. Verify `./mvnw test -Dtest=CategoryGraphQLApiTest` passes.
- [x] 1.4 Run `./mvnw test -Dtest=SchemaSnapshotTest` twice (first run rewrites `src/main/webui/schema.graphql` and fails, second passes) and verify the snapshot lists `updateProduct(id: String!, input: ProductUpdateInput!): Product!` and `updateCategory(id: String!, input: CategoryUpdateInput!): ProductCategory!`, and no `setProduct*` or `renameCategory` mutation.

## 2. Client API switch

- [x] 2.1 In `grocery/grocery.graphql`, replace `SetProductBought`, `SetProductCategory`, `SetProductShop` with `mutation UpdateProduct($id: String!, $input: ProductUpdateInput!) { updateProduct(id: $id, input: $input) { id name bought boughtAt classification category { id name } shop { id } } }`, and verify `npm run codegen` in `src/main/webui` generates `UpdateProductGQL` and no `SetProduct*GQL`.
- [x] 2.2 In `grocery/grocery.ts`, make `setBought`, `setProductShop`, `setProductCategory` call `UpdateProductGQL` with `{ bought }`, `{ shopId: shopId ?? '' }`, `{ categoryId: categoryId ?? '' }`; update `grocery.spec.ts` mocks and assertions to match. Verify `npm test` in `src/main/webui` passes.
- [x] 2.3 In `grocery/grocery.graphql`, replace `RenameCategory` with `mutation UpdateCategory($id: String!, $input: CategoryUpdateInput!) { updateCategory(id: $id, input: $input) { id } }`; make `grocery.ts#renameCategory` call `UpdateCategoryGQL` with `{ name: to }`, and switch `grocery.spec.ts` from `RenameCategoryDocument` to `UpdateCategoryDocument`. Verify `npm test` in `src/main/webui` passes.

## 3. Popup name field

- [x] 3.1 In `basket/product-popup`, replace the `<h2>` with `<input aria-label="Name">` for saved items (keep the `<h2>` for local `n…` ids), set the dialog's `aria-label` to the name, add a `nameChange` output emitted on `change` with the trimmed value when non-blank and different, then reset the field to `item().name`; style it like the old title in `product-popup.css`. Verify with new `product-popup.spec.ts` cases: change + Enter/blur emits "tomato", a blank or unchanged value emits nothing and shows the old name, a local item has no input.
- [x] 3.2 In `basket/grocery-screen`, bind the popup's `nameChange` to a `rename(id, name)` that updates the item in local `state` and emits a new `productChange` output `{ id, name }`. Verify with a `grocery-screen.spec.ts` case: long-press "tomatoe", rename to "tomato", the tile reads "tomato" and the output emitted `{ id, name: 'tomato' }`.
- [x] 3.3 In `grocery/grocery.ts` + `grocery.html`, bind `(productChange)` to `updateProduct({ id, name })` running `UpdateProductGQL` with `{ name }` through `run()`, so errors land in `error()`. Verify with a `grocery.spec.ts` case that the mutation is called with the id and `{ name }`, then `npm test` in `src/main/webui` passes.

## 4. Integration check

- [x] 4.1 Run the app (`./mvnw quarkus:dev` with JDK 25): double-tap to buy and tap to un-buy a product, change its category and shop in the popup, rename it with Enter, reload and confirm all four stuck; rename another product to an existing name and confirm the error shows; rename a category in the Shops panel and confirm the tiles show the new name.
