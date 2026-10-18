# Tasks

## 1. Chain clients and catalog (backend)

- [x] 1.1 Add `ChainHttp` (JDK HttpClient, 5 s timeouts, JSON GET/POST, non-2xx throws), `Chain`, `ChainProduct`, `Sale`, `ProductLink`, the `ChainClient` interface; add `restok.catalog.*-url` defaults to `application.yaml` and WireMock URLs under `%test`; verify `./mvnw -q compile` succeeds
- [x] 1.2 Add fixtures in `src/test/resources/catalog/`, trimmed from the live answers of 2026-10-18: Migros (search, cards, cards on sale), Coop (search, detail on sale), Aldi (search, detail on sale), Lidl (campaign groups, campaign)
- [x] 1.3 Implement `MigrosClient`, `CoopClient`, `AldiClient` and `LidlClient`; verify with `ChainParsersTest` (fixed dates) and `CatalogGraphQLApiTest` (WireMock): each chain's search is parsed (name, price, quantity, url), each chain's sale is parsed (label, price, regular price, end date or null), the Migros token is refreshed once on a 401, Migros expired promotion → no sale, a Lidl code not in the leaflet → omitted
- [x] 1.4 Implement `Catalog` (1 h cache, failures not cached, per-chain isolation); verify in `CatalogGraphQLApiTest`: a second `products` call within the hour hits WireMock once, a 5xx throws for search and is not cached, one failing chain leaves the others resolved

## 2. GraphQL API and storage

- [x] 2.1 Add Flyway `V3__product_link.sql` and `Product.codes`; verify `MigrationTest` and the schema validation pass
- [x] 2.2 Add `setProductLink(id, chain, code)` to `ProductGraphQLApi`; verify in `CatalogGraphQLApiTest`: link, relink to the same chain, unlink, unknown product error
- [x] 2.3 Add `CatalogGraphQLApi` (`chainSearch` and the batched `links`); verify with `CatalogGraphQLApiTest` (WireMock): search, blank query without a call, linked product details in chain order, one `product-cards` call for two linked Migros products, Migros 5xx → `products` succeeds with the link kept and a null `product`
- [x] 2.4 Run `SchemaSnapshotTest`, keep the updated `src/main/webui/schema.graphql`, and verify `./mvnw verify` passes (JAVA_HOME on JDK 25)

## 3. Frontend data

- [x] 3.1 Extend `grocery.graphql` (`links`, `ChainSearch`, `SetProductLink`); add `ChainProduct`, `ProductLink`, `CHAINS`, `Item.links` and `firstSale` to `basket.ts`; map them in `Grocery.items`; verify `npm run codegen` and the type check succeed, and `basket.spec.ts` covers `firstSale`
- [x] 3.2 In `Grocery`, add `searchChain` and `setProductLink`; pass them through `GroceryScreen` to `ProductPopup`; verify in `grocery.spec.ts` that `ChainSearch` and `SetProductLink` send the right variables

## 4. Frontend UI

- [x] 4.1 Add the `ProductPopup` "Prices" section (link rows with details, sale line and Unlink; unavailable link; chain picker and search; results; "<Chain> is unavailable"); verify `product-popup.spec.ts` covers each state and emits `linkChange`
- [x] 4.2 Add the `ItemTile` `sale` badge and label, wired from `GroceryScreen`; verify in `item-tile.spec.ts`: badge and label on a To-buy tile, none on a Bought tile, none without a sale
- [x] 4.3 Run `npm test` in `src/main/webui` and verify the whole suite passes

## 5. Integration check

- [ ] 5.1 Run `./mvnw quarkus:dev`, link "lait" at Migros, Coop and Aldi and a leaflet item at Lidl, and verify the prices show; link a product on sale and verify the badge and the sale line

## Workflow follow-up

- Archive the change once implemented and reviewed (`/opsx:archive`).
