# Tasks

Checks: `./mvnw test` with JDK 25 (`JAVA_HOME` set to 25.0.3-tem).

## 1. Backend

- [x] 1.1 Add `ShopCategoryRepository.appendToAllShops(ProductCategory)` (one native insert-select, position = shop's max + 1, or 0 when empty) and call it from `CategoryGraphQLApi.addCategory` after persisting and flushing the category. Verify: new `CategoryGraphQLApiTest` tests cover a shop with an order and a shop with an empty order both getting the category last, a rejected duplicate name leaving all orders unchanged, and a shop added afterwards starting empty.
- [x] 1.2 Re-check the existing tests that add a category while shops exist (`ProductGraphQLApiTest` around line 183, `ShopGraphQLApiTest` around line 190) and adjust their expectations only if they assert a shop's full order. Verify: `./mvnw test` passes.

## 2. Wrap-up

- [x] 2.1 Run `openspec validate add-category-to-all-shops --strict` and the frontend tests (`npm test` in `src/main/webui`, unchanged code, to confirm the Shops panel flow still holds). Verify: all green.
