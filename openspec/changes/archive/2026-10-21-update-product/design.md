# Design

## Context

- `ProductGraphQLApi` has one mutation per field: `setProductBought`, `setProductCategory`, `setProductShop`. Each loads the product, checks, then mutates; the only client is the SPA (`grocery.graphql`, `grocery.ts`).
- `ProductPopup` (`basket/product-popup/`) shows the name in an `<h2 id="product-popup-title">` that labels the `<dialog>`. Category and shop changes go popup → `GroceryScreen` (optimistic update of its `linkedSignal` state) → `Grocery` (GraphQL mutation via `run`), and the mutation response updates the Apollo cache.
- Shop and category renames already save on the native `change` event (blur or Enter): `shop-editor.html`, `category-list.ts#changeName`.
- Products have no unique-name index; duplicates are avoided only by the add bar's case-insensitive match. Categories check duplicates in `CategoryGraphQLApi#validName`.

## Goals / Non-Goals

**Goals:** one product mutation that later fields extend; rename from the popup with the same save-on-change feel as shop and category names.

**Non-Goals:** re-running AI classification on rename; a DB unique index on product names (existing data may already hold case duplicates); folding `addProduct` or `deleteProduct` into `updateProduct`; changing `updateShop`, which still takes every field.

## Decisions

- **Input object.** `updateProduct(id: String!, input: ProductUpdateInput!): Product!`, input class `ProductUpdate` with `@Input("ProductUpdateInput")`: `String name`, `Boolean bought`, `String categoryId`, `String shopId`, all nullable. An input object grows without changing the mutation's signature. Alternative: flat nullable arguments, rejected because they lengthen the call with each new field.
- **`""` clears, null keeps.** Ids are typed `String`, not `UUID`, so `""` can travel. A non-empty id is parsed with `UUID.fromString`; a malformed one is reported like an unknown one ("category not found" / "shop not found"). Alternative: separate `clearCategory`/`clearShop` booleans, rejected as more fields for the same thing.
- **Validate everything, then apply.** Resolve the category, shop and name (trim, blank, `findByNameIgnoreCase` hit on another id) into locals first; assign fields only when all pass. `GraphQLException` is checked, and JTA `@Transactional` doesn't roll back on checked exceptions, so the ordering is what makes "one invalid field changes nothing" hold.
- **Same rules as today per field.** `bought` keeps the `boughtAt` logic of `setProductBought` (time set only when the flag flips). `categoryId` sets `CLASSIFIED`/`UNCLASSIFIED` as `setProductCategory` did, so `ClassificationConsumer`'s PENDING guard still makes a manual choice win.
- **`ProductRepository#findByNameIgnoreCase`**: `find("lower(name) = lower(?1)", name).firstResult()`. Existing data may hold duplicates; any hit on another id rejects. Check-then-update race noted with a `ponytail:` comment.
- **One GraphQL document on the client.** `UpdateProduct($id, $input)` returns `id name bought boughtAt classification category { id name } shop { id }`, so whichever field changed, the Apollo cache gets it. `grocery.ts` keeps `setBought`, `setProductShop`, `setProductCategory` as thin wrappers over `UpdateProductGQL`, mapping the components' `null` to `""`. Popup and screen outputs stay as they are.
- **`updateCategory` mirrors it.** `updateCategory(id: String!, input: CategoryUpdateInput!): ProductCategory!`, input class `CategoryUpdate` with `@Input("CategoryUpdateInput")` and a nullable `String name`; a non-null name goes through the existing `validName`. `grocery.ts#renameCategory` keeps its signature and calls `UpdateCategoryGQL` with `{ name: to }`; `ShopEditor`'s `renameCategory` output is a UI event and keeps its name.
- **Title becomes an `<input aria-label="Name">` in the header.** `aria-labelledby` pointing at an input reads poorly, so the dialog switches to `[attr.aria-label]="item().name"`. Unsaved (local) items keep the `<h2>`.
- **Save on `change`, then reset the field**, like `category-list#changeName`: emit `nameChange` with the trimmed value when it is non-blank and differs, then set the field back to `item().name` (which the parent's optimistic update has already changed). `GroceryScreen#rename` updates local state and emits `productChange` `{ id, name }`; `Grocery#updateProduct` calls `UpdateProductGQL` with `{ name }` via `run`.
- **No autofocus.** Opening the popup must not pop up the phone keyboard.

## Risks / Trade-offs

- [Breaking API change] → the SPA ships from the same build as the server (Quinoa), so client and server switch together; no external clients exist.
- [Null can't mean "clear"] → `""` is the clear marker for ids; a future nullable non-id field needs its own clear convention, decided when it is added.
- [Failed rename leaves the typed name on the tile until the next items change] → same accepted behavior as "Delete fails"; the error banner tells the user.
