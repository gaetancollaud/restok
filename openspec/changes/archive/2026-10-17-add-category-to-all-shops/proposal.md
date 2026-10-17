# Proposal

## Why

A new category starts in no shop's order, so its products sort last everywhere until the user opens each shop and adds it by hand. With several shops that's tedious, and easy to forget.

## What Changes

- `addCategory` also appends the new category to the end of every existing shop's category order, in the same transaction.
- Adding a category from the Shops panel therefore puts it last in every shop, not only in the selected one. The user can still move or remove it per shop.
- Only newly added categories are appended. Categories that already exist and are missing from some shops' orders stay missing (no backfill).
- New shops keep starting with an empty order ("New shop" in the SPA still copies the selected shop's order).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `product-categories`: "Add a category" now also appends the category to every shop's order.

## Impact

- Backend: `CategoryGraphQLApi.addCategory`, `ShopCategoryRepository` (new append method), `CategoryGraphQLApiTest`; check `ProductGraphQLApiTest` and `ShopGraphQLApiTest`, which add a category while shops exist.
- No API shape change, no migration, no frontend change.
