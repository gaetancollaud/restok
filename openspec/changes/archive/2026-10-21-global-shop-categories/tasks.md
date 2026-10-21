# Tasks

Checks: `./mvnw test` with JDK 25 (`JAVA_HOME` set to 25.0.3-tem); `npm test` in `src/main/webui` (runs codegen first).

## 1. Backend: every shop orders every category

- [x] 1.1 Add `ShopCategoryRepository.seed(Shop)` (native insert-select, positions by category name) and call it from `ShopGraphQLApi.addShop` after `persist` + `flush`. Verify: `ShopGraphQLApiTest` "Valid shop" now expects `categoryOrder` to be every category sorted by name (replaces the `empty()` assertion at line 90); `CategoryGraphQLApiTest` "shops added later" expects the new shop to contain the added category.
- [x] 1.2 In `setShopCategoryOrder`, reject a list whose size differs from `categoryRepository.count()` with a GraphQL error. Verify: new test "partial order rejected" leaves the order unchanged; existing set-order tests updated to pass every category; `./mvnw test` passes.
- [x] 1.3 In `deleteCategory`, set the classification of the category's products to `UNCLASSIFIED` before deleting it, so they show the red dot again. Verify: a `CategoryGraphQLApiTest` test deletes a used category and finds its product uncategorized and `UNCLASSIFIED`.

## 2. Frontend: rename and global delete from the Shops panel

- [x] 2.1 Add `RenameCategory` and `DeleteCategory` operations to `grocery.graphql`. Verify: `npm run codegen` generates `RenameCategoryGQL` and `DeleteCategoryGQL`.
- [x] 2.2 `CategoryList`: × emits `remove(name)` only on a second tap within 4 s (first tap shows a confirm state); the row name becomes an input that emits `rename({ from, to })` on change and resets to the bound name. Verify: `category-list.spec.ts` covers one tap not emitting, two taps emitting, and a name change emitting `{ from, to }`.
- [x] 2.3 `ShopEditor`: forward `remove` and `rename` as `removeCategory` / `renameCategory` outputs; replace its `addCategory` append-to-order logic with an `addCategory(name)` output, still ignoring names already present (ignoring case). Verify: `shop-editor.spec.ts` "appends a category once" becomes "emits addCategory once, ignoring case", plus forwarding tests.
- [x] 2.4 `Grocery`: handle the three outputs by mapping name → id from `categories` and calling `addCategory` / `renameCategory` / `deleteCategory` through `save()` (refetch after); drop the create-missing-names path in `order()`. Verify: `grocery.spec.ts` covers each mutation being sent with the right id and a refetch following; `npm test` passes.

## 3. Integration

- [x] 3.1 Run `openspec validate global-shop-categories --strict`, `./mvnw test`, and `npm test`. Verify: all green.
- [x] 3.2 Run the app (`./mvnw quarkus:dev`), open the Shops panel, rename a category, delete one with two taps, add one, and switch shops. Verify: the rename and delete show in every shop, the new category is last in every shop, and products of the deleted category appear uncategorized.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review.
