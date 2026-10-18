# Proposal

## Why

A product can only be marked bought, so a typo or something that will never be bought again stays in the Bought grid forever. The backend already has `deleteProduct`, but the screen offers no way to call it.

## What Changes

- The product popup (long press or context menu on a tile) gets a "Delete product" button.
- Deleting asks for a second tap within 4 s ("Tap again to delete <name>"), the same pattern as deleting a shop.
- On the second tap the product leaves the screen at once, the popup closes, and `deleteProduct` removes it from the database.
- No backend change: `deleteProduct(id)` exists and is tested (`ProductGraphQLApiTest.deleteRemoves`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `shopping-list`: adds a requirement for deleting a product from the product popup.

## Impact

- Frontend: `product-popup` (button and two-tap confirm), `grocery-screen` (drop the item locally, new output), `grocery` (call the mutation), `grocery.graphql` (new `DeleteProduct` mutation, regenerated `generated.ts`).
- Tests: `product-popup.spec.ts`, `grocery-screen.spec.ts`.
- API, database and dependencies: unchanged.
