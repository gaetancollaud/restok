# Proposal

## Why

The repository is empty. Every future feature needs the same foundation: a reactive backend, a database with versioned migrations, a typed API to the frontend, a native container image delivered by CI to Kubernetes, observability, and access to LLMs via OpenRouter. Building this once, with one minimal end-to-end slice proving every layer works, lets later changes focus on business features only.

## What Changes

- New Quarkus 3.40 backend on Java 25 (Maven) at the repository root, fully reactive: no blocking code in request handling.
- PostgreSQL as the only datastore, accessed reactively through Panache repositories; schema managed exclusively by Flyway migrations applied at startup.
- GraphQL API, code-first: the schema is generated from Quarkus (SmallRye GraphQL) and is the single source of truth for the frontend's typed client. No REST API; only health endpoints besides GraphQL.
- Angular SPA in `src/main/webui`, built by Maven through Quarkus Quinoa and served by Quarkus from the same origin. One container image.
- Native executable as the release artifact; JVM mode for development and tests.
- One minimal slice: an `Item` (name only) listed and added through GraphQL from an Angular page. Real entities come in later changes.
- OpenRouter client (OpenAI-compatible, streaming) configured and tested, not exposed through the API yet.
- Cloud readiness: health probes, environment-driven configuration, JSON logs, graceful shutdown, OpenTelemetry metrics over OTLP.
- Kubernetes manifests as a Kustomize base plus an example overlay.
- GitHub Actions CI: tests, native build and native integration tests, image pushed to GitHub Container Registry (`ghcr.io`).

Out of scope: authentication and authorization (no OIDC for now), business entities beyond `Item`, Helm, deployment automation to a cluster (CD), log/trace backends.

## Capabilities

### New Capabilities
- `graphql-api`: The GraphQL endpoint, schema generation from backend code, non-blocking request handling, and the typed contract consumed by the frontend.
- `items`: Minimal item list (name only) used as the first end-to-end slice.
- `database-migrations`: How the database schema is created and evolved through Flyway.
- `web-frontend`: How the Angular SPA is built, served, and developed.
- `ai-completion`: Access to LLM chat completions through OpenRouter.
- `cloud-runtime`: Native container image, Kustomize manifests, health probes, configuration, logging, metrics, and shutdown behavior.
- `ci-delivery`: GitHub Actions pipeline that tests, builds the native image, and publishes it to GitHub Container Registry.

### Modified Capabilities
- None (no existing specs).

## Impact

- New code: `pom.xml`, `src/main/java/**`, `src/main/resources/**` (incl. `db/migration`), `src/main/webui/**` (Angular workspace), `src/test/**` (incl. `*IT` native integration tests), `deploy/**` (Kustomize), `.github/workflows/**`.
- New dependencies: Quarkus extensions (smallrye-graphql, hibernate-reactive-panache, reactive-pg-client, jdbc-postgresql + flyway for migrations only, smallrye-health, opentelemetry, logging-json, container-image-jib, quinoa, langchain4j-openai); Angular, Apollo Angular, GraphQL Code Generator.
- External systems: PostgreSQL, OpenRouter (API key as a Kubernetes Secret), an OTLP collector, GitHub Container Registry.
- Toolchain: JDK 25 (local machine currently has 21), Quarkus CLI 3.40; Docker or Podman for Dev Services and the native builder container.
