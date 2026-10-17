# Tasks

Checks: `./mvnw test` (JDK 25) for the backend; `npm run build && npm test` in `src/main/webui` for the frontend.

## 1. Backend

- [x] 1.1 Make `shop.latitude`/`longitude` nullable with `check ((latitude is null) = (longitude is null))` in `V1__shopping_domain.sql`; `Shop` fields become `Double`; `addShop`/`updateShop` take optional coordinates and reject only one. Verify: `ShopGraphQLApiTest` adds a shop without location and rejects half a location; schema snapshot refreshed.

## 2. Frontend

- [x] 2.1 `danger`/`on-danger` tokens. `GroceryScreen`: selected shop as a `model`, square edit button beside the dropdown emitting `editShops`. Verify: existing specs pass; a spec clicks the edit button.
- [x] 2.2 `CategoryList` (`src/app/basket/category-list`): grip drag with pointer events, arrow keys, × remove, empty text. Verify: spec covers arrow keys, removal and a pointer drag.
- [x] 2.3 `ShopEditor` (`src/app/basket/shop-editor`): back button, shop chips + "New shop", Name field, aisle order, Add a category bar (ignores duplicates), Delete shop with a 4 s second-tap confirm. Verify: spec covers select, rename, add category, delete confirm.
- [x] 2.4 Grocery page: both panels mounted, one shown; `categories` in the `Grocery` query; shop and order edits call the mutations (creating missing categories) and refetch. Verify: spec covers opening Shops, a reorder → `setShopCategoryOrder`, a new category → `addCategory` then order, new shop → `addShop`.
- [x] 2.5 To-buy tiles need a double tap. Verify: spec checks a single tap does nothing.

## 3. Wrap-up

- [x] 3.1 Run `openspec validate shop-editor --strict`, the backend tests and the frontend checks; visual check of both panels at phone width. Verify: all green.
