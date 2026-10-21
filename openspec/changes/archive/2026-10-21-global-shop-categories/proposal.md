# Proposal

## Why

Categories are global, but each shop's aisle order can drop some of them, so a category can silently vanish from one shop's list. In the Shops panel, × only removes a category from the selected shop, and there is no way to rename a category. The user wants one shared list of categories: every shop always orders all of them, and editing the list from any shop affects all shops.

## What Changes

- Every shop's category order always contains every category exactly once.
- `addShop` seeds the new shop's order with every category (sorted by name) instead of an empty order.
- **BREAKING** `setShopCategoryOrder` only accepts a full permutation of all categories; a partial list is rejected.
- Shops panel: × deletes the category from the database (and so from every shop), with a second tap to confirm, since products in it become uncategorized. Those products go back to `UNCLASSIFIED` (red dot).
- Shops panel: the category name in each aisle row can be edited; the rename applies everywhere.
- Shops panel: adding a category appends it to the bottom of every shop (backend already does this); a name that already exists is ignored.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `product-categories`: new invariant "every shop orders every category"; added categories go last in every shop, including shops that start empty or are added later.
- `shops`: `addShop` seeds the full order; `setShopCategoryOrder` requires the full list; the Shops panel's × deletes the category globally, and rows can be renamed.

## Impact

- Backend: `ShopGraphQLApi` (`addShop`, `setShopCategoryOrder`), `ShopCategoryRepository`.
- Frontend: `shop-editor`, `category-list`, `grocery.ts`, `grocery.graphql` (new `RenameCategory`, `DeleteCategory` operations), regenerated `generated.ts`.
- Tests: `ShopGraphQLApiTest`, `CategoryGraphQLApiTest`, `shop-editor.spec.ts`, `category-list.spec.ts`, `grocery.spec.ts`.
- No new dependencies.
