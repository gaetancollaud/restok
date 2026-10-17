# Proposal

## Why

Reactive code (Mutiny `Uni`/`Multi`, Hibernate Reactive, event-loop context hops) made simple CRUD and the background classifier hard to write and debug: session-per-event-loop errors (HR000069, HR000068) and `emitOn` workarounds. The project drops the reactive-only rule and uses plain blocking code everywhere.

## What Changes

- Persistence moves from Hibernate Reactive Panache with the reactive PostgreSQL client to Hibernate ORM Panache over JDBC. **BREAKING** for deployments: `QUARKUS_DATASOURCE_REACTIVE_URL` is no longer read; `QUARKUS_DATASOURCE_JDBC_URL` is the app database.
- GraphQL resolvers return plain types, run on worker threads, and use `@Transactional` for writes.
- AI services return the full answer as a `String` (blocking call) instead of a `Multi<String>` stream.
- Background classification stays on the Vert.x event bus, with a blocking consumer and two short JTA transactions around the AI call.
- The "Reactive only" convention in the README becomes "Blocking only". `NonBlockingTest` is removed.

## Capabilities

### New Capabilities

### Modified Capabilities
- `graphql-api`: the non-blocking request handling requirement is removed.
- `ai-completion`: completions are returned to the caller as the full answer in one blocking call, not as a non-blocking stream; failures surface as an error from that call.

## Impact

- **Code**: all repositories, the three GraphQL APIs, `ai.AiChat`, `ai.ProductClassifier`, `product.ClassificationConsumer`. GraphQL schema unchanged.
- **Dependencies**: remove `quarkus-hibernate-reactive-panache` and `quarkus-reactive-pg-client`; add `quarkus-hibernate-orm-panache` (`quarkus-jdbc-postgresql` is already present).
- **Config and deploy**: `application.yaml` drops the JDBC pool cap (`max-size: 2`) and the test event-loop stall limit; `docker-compose.yml`, the Kustomize example overlay and the README drop `QUARKUS_DATASOURCE_REACTIVE_URL`.
- **Tests**: AI stubs switch from SSE to JSON completions; `NonBlockingTest` and the I/O-thread AI test are removed; the readiness check name changes to the JDBC "Database connections health check".
- **Ordering**: builds on `shopping-domain`; archive that change first.
