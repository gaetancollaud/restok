# Design

## Context

- `shop_category_order(shop_id, category_id, position)` holds each shop's order. Positions may have gaps; only their order matters (`ShopCategory`).
- `addCategory` runs in one `@Transactional` method and persists the category after `validName`.
- The SPA's Shops panel adds a category with `addCategory`, then saves the selected shop's full order with `setShopCategoryOrder`, the new one last. That replaces the shop's rows with the same order, so the panel needs no change.

## Goals / Non-Goals

**Non-Goals:**
- Backfilling existing categories that some shops lack. It's a one-off; the Shops panel already does it per shop.
- A per-shop "don't add new categories here" option.

## Decisions

- **One insert-select:** `ShopCategoryRepository.appendToAllShops(ProductCategory)` runs a single native statement: `insert into shop_category_order (shop_id, category_id, position) select s.id, :category, coalesce((select max(o.position) + 1 from shop_category_order o where o.shop_id = s.id), 0) from shop s`. One round trip whatever the number of shops, and an empty order gets position 0. Rejected: loading each shop's order and persisting rows (N queries for no gain).
- **Called from `addCategory`:** after `repository.persist(category)` plus a `flush()`, so the category row exists before the native insert references it. Same transaction, so a failure rolls back both. The `category` package then depends on `shop`, which already depends on `category`. Acceptable in one module; a CDI event would be indirection for one caller.
- **Validation first:** `validName` throws before anything is written, so a rejected name touches no order.

## Risks / Trade-offs

- [A shop is created concurrently with `addCategory`] → it may miss the category. It starts with an empty order anyway, and the user can add the category from the Shops panel.
- [Users who don't want a category in some shop] → they remove it there with ×, which only affects that shop.

## Migration Plan

No schema change. Deploying changes only what future `addCategory` calls do. Rollback: the previous build.
