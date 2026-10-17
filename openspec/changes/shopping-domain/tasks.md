# Tasks

Backend checks: `./mvnw test` (it also refreshes `src/main/webui/schema.graphql`; commit the file and re-run when `SchemaSnapshotTest` reports a change). Frontend checks: `npm run build && npm test` in `src/main/webui` (codegen runs first, so an operation that does not match the schema fails the build).

## 1. Schema, item removal, categories

- [x] 1.1 Replace `src/main/resources/db/migration/V1__item.sql` with `V1__shopping_domain.sql` as in design.md (remove the old file): create `product_category` (unique index on `lower(name)`), `shop` (lat/lon checks), `shop_category_order` (PK shop_id+category_id, cascade FKs), `product` (`category_id` on delete set null, classification check). Seed Fruits, Légumes, Pain, Fromage, Produits laitiers, Viande, Poisson, Boissons, Surgelés, Ménage. Verify: `MigrationTest` still asserts V1 is applied exactly once and also checks that the seeded names are present.
- [x] 1.2 Delete `src/main/java/.../item/` and `ItemGraphQLApiTest`. Verify: `grep -r "item\." src/main/java src/test/java` finds no references.
- [x] 1.3 Add package `category`: `ProductCategory` entity (UUID id, name), repository, and `CategoryGraphQLApi` with `categories`, `addCategory`, `renameCategory`, `deleteCategory`. Trim names, reject blank or case-insensitive duplicate names, reject unknown ids, delete returns the id. Verify: `CategoryGraphQLApiTest` covers sorted list, defaults present, add/trim, blank, duplicate ("fruits" vs "Fruits"), rename keeps id, unknown id, delete.
- [x] 1.4 Switch `NonBlockingTest` to the category operations (add with unique names + list). Verify: `./mvnw test` is green, and the regenerated `schema.graphql` no longer has `Item` and has the category operations.
- [x] 1.5 Frontend: delete `src/app/items/`. Add `src/app/categories/` (component + `categories.graphql`) with list, add, rename, delete, and an error `role="alert"`. Add a nav to `app.ts`, and in `app.routes.ts` add `categories` with the default redirect to it. Verify: `npm run build && npm test` pass, with a component spec that renders the list from a mocked query.

## 2. Shops and category order

- [x] 2.1 Add package `shop`: `Shop` entity (UUID id, name, latitude, longitude), `ShopCategory` entity mapping `shop_category_order` (composite key, `position`), and repositories. Verify: `./mvnw test` starts (Hibernate schema validation passes).
- [x] 2.2 Add `ShopGraphQLApi` with `shops` (sorted by name), `addShop`, `updateShop`, `deleteShop`, and validation (blank name, lat outside -90..90, lon outside -180..180, unknown id). Verify: `ShopGraphQLApiTest` covers each spec scenario for list/add/validation/update/delete.
- [x] 2.3 Add the `categoryOrder` `@Source` field resolver and `setShopCategoryOrder(shopId, categoryIds)`: in one transaction, delete the old rows and insert the new list with positions 0..n-1. Reject duplicates, unknown categories, and an unknown shop, keeping the old order. Verify: `ShopGraphQLApiTest` covers set order, per-shop orders, duplicate rejected with order unchanged, deleting a shop keeps the categories, and `deleteCategory` removing the category from a shop's order.
- [x] 2.4 Add the shop operations to `NonBlockingTest`. Verify: `./mvnw test` is green and the schema snapshot is committed.
- [x] 2.5 Frontend `src/app/shops/` (component + `shops.graphql`): list, add/edit (name, `<input type="number" step="any">` lat/lon), delete, and a category-order editor (add from a category select, remove, up/down buttons, save via `setShopCategoryOrder`). Add a route and nav link. Verify: `npm run build && npm test` pass, with a spec checking that "up" swaps two categories before save.

## 3. Products (without AI)

- [x] 3.1 Add package `product`: `ProductClassification` enum (`PENDING`, `CLASSIFIED`, `UNCLASSIFIED`, `@Enumerated(STRING)`), `Product` entity (UUID id, name, bought, `@ManyToOne` category nullable, classification), and a repository with `listByName()` and `listForShop(shopId)` using the HQL in design.md. Verify: `./mvnw test` starts (schema validation passes).
- [x] 3.2 Add `ProductGraphQLApi`: `products(shopId: String)` (unknown shop → error), `addProduct` (trim, blank → error, `bought` false, `PENDING`), `setProductBought`, `setProductCategory` (null clears; set → `CLASSIFIED`, clear → `UNCLASSIFIED`; unknown product or category → error), `deleteProduct`. Verify: `ProductGraphQLApiTest` covers sorted list, empty list, both shop-order scenarios from the spec (baguette/apple/feta/foo), add/blank, bought true then false, set/clear category, unknown ids, delete, and `deleteCategory` leaving a product uncategorized.
- [x] 3.3 Add the product operations (`addProduct`, `products` with and without `shopId`, `setProductBought`, `setProductCategory`, `deleteProduct`) to `NonBlockingTest`. Verify: `./mvnw test` is green and the schema snapshot is committed.
- [x] 3.4 Frontend `src/app/list/` (component + `list.graphql`): a shop `<select>` (empty option = sorted by name) passed as `shopId`, an add form, a bought checkbox, a category `<select>` (empty option = none), delete, and the category name or "pending" per product. Make `list` the default route and add a nav link. Verify: `npm run build && npm test` pass, with a spec checking that changing the shop re-queries with that `shopId`.

## 4. Background AI classification

- [x] 4.1 Make `addProduct` persist inside an explicit `Panache.withTransaction(...)`, then (after the commit) `eventBus.send("product.classify", id.toString())`. Verify: the existing `ProductGraphQLApiTest` add tests still pass and `addProduct` still returns `PENDING`.
- [x] 4.2 Add `product.ClassificationConsumer` with `@ConsumeEvent("product.classify")` returning `Uni<Void>`: load the product and the category names, call the French `ai.ProductClassifier` AI service (`@SystemMessage` with the category list and "…ou par AUCUNE", `@UserMessage` "Produit : {product}"), collect the answer, and match it trimmed and ignoring case. Then run the conditional update `... where id = :id and classification = PENDING` (match → category + `CLASSIFIED`, otherwise `UNCLASSIFIED`). On any failure, recover to `UNCLASSIFIED` the same way. Verify: `ProductClassifierTest` (`@ConnectWireMock`, SSE stub as in `AiChatTest`, poll `products` up to 5 s) covers: answer "fruits" → Fruits/`CLASSIFIED`; unknown answer → `UNCLASSIFIED`; HTTP 503 → `UNCLASSIFIED` with `addProduct` succeeding and readiness UP; the prompt sent contains the product name and the category names.
- [x] 4.3 Manual choice wins: a WireMock stub with `withFixedDelay`. Call `setProductCategory` while the product is `PENDING`, then wait past the delay. Verify: a `ProductClassifierTest` case shows the manual category kept.
- [x] 4.4 Make sure the other test classes are not affected by classification events (WireMock unstubbed → `UNCLASSIFIED`; tests that check categories set them by hand). Verify: `./mvnw test` is green across three consecutive runs (no flaky ordering).
- [x] 4.5 Frontend list page: `startPolling(2000)` while any product is `PENDING`, `stopPolling()` otherwise. Verify: `npm test`, with a spec checking that polling starts when a pending product is present and stops when none are.

## 5. Integration

- [x] 5.1 Full package build `./mvnw package` (it builds the SPA through Quinoa). Verify: the build succeeds and the generated client has no `Item` types.
- [ ] 5.2 Smoke test in `./mvnw quarkus:dev` with a real `OPENROUTER_API_KEY`: add "apple", "baguette", "feta", "batteries". Create two shops with opposite Pain/Fruits orders and switch between them. Verify: the categories appear without a reload, the order changes per shop, and "batteries" ends uncategorized or in Ménage.
- [x] 5.3 Run `openspec validate shopping-domain --strict`. Verify: no errors.
- [x] 5.4 Split every Angular component (`app`, `list`, `shops`, `categories`) into `.ts`, `.html` (`templateUrl`) and `.css` (`styleUrl`). Verify: no inline `template`/`styles` remain, and `npm run build && npm test` pass.
- [x] 5.5 Seed the default categories in French (Fruits, Légumes, Pain, Fromage, Produits laitiers, Viande, Poisson, Boissons, Surgelés, Ménage) and update the tests and spec scenarios. Verify: `./mvnw test` passes.
- [x] 5.6 Replace `application.properties` with `application.yaml` (`quarkus-config-yaml`) and set `quarkus.observability.enabled: false`. Verify: `./mvnw test` passes and `./mvnw quarkus:dev` starts only the PostgreSQL container.
- [x] 5.7 Move the prompt into `ai.ProductClassifier` (`@RegisterAiService`, French `@SystemMessage`/`@UserMessage`); rename the event consumer to `product.ClassificationConsumer`. Verify: `ProductClassifierTest` passes and checks the request contains "Produit : apple".

## Workflow follow-up

- Archive the change with `/opsx:archive` after review, so the `shops`, `product-categories`, and `shopping-list` specs are created and the `items` spec loses its requirements.
