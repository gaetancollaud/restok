# Proposal

## Why

Some products are only worth buying at one shop (parmesan at Lidl). Today every product shows in To buy whatever shop is selected, so the user has to remember which items to skip.

## What Changes

- A product can be restricted to one shop, or to none (the default: buy anywhere).
- New GraphQL field `Product.shop` and mutation `setProductShop(id, shopId)`; a null `shopId` clears the restriction.
- The To-buy grid hides products restricted to another shop than the selected one, and says how many are hidden. The Bought grid still shows every bought product.
- Long-pressing a tile (or opening its context menu) opens a small product popup: name, category, and a shop dropdown with "Any shop" first. Changing the dropdown saves at once.
- Deleting a shop clears the restriction of its products, so they become buyable anywhere instead of disappearing.
- New database migration adding the product's shop.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: products gain an optional shop restriction (API field, mutation, persistence), the To-buy grid hides products for other shops, and a long-press popup edits the restriction.
- `shops`: deleting a shop now clears the restriction of products tied to it (previously "products SHALL NOT be affected").

## Impact

- Backend: `Product` entity, `ProductGraphQLApi`, new Flyway migration `V2`, `ProductGraphQLApiTest`, `ShopGraphQLApiTest`, schema snapshot `src/main/webui/schema.graphql`.
- Frontend: `basket.ts` (`Item.shopId`, `orderFor` filter), `ItemTile` (long press), new product popup component, `GroceryScreen`, `grocery.graphql`, `Grocery` page.
- No new dependencies. No breaking API change: the new field and argument are optional.
