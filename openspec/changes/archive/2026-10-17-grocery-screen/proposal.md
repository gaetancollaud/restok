# Proposal

## Why

The List, Shops and Categories pages were a test UI. The app should open straight on the Basket design: one screen built for one-handed use in a shop aisle, with big square tiles, a shop dropdown and an add bar.

## What Changes

- The SPA becomes a single screen, `GroceryScreen`: shop dropdown on top, a To-buy grid sorted in the selected shop's category order, a Bought grid (most recently bought first) and an add bar.
- Every tile shows its classification state as a dot (orange ring pending, green classified, red unclassified), also named in its accessible label.
- Tapping a To-buy tile marks the product bought; tapping a Bought tile puts it back. Adding a name that already exists (ignoring case) revives it instead of creating a duplicate.
- **BREAKING (UI)**: the List, Shops and Categories pages, the nav and the Angular router are removed. Shops, category orders and categories stay available through the GraphQL API only.
- Products record when they were bought: a nullable `boughtAt` timestamp, set by `setProductBought(true)` and cleared by `setProductBought(false)`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `shopping-list`: `products` returns `boughtAt`; marking bought records the time; the list page requirement is replaced by the grocery screen.
- `shops`: the shops page requirement is removed.
- `product-categories`: the categories page requirement is removed.

## Impact

- **Database**: `V1__shopping_domain.sql` gains `product.bought_at timestamptz`, consistent with `bought` through a check constraint. V1 has never been deployed, so it is edited in place.
- **GraphQL**: `Product.boughtAt` (DateTime, nullable). The schema snapshot changes.
- **Frontend**: `src/app/list`, `shops`, `categories` and `app.routes.ts` are deleted; a `grocery` page feeds the Basket components (`src/app/basket`) from GraphQL. Design tokens and the Atkinson Hyperlegible font are global.
- **Tests**: page specs for the old pages are replaced by a grocery page spec; the backend bought test also checks `boughtAt`.
