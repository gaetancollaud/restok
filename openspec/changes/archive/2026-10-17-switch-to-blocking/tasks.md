# Tasks

Backend checks: `./mvnw test` (with `JAVA_HOME` on JDK 25).

## 1. Dependencies and persistence

- [x] 1.1 In `pom.xml`, replace `quarkus-hibernate-reactive-panache` with `quarkus-hibernate-orm-panache` and remove `quarkus-reactive-pg-client`. Verify: no `io.smallrye.mutiny` or `hibernate.reactive` import is left in `src/main`.
- [x] 1.2 Rewrite the repositories (`ProductCategoryRepository`, `ShopRepository`, `ShopCategoryRepository`, `ProductRepository`) on Hibernate ORM Panache, returning plain types. Verify: compiles.

## 2. GraphQL and AI

- [x] 2.1 Rewrite `CategoryGraphQLApi`, `ShopGraphQLApi`, `ProductGraphQLApi` with plain return types, `@Transactional` writes, thrown `GraphQLException`s and `deleteById`. Verify: the category, shop and product API tests pass unchanged.
- [x] 2.2 Make `AiChat.chat` and `ai.ProductClassifier.classify` return `String`. Switch the WireMock stubs in `AiChatTest`, `AiChatLoggingTest` and `ProductClassifierTest` from SSE to JSON completions, and remove the I/O-thread AI test. Verify: AI tests pass, including timeout, 503, and no API key in logs.
- [x] 2.3 Rewrite `ClassificationConsumer` as a blocking `@ConsumeEvent` with two `QuarkusTransaction.requiringNew()` blocks around the AI call; `addProduct` commits then sends the event. Verify: `ProductClassifierTest` passes, including the manual-choice-wins case.

## 3. Config, docs, tests

- [x] 3.1 `application.yaml`: drop `datasource.jdbc.max-size` and the test `vertx.max-event-loop-execute-time`; update the datasource comment. Remove `QUARKUS_DATASOURCE_REACTIVE_URL` from `docker-compose.yml`, the Kustomize example overlay and the README; replace the README "Reactive only" section with "Blocking only". Verify: `grep -ri reactive` finds only the README rule.
- [x] 3.2 Delete `NonBlockingTest`; drop the reactive URL from `DatabaseDownTest`; `MigrationTest` expects the "Database connections" readiness check. Verify: `./mvnw test` is green.
- [x] 3.3 Run `openspec validate switch-to-blocking --strict`. Verify: no errors.

## Workflow follow-up

- Archive `shopping-domain` first, then this change.
