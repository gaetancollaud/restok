# Design

## Context

See proposal.md for motivation. Observed today:

- Backend already has `renameCategory`, `deleteCategory` (FK `on delete cascade` drops it from every `shop_category_order`, `on delete set null` uncategorizes products) and `addCategory` appending to every shop (`ShopCategoryRepository.appendToAllShops`).
- Gaps: `addShop` stores an empty order; `setShopCategoryOrder` accepts a partial list; existing data (V1 seed, user edits) may have shops missing categories.
- Frontend: `CategoryList` works on unique names (`string[]`), × just filters the name out and the editor saves the shorter order. `ShopEditor.addCategory` appends the name and `Grocery.order()` creates unknown names before calling `setShopCategoryOrder`. No rename UI.

## Goals / Non-Goals

**Goals:**
- The invariant "every shop orders every category exactly once" holds after every mutation.
- Rename and global delete reachable from the Shops panel.

**Non-Goals:**
- A separate category management screen.
- Undo for deleting a category.
- DB-level enforcement of the invariant (triggers/constraints).

## Decisions

1. **Enforce in the API, not the DB.** `setShopCategoryOrder` rejects a list whose size differs from `categoryRepository.count()` (duplicates and unknown ids are already rejected, so equal size means a full permutation). Alternative: a deferred constraint trigger. Rejected: more SQL for a single-writer app.

2. **Seed on `addShop` with one native insert-select**, like `appendToAllShops`: `insert into shop_category_order select :shop, id, row_number() over (order by name) - 1 from product_category`. Lives in `ShopCategoryRepository.seed(Shop)`, called after `persist` + `flush`. The SPA still overwrites it with a copy of the selected shop's order, which is also a full list.

3. **Frontend keeps names as identity.** Category names are unique ignoring case, so the editor stays on `string[]`. `CategoryList` gets two outputs instead of mutating the list for removal:
   - `remove(name)` after a second tap on × within 4 s (one `confirming` name signal + timer, same pattern as `ShopEditor.deleteShop`).
   - `rename({ from, to })` when a row's name input fires `change`. The row name becomes an `<input>`; on change it emits and resets the field to the bound name, so the refetch after saving shows the real result, which handles rejected names too.
   `ShopEditor` forwards both, and adds an `addCategory(name)` output that replaces its current "append to order" logic. `Grocery` maps name → id from `categories` and calls `renameCategory` / `deleteCategory` / `addCategory`, then refetches via `save()`.

4. **Delete `Grocery.order()`'s create-missing-names path.** With adding done by `addCategory` directly and every order already full, `order()` only maps names to ids. Alternative: keep it for safety. Rejected: dead code.

## Risks / Trade-offs

- [Rename flicker: the field shows the old name until the refetch lands] → acceptable for a local single-user app; fix with an optimistic update if noticed.
- [A stale SPA tab sends a partial order after another tab added a category] → API rejects it, error shows, the next refetch heals the view. No data loss.
- [Deleting a category uncategorizes its products] → second-tap confirmation, as for shops.
- [`addShop` callers that relied on an empty order] → only the SPA and tests; `ShopGraphQLApiTest` expectation at line 90 changes.
- [A shop in an existing DB missing categories] → its order saves are rejected; fix the data by hand. No backfill migration: the V1 seed already orders every category in every shop.
