# Proposal

## Why

The list knows what to buy but not what it costs or whether it is on sale. Migros, Coop, Aldi and Lidl publish prices and weekly sales on their websites and apps. Seeing them next to the list helps decide what to buy and where. None of the four offers a public API, but the endpoints behind their sites and apps answer without login and return what is needed.

## What Changes

- A product in the list can be linked to one product per chain (Migros, Coop, Aldi, Lidl), picked from that chain's search in the product popup, and unlinked.
- For each link, the product popup shows the chain product's name, quantity and price, plus its description and page link when the chain has them. When the product is on sale, it also shows the sale label, sale price and last day, when the chain gives one.
- To-buy tiles of linked products on sale show a sale badge naming the chain.
- The backend talks to the chains (the browser can't because of CORS), caches answers for an hour, and keeps the list working when a chain is down or changes its API.
- Assumptions:
  - texts are in French;
  - prices are national in-store prices;
  - products without a link get no badge, because there is no name matching.
- Lidl limit: only products in the current Lidl leaflet can be found. A Lidl link shows "Not available right now" once the product leaves the leaflet.

## Capabilities

### New Capabilities

- `chain-catalog`: links list products to chain products, searches a chain, and shows price, description and current sale.

### Modified Capabilities

None. The popup and tiles gain the parts specified in `chain-catalog`. Existing `shopping-list` requirements keep their behavior.

## Impact

- Backend:
  - a new `catalog` package, with one client per chain on the JDK `HttpClient`, a shared cache, and the GraphQL API;
  - a `product_link` table, added by Flyway `V3`;
  - GraphQL schema additions: `chainSearch`, `setProductLink` and `Product.links`;
  - base URLs in `application.yaml`;
  - WireMock tests.
- Frontend:
  - `grocery.graphql`, with `generated.ts` regenerated;
  - the `Item` type in `basket.ts`;
  - the product popup (search and links);
  - the item tile (sale badge).
- External risks:
  - The endpoints are unofficial and undocumented, and may change without notice.
  - Coop (DataDome) and Aldi (Akamai) run bot protection that may start rejecting the backend.
  - The Lidl client presents itself as the Lidl Plus app.
  - Automated access may conflict with the chains' terms of use. That is acceptable for personal low-volume use, not for redistribution.
