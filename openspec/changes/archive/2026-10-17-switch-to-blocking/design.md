# Design

## Context

After `shopping-domain`, every repository and GraphQL resolver returns `Uni`, the AI services return `Multi<String>`, and the classifier hops back to its Vert.x context (`emitOn`) before touching Hibernate Reactive. See proposal.md for the motivation.

## Goals / Non-Goals

**Goals:**
- No Mutiny, no Hibernate Reactive, no reactive clients in main sources.
- Same GraphQL schema and behavior; existing API tests pass unchanged.

**Non-Goals:**
- Virtual threads. Worker threads are enough for a personal shopping list.
- Replacing the event bus with a job queue (still the upgrade path from `shopping-domain`).

## Decisions

### Hibernate ORM Panache over JDBC
Repositories implement `io.quarkus.hibernate.orm.panache.PanacheRepositoryBase` and return `List`/entities. Queries are unchanged. Reads run without a transaction on the request-scoped session; writes use `@Transactional`. `GraphQLException` is checked and thrown directly; every validation happens before the first write, so the no-rollback-on-checked-exception rule of `@Transactional` does not matter. Deletes go back to `deleteById` (the bulk-delete workaround was only for HR000069). The JDBC pool uses Quarkus defaults now that it serves the app, not only Flyway.

### GraphQL on worker threads
SmallRye GraphQL runs operations that return non-reactive types on worker threads, so no `@Blocking` is needed. The batched `@Source List<Shop>` resolver stays.

### Blocking AI services
`AiChat.chat` and `ProductClassifier.classify` return `String`; langchain4j then uses the non-streaming chat model. Callers must not run on an I/O thread, which holds for GraphQL (worker threads) and the classifier (blocking consumer).

### Classification consumer
`addProduct` commits with `QuarkusTransaction.requiringNew().run(...)`, then sends the id on the event bus (`io.vertx.core.eventbus.EventBus`), so the consumer always sees the row. The consumer is `@ConsumeEvent(value = "product.classify", blocking = true)`, a plain `void` method on a worker thread. It runs `QuarkusTransaction.requiringNew()` twice: once to load the product and categories, once for the conditional `... where classification = PENDING` update. The AI call happens between them, so no DB connection is held while waiting for the model.

Alternative: a CDI `@Observes(during = AFTER_SUCCESS)` observer plus an executor. Rejected: more moving parts than a blocking event-bus consumer, which Quarkus already provides.

## Risks / Trade-offs

- [Each in-flight AI call holds a worker thread for up to the AI timeout (60 s)] → Fine for a personal list. If many products are added at once, cap concurrency (`@ConsumeEvent(ordered = true)`) or move to virtual threads.
- [Deployments still setting `QUARKUS_DATASOURCE_REACTIVE_URL` and not the JDBC URL] → The app has never been deployed; the README and example overlay now list only the JDBC URL.
