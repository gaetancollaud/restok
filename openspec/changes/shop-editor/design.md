# Design

## Context

The grocery page (`src/app/grocery`) feeds `GroceryScreen` from one `Grocery` query. Shops carry `categoryOrder` (global `ProductCategory` rows), and the API already has `addShop`, `updateShop`, `deleteShop`, `setShopCategoryOrder` and `addCategory`. The design's `ShopEditor` works on shops as `{id, name, aisles: string[]}` and reports the whole updated array.

## Goals / Non-Goals

**Goals:**
- Edit shops and each shop's aisle order in the app, saved immediately.

**Non-Goals:**
- Editing a shop's location in the app.
- Renaming or deleting global categories from the app; × only removes a category from one shop's order.

## Decisions

### Granular outputs instead of `onChange(shops)`
`ShopEditor` emits `addShop`, `rename {id, name}`, `remove id` and `orderChange {id, aisles}` instead of the whole array, because each maps to one mutation and a new shop's id comes from the server. It keeps a local copy of the shops (reset when the input changes) so edits show at once. The page owns the selected shop and the visible panel (the design's `BasketApp`); `GroceryScreen` takes the selected shop as a `model`.

### Names to category ids
`orderChange` carries category names. The page maps them to ids with a `categories { id name }` field added to the `Grocery` query, creating missing names with `addCategory` first, then calls `setShopCategoryOrder`. Matching ignores case, as the category name rule does.

### Saving
Every mutation refetches `Grocery`. The Name field updates locally on input and calls `updateShop` on `change` (blur or Enter), passing back the shop's coordinates, so typing does not send one request per key. "New shop" calls `addShop("New shop")` with no coordinates and copies the current shop's order, then selects it and focuses the Name field.

### Optional coordinates
`latitude`/`longitude` become nullable `Double`s with `check ((latitude is null) = (longitude is null))`. The API rejects only one of them; ranges are checked when given.

### Drag to reorder
Pointer events on the grip with pointer capture; the held row follows the pointer (`translateY`), the others shift by one row (64px = 56px row + 8px gap) to show the landing spot; release commits. Arrow keys on the grip move one place and keep focus on the moved row. No drag library.

### Double tap on To-buy tiles
`ItemTile` counts taps itself (two within 400 ms) instead of `dblclick`, which touch browsers don't fire reliably. Its accessible label says "tap twice to mark as bought".
