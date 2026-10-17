# Proposal

## Why

restok is meant to manage a shopping list, but today it only has a placeholder `item` entity. We need the real domain: shops, product categories in a per-shop order, and products to buy. With these, the list can be sorted to match the aisle order of the shop you are in.

## What Changes

- Add **Shop**: a name plus a GPS location (latitude, longitude). Each shop keeps its own ordered list of product categories.
- Add **ProductCategory**: a named type of grocery (fruit, bread, cheese, …). Users manage categories, and a migration seeds common defaults.
- Add **Product**: one shopping-list entry with a name, a bought flag, and an optional category.
- Classify new products by AI in the background: after a product is created, the backend asks the model to pick one existing category. If there is no match or the call fails, the product stays without a category. The user can always set or clear the category by hand.
- List products sorted for a given shop, following that shop's category order. Products whose category the shop has not ordered, and products with no category, come last.
- All ids are UUIDs.
- Replace the SPA items page with basic pages for the shopping list, shops (including category order), and categories.
- **BREAKING**: remove the placeholder `item` entity, its table, the `items` query, the `addItem` mutation, and the items page.

## Capabilities

### New Capabilities
- `shops`: shops with a name and GPS location, and each shop's ordering of product categories.
- `product-categories`: user-managed grocery categories, seeded with defaults.
- `shopping-list`: products to buy, with a bought flag, an optional category, background AI classification, and listing sorted for a shop.

### Modified Capabilities
- `items`: all requirements removed. The placeholder entity is replaced by the shopping domain.

## Impact

- **Database**: `V1__item.sql` is replaced by `V1__shopping_domain.sql`, which creates `shop`, `product_category`, `shop_category_order`, and `product`, and seeds default categories. No upgrade migration is needed because V1 was never deployed. Local databases that already applied the old V1 must be reset.
- **GraphQL API**: new queries and mutations for shops, categories, and products. `items` and `addItem` are removed. The committed schema snapshot `src/main/webui/schema.graphql` changes.
- **Backend code**: new packages `shop`, `category`, `product`. The `item` package is deleted. A dedicated `ai.ProductClassifier` AI service (OpenRouter) classifies with a French prompt declared through Quarkus annotations. Configuration moves to `application.yaml`.
- **Frontend**: `src/main/webui/src/app/items` is replaced by list, shop, and category pages. Routes and navigation are updated.
- **Tests**: `ItemGraphQLApiTest` is replaced by tests for the new APIs. `NonBlockingTest` switches to the new operations. Classification is tested against the WireMock OpenRouter stub.
- **Dependencies**: `quarkus-config-yaml` (configuration moves to `application.yaml`).
