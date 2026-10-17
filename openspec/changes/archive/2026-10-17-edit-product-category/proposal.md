# Proposal

## Why

The AI sometimes picks the wrong category, or finds none, and the product then sorts into the wrong place in the shop's order. The API can already set a category by hand (`setProductCategory`), but the SPA gives the user no way to do it.

## What Changes

- The product popup (long press on a tile) gets a category dropdown: "No category" first, then every category by name. It shows the product's current category.
- Picking a category saves it at once with `setProductCategory`; the tile shows the new category and moves to its place in the selected shop's order without a reload.
- Picking "No category" clears it (the product becomes `UNCLASSIFIED`).
- While the AI is still sorting the product, the popup keeps its "Sorting into a category…" line; a choice made then wins over the late AI answer (already guaranteed by the API). Otherwise the dropdown replaces that line.
- No backend change: `setProductCategory` and the `categories` query already exist.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: the "Product popup" requirement gains a category dropdown, and a new "Category from the popup" requirement says how it shows and saves the category with `setProductCategory`.

## Impact

- Frontend only: `basket.ts` (`Item.categoryId`, a `Category` type), `ProductPopup`, `GroceryScreen` (categories input, `categoryChange` output), `Grocery` page and `grocery.graphql` (`SetProductCategory` mutation; `category { id }` is already queried).
- No new dependencies, no migration, no API change.
