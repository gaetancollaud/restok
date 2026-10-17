# Design

## Context

- The backend is done: `setProductCategory(id, categoryId)` sets `CLASSIFIED`, or `UNCLASSIFIED` on null, and a manual choice already beats a late AI answer (`shopping-list` spec, "Manual choice wins over late classification").
- The `Grocery` query already fetches `categories { id name }` and each product's `category { id name }`, but `Grocery` maps only `category.name` into `Item.aisle`.
- `ProductPopup` already edits the shop the same way this change edits the category: a `ShopSelect` with an empty first option, an output, local state updated by `GroceryScreen`, and a mutation in `Grocery`.
- `ShopSelect` takes `Shop[]`, and `Shop` is `{ id, name, aisles? }`, so a `{ id, name }[]` category list fits it as is.

## Goals / Non-Goals

**Goals:** pick, change or clear a product's category from the product popup, and see the tile move at once.

**Non-Goals:**
- Creating a category from the popup. The Shops panel already creates categories (by adding a name to a shop's order); a "New category…" entry can come later if asked.
- Re-running the AI on demand.
- Any backend or schema change.

## Decisions

- **Item:** add `categoryId?: string` next to `aisle`, mapped from `p.category?.id`. The dropdown selects by id. Rejected: matching by `aisle` name. Names are unique ignoring case, but an id doesn't depend on that.
- **Categories into the screen:** a `Category = { id: string; name: string }` type in `basket.ts`. `GroceryScreen` takes a `categories` input, and `Grocery` passes `data.categories`, which the API already sorts by name.
- **Popup:** a second `ShopSelect` labelled "Category", with `emptyLabel="No category"`, bound to `item().categoryId ?? ''`. It emits `categoryChange` (id or null) and replaces the `.cat` text line, except while `PENDING`, when the line stays ("Sorting into a category…") above the dropdown. The dropdown sits above "Buy only at", and both stay hidden while the id is a local `n…` id. Rejected: a generic `OptionSelect` rename of `ShopSelect`. It's structurally the same; rename it when a third use shows up.
- **Local state:** `GroceryScreen.setCategory(id, categoryId)` sets `categoryId`, `aisle` (name looked up in `categories`) and `status` (`CLASSIFIED`, or `UNCLASSIFIED` on null) in `state`, so the tile re-sorts at once as `setShop` does. It then re-emits `categoryChange { id, categoryId }`.
- **Save:** a `SetProductCategory` mutation in `grocery.graphql` returning `id classification category { id name }`, so Apollo's cache updates the product. That also turns off the PENDING poll when the user beats the AI. `Grocery.setProductCategory` calls it through `run`, as `setProductShop` does.

## Risks / Trade-offs

- [The user picks while PENDING and the poll returns the old PENDING row before the mutation lands] → `linkedSignal` resets local state to `PENDING` for one poll. The mutation response then writes `CLASSIFIED` into the cache, and the server keeps the manual choice. A brief flicker at most.
- [The category is renamed or deleted in the Shops panel while the popup is open] → `save` refetches everything, and the popup reads the item and categories from the fresh inputs.

## Migration Plan

Frontend-only deploy. No data change, so a rollback is just the previous build.
