# Design

## Context

- `product` has `category_id` (FK, `on delete set null`); `Product` maps it as an eager `@ManyToOne`. `Shop` has no collections, so an eager `Product.shop` serializes safely after the session closes.
- The SPA loads all products once (`Grocery` query, no `shopId`) and sorts To buy client-side in `orderFor` (`basket.ts`). Filtering belongs there too.
- `ItemTile` already owns its tap handling (own double-tap, no `dblclick`). Long press fits there.
- V1 migration is applied; the `database-migrations` spec forbids editing it.

## Goals / Non-Goals

**Goals:** one optional shop per product, settable from a long-press popup, hiding the product from To buy at other shops.

**Non-Goals:**
- Several allowed shops per product. One FK column; a join table when someone needs "Lidl or Aldi".
- Filtering in the server `products(shopId)` query. The SPA doesn't use it; it stays a pure sort.
- Editing name or category in the popup. It shows them; editing comes later if asked.

## Decisions

- **Schema:** `V2__product_shop.sql`: `alter table product add column shop_id uuid references shop on delete set null`. The FK does the "deleting a shop frees its products" rule, so `deleteShop` needs no code. Rejected: editing V1 (checksum mismatch on existing databases).
- **API:** `Product.shop` (`@ManyToOne @JoinColumn(name = "shop_id")`, nullable) and `setProductShop(id, shopId)` next to `setProductCategory`, same shape and errors. The explicit `@Mutation("setProductShop")` name is needed, as for the other `set*` mutations.
- **Filter:** `Item.shopId?: string`. `orderFor` drops unbought items whose `shopId` is set and differs from the selected shop. A small `hiddenFor(items, shop)` count feeds the "N more for other shops" line under the To-buy heading. `boughtList` is unchanged.
- **Long press:** in `ItemTile`, `pointerdown` starts a 500 ms timer; `pointerup`, `pointercancel` and `pointerleave` clear it. When it fires, emit `longPress` and swallow the next `click`, so it never counts as a tap. `contextmenu` also emits `longPress` (with `preventDefault`): this covers right click and the menu key, and Android Chrome's own long press. Opening twice is harmless (it just sets the selected item). CSS `-webkit-touch-callout: none` and `user-select: none` on the tile stop iOS's text callout. Rejected: a gesture library (new dependency for ~20 lines).
- **Popup:** new `ProductPopup` (`src/app/basket/product-popup`) on a native `<dialog>` opened with `showModal()`: Escape, focus trap and backdrop for free. Inputs: `item`, `shops`. Outputs: `shopChange` (shop id or null), `closed`. A plain `<select>` with "Any shop" (value `''`) first; `ShopSelect` has no empty option and isn't worth bending.
- **Wiring:** `GroceryScreen` keeps `selected = signal<Item | null>`, updates its local `state` at once on `shopChange` (as `setBought` does), and re-emits `shopChange { id, shopId }`. `Grocery` maps `p.shop?.id` into `Item.shopId`, adds `shop { id }` to the query, and calls a new `SetProductShop` mutation whose response (`id shop { id }`) updates the Apollo cache.

## Risks / Trade-offs

- [Long press on a tile just added, still holding its local `n…` id] → the save would fail with "product not found". The popup hides the dropdown while the id starts with `n`; the refetch after `addProduct` replaces it within a moment.
- [Scrolling starts on a tile] → the browser fires `pointercancel` when it takes over the touch, which clears the timer.
- [Restricted product forgotten] → the "N more for other shops" line keeps hidden items visible as a count.

## Migration Plan

V2 runs at startup like V1 (Flyway, safe with replicas). Existing products get a null shop, i.e. buyable anywhere. Rollback: the old build ignores the extra nullable column (Hibernate validation only checks mapped columns, and Flyway ignores future migrations by default).
