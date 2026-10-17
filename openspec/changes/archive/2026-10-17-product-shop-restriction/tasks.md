# Tasks

Checks: `./mvnw test` (JDK 25) for the backend; `npm run build && npm test` in `src/main/webui` for the frontend.

## 1. Backend

- [x] 1.1 Add `src/main/resources/db/migration/V2__product_shop.sql` (`shop_id uuid references shop on delete set null`) and `Product.shop` (`@ManyToOne`, `shop_id`). Verify: the app starts with schema validation on; `MigrationTest` passes and V1 is unchanged.
- [x] 1.2 Add `setProductShop(id, shopId)` to `ProductGraphQLApi`, same shape and errors as `setProductCategory`. Verify: `ProductGraphQLApiTest` covers set, clear (null), unknown shop (shop kept), unknown product, `addProduct` returns a null shop, and `products { shop { name } }`.
- [x] 1.3 Check deleting a shop frees its products. Verify: a `ShopGraphQLApiTest` test restricts a product to a shop, deletes the shop, and sees the product with a null shop.
- [x] 1.4 Refresh the schema snapshot. Verify: `SchemaSnapshotTest` passes on the second run and `src/main/webui/schema.graphql` shows `shop: Shop` on `Product` and `setProductShop`.

## 2. Frontend

- [x] 2.1 `basket.ts`: `Item.shopId`; `orderFor` leaves out unbought items for other shops; `hiddenFor` counts them. Verify: `basket.spec.ts` covers no shop, same shop, other shop, and Bought unchanged.
- [x] 2.2 `ItemTile`: `longPress` output (500 ms pointer timer, swallow the following click, `contextmenu`), plus `-webkit-touch-callout: none; user-select: none`. Verify: a spec with fake timers checks a long press emits `longPress` and not `press`, and a quick double tap still emits `press`.
- [x] 2.3 `ProductPopup` (`src/app/basket/product-popup`): native `<dialog>` with name, category state, shop `<select>` ("Any shop" first), close button; no dropdown while the id is a local `n…` id. Verify: spec checks "Any shop" is selected for an item without a shop, picking a shop emits its id, picking "Any shop" emits null.
- [x] 2.4 `GroceryScreen`: open the popup on `longPress` from either grid, apply `shopChange` to local state and re-emit it, show "N more for other shops" under the To-buy heading. Verify: `grocery-screen.spec.ts` covers the hidden count, switching to the product's shop showing it, and a popup change hiding the tile.
- [x] 2.5 `Grocery` page: `shop { id }` in the `Grocery` query, `SetProductShop` mutation in `grocery.graphql`, map `shopId`, call the mutation on `shopChange`. Verify: `grocery.spec.ts` checks `setProductShop` is sent with the product id and the shop id (and null for "Any shop").

- [x] 2.6 "All shops" first in the header dropdown: no shop filter, sorted by name, no hidden count; the screen still opens on the first shop. Verify: `basket.spec.ts` and `grocery-screen.spec.ts` cover selecting All shops and back.

## 3. Wrap-up

- [x] 3.1 Run `openspec validate product-shop-restriction --strict`, the backend tests and the frontend checks; check at phone width that a long press opens the popup without iOS/Android text selection or a stray buy. Verify: all green.
