# Proposal

## Why

Shops and their category order can only be changed through the GraphQL API. The updated Basket design adds a Shops panel so they can be edited in the app, next to the list.

## What Changes

- A square edit button beside the shop dropdown opens a **Shops** panel; a back button returns to the list on the same shop. Both panels stay mounted.
- The Shops panel (`ShopEditor`): shop chips with a "New shop" chip, the shop's Name field, the shop's aisle order as a `CategoryList` (drag by the grip or arrow keys to reorder, × to remove), an add bar that appends a category, and a Delete shop button that asks for a second tap.
- Every edit is saved right away through the existing GraphQL mutations; the list follows the new order.
- Adding a category name that does not exist yet creates the category, then appends it to the shop's order.
- Shop coordinates become optional (both or neither), because the panel creates shops without a location.
- To-buy tiles need a double tap to mark a product bought, so a stray tap in the aisle doesn't move it.

## Capabilities

### New Capabilities

### Modified Capabilities
- `shops`: latitude and longitude are optional; new requirements for the Shops panel and editing the aisle order in the SPA.
- `shopping-list`: marking a To-buy product bought takes a double tap.

## Impact

- **Database**: `shop.latitude` and `shop.longitude` become nullable, with a check that both or neither are set. V1 has never been deployed, so it is edited in place.
- **GraphQL**: `addShop` and `updateShop` take nullable `latitude`/`longitude`; `Shop.latitude`/`longitude` are nullable. The schema snapshot changes.
- **Frontend**: new `CategoryList` and `ShopEditor` components, an edit button and a controlled selected shop in `GroceryScreen`, `danger`/`on-danger` tokens; the grocery page switches panels and calls the shop and category mutations.
