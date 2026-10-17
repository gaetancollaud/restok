# Design

## Context

Greenfield repository (README + OpenSpec only). Local toolchain today: JDK 21, Node 24, Maven, Quarkus CLI 3.39.1, Podman/Docker; the target is JDK 25 and Quarkus 3.40, so the toolchain must be upgraded first. Remote: `github.com/gaetancollaud/restok`. See proposal.md for motivation and specs/ for required behavior.

Decisions taken with the user: skeleton only; one image (Angular served by Quarkus); no authentication for now; fully reactive; Panache repository pattern; native image as release artifact; OpenTelemetry metrics; Kustomize; GitHub Actions; GHCR; OpenRouter client without an API entry point; a name-only `Item` as the end-to-end slice.

## Goals / Non-Goals

**Goals:**
- `./mvnw verify` yields a tested JVM build; `./mvnw verify -Dnative` yields a tested native executable and image; `quarkus dev` gives a working app (DB, live reload) with zero manual infra.
- One vertical slice (`items` / `addItem`) touching every layer: SPA → GraphQL → reactive repository → Flyway-managed table, in JVM and native.

**Non-Goals:**
- Multi-module Maven layout, Helm, CD to a cluster, log/trace backends, frontend e2e tests, multi-arch images.
- Authentication, CORS (same origin makes it unnecessary), REST endpoints.

## Decisions

### D1. Single Maven module at repo root, Angular via Quinoa
`pom.xml` at root, Java in `src/main/java/io/github/gaetancollaud/restok`, Angular workspace in `src/main/webui`. Quarkus Quinoa runs `npm ci`/`npm run build` during the Quarkus build and serves the output (also embedded in the native executable); in dev mode it proxies the Angular dev server; `quarkus.quinoa.enable-spa-routing=true` gives the index.html fallback while leaving `/graphql` and `/q` alone.
- Alternative: separate nginx image. Rejected: two images, two release cadences, Ingress routing for no gain.
- Alternative: multi-module. Rejected: Quinoa expects the webui inside the module.

### D2. Quarkus 3.40 platform, Java 25, native release build
Project generated with Quarkus CLI 3.40 + Maven wrapper, `maven.compiler.release=25`. JVM mode for dev and `@QuarkusTest`; native via the `native` profile with `quarkus.native.container-build=true` and the Mandrel builder image for JDK 25 (`quay.io/quarkus/ubi9-quarkus-mandrel-builder-image:jdk-25`), so neither developers nor CI need a local GraalVM. Native correctness is checked by `@QuarkusIntegrationTest` (`*IT`) classes run by failsafe against the native executable.
- Alternative: JVM image only. Rejected: native is a stated goal; startup and memory matter for k8s.

### D3. Reactive stack end to end
- GraphQL: `quarkus-smallrye-graphql` (Vert.x-based, needs no `quarkus-rest`). Resolvers return `Uni<T>` / `Uni<List<T>>`, which SmallRye GraphQL runs on the event loop.
- DB access: `quarkus-hibernate-reactive-panache` + `quarkus-reactive-pg-client`. Resolvers delimit work with `@WithSession` (queries) and `@WithTransaction` (mutations).
- No `@Blocking`, no `.await().indefinitely()` in main code. Vert.x blocked-thread warnings are the guardrail (graphql-api spec, "Non-blocking request handling").
- Alternative: Hibernate ORM (blocking) + virtual threads. Rejected: user wants reactive.

### D4. Panache repository pattern
Entities are plain `@Entity` classes (no `PanacheEntity` active record). Each aggregate has an `@ApplicationScoped` repository implementing `io.quarkus.hibernate.reactive.panache.PanacheRepositoryBase<Entity, UUID>`. Resolvers inject repositories; no static entity methods. Convention recorded in README for future entities.
`Item`: `id uuid` (generated with `@UuidGenerator`/`gen_random_uuid()` default), `name text not null`. `ItemRepository.listByName()` = `list("order by name")`. `addItem` trims, rejects blank with a GraphQL error (`GraphQLException`/validation), then `persist`.

### D5. Flyway over JDBC at startup only
Flyway has no reactive driver, so `quarkus-jdbc-postgresql` + `quarkus-flyway` run migrations at startup (`migrate-at-start=true`) on a JDBC datasource; the app uses only the reactive pool afterwards. Both URLs come from env: `QUARKUS_DATASOURCE_JDBC_URL`, `QUARKUS_DATASOURCE_REACTIVE_URL`, shared username/password. JDBC pool kept tiny (`max-size=2`). Hibernate schema management `validate`. Migration `V1__item.sql`. Flyway's PostgreSQL advisory lock covers multi-replica startup.
- Alternative: run Flyway as a k8s Job / init container. Rejected for now: more manifests and a second image; revisit if startup blocking becomes an issue.
- Trade-off: one blocking step at boot. It runs before the HTTP server accepts traffic, so it never blocks request handling.

### D6. GraphQL schema committed as a snapshot
A `@QuarkusTest` (`SchemaSnapshotTest`) fetches `/graphql/schema.graphql`, writes `src/main/webui/schema.graphql`, and fails if the content changed. Maven runs tests before `package`, so the frontend build always sees the current schema; CI fails on uncommitted drift (the test fails, plus `git diff --exit-code`). The frontend can run codegen standalone because the file is in the repo.
Frontend: Apollo Angular + GraphQL Code Generator (`typescript`, `typescript-operations`, `typescript-apollo-angular`), run as `prebuild`/`prestart` npm scripts; operations in `*.graphql` files.
- Alternative: `smallrye-graphql-maven-plugin` `generate-schema`. Rejected: version must track Quarkus-managed SmallRye and it ignores Quarkus build-time config.

### D7. OpenRouter via `quarkus-langchain4j-openai`, streaming AI service
Config: `quarkus.langchain4j.openai.base-url=https://openrouter.ai/api/v1`, `api-key=${OPENROUTER_API_KEY:not-configured}`, `chat-model.model-name=${OPENROUTER_MODEL:<default>}`, `timeout=${OPENROUTER_TIMEOUT:60s}`, request/response logging off. One `@RegisterAiService` interface `AiChat { Multi<String> chat(@UserMessage String prompt); }` — the `Multi` return makes quarkus-langchain4j use the streaming (non-blocking) model. Callers needing the full text use `.collect().with(Collectors.joining())`. The placeholder key keeps startup working; calls fail with an upstream 401.
Test: `@QuarkusTest` with WireMock (`quarkus-wiremock-test`) as base-url returning an SSE body; asserts model id, bearer header, chunk order, failure on 5xx and on timeout, readiness still UP.
- Alternative: blocking `ChatModel`. Rejected: violates the no-blocking rule.
- Alternative: hand-written reactive REST client. Rejected: LangChain4j gives tools, structured output and memory later at zero code now.

### D8. Observability: `quarkus-opentelemetry`
`quarkus.otel.metrics.enabled=true` (HTTP server + JVM/runtime metrics), OTLP exporter endpoint `${OTEL_EXPORTER_OTLP_ENDPOINT}`. Traces stay enabled (default of the extension, free context for later). `%dev,%test.quarkus.otel.sdk.disabled=true` so no collector is needed locally; a metrics test re-enables it with an in-memory exporter to assert HTTP server metrics after a GraphQL call. Health via `quarkus-smallrye-health` (reactive pg client check + Flyway/JDBC check). JSON logs via `quarkus-logging-json`, off in dev/test. Graceful shutdown: `quarkus.shutdown.timeout=20s`, `quarkus.shutdown.delay-enabled=true`.
- Alternative: Micrometer + Prometheus scrape. Rejected: user asked for OpenTelemetry.

### D9. Container image with Jib, published to GHCR
`quarkus-container-image-jib`; for native builds the base is the Quarkus micro image (`quay.io/quarkus/ubi9-quarkus-micro-image:2.0`), running as uid 1001 (non-root). Image coordinates `ghcr.io/gaetancollaud/restok`, set via `quarkus.container-image.registry/group/name`; tags and push are passed by CI (`quarkus.container-image.tag`, `additional-tags`, `push=true`, username `${{ github.actor }}`, password `GITHUB_TOKEN`).
- Alternative: Dockerfile + `docker/build-push-action`. Rejected: Jib needs no Docker daemon for the image step and keeps image config in `application.properties`.

### D10. Kustomize, hand-written
Drop `quarkus-kubernetes`. `deploy/base/`: `deployment.yaml` (probes on `/q/health/live|ready`, `runAsNonRoot`, `readOnlyRootFilesystem` with a `/tmp` emptyDir, `envFrom` ConfigMap `restok-config` + Secret `restok-secrets`, small native-sized resources, `terminationGracePeriodSeconds: 30`), `service.yaml`, `ingress.yaml`, `kustomization.yaml`. `deploy/overlays/example/`: `images:` tag, `configMapGenerator` with non-secret env, host patch for the Ingress. The Secret is created out of band (documented), never committed.
- Alternative: `quarkus-kubernetes` generated manifests + Kustomize patches. Rejected: two sources of truth; hand-written base is ~100 lines and fully visible.

### D11. GitHub Actions
One workflow `.github/workflows/ci.yml`, triggers: `pull_request`, `push` to `main`, tags `v*`.
- Job `verify`: `actions/setup-java` (Temurin 25, Maven cache), `./mvnw -B verify` (Dev Services use the runner's Docker), `git diff --exit-code src/main/webui/schema.graphql`, `kubectl kustomize deploy/overlays/example`.
- Job `native` (needs `verify`): `./mvnw -B verify -Dnative -Dquarkus.native.container-build=true` (runs `*IT` against the native executable); on `main`/tags only, also builds and pushes the image with computed tags (`main` + `sha-<short>`, or `<version>` + `latest`). `permissions: packages: write` only on this job; `contents: read` at workflow level.
- Alternative: skip native on PRs to save ~10 min. Rejected: native-only breakage would land on `main`.

### D12. Dev and test infra via Dev Services
`quarkus dev` and tests start PostgreSQL automatically (both JDBC and reactive datasources point to it). No Keycloak.

### D13. Local packaged run with Docker Compose
Root `docker-compose.yml` builds the app from the Quarkus `src/main/docker/Dockerfile.native-micro` (expects `target/*-runner`, so `./mvnw package -Dnative` runs first) and starts PostgreSQL with a healthcheck the app waits on. Secrets (OpenRouter key, DB password) come from a git-ignored `.env`; `.env.example` is the committed template. Not picked up by Quarkus Compose Dev Services (those only load `*-dev-service*.yml`). CI keeps Jib for the published image; both use the same UBI 9 micro base and uid 1001.
- Trade-off: two image definitions (Dockerfile for local, Jib for CI). Acceptable while small; switch CI to the Dockerfile if they drift.

## Risks / Trade-offs

- [Quarkus 3.40 / Java 25 / Mandrel 25 availability or extension compatibility (Quinoa, quarkus-langchain4j are Quarkiverse)] → Check versions aligned with the 3.40 platform BOM in task 1; fall back to the latest compatible patch and record it.
- [Hibernate Reactive `validate` support gaps] → If validation is unsupported for a type, keep `validate` off and rely on the migration test asserting columns; note it in README.
- [LangChain4j may log the Authorization header if logging is enabled] → Keep logging off; assert masking in the WireMock test before ever enabling it.
- [Native build time and memory on GitHub runners] → Standard runners (16 GB) suffice for this size; cache Maven repo; if too slow, move native to `main`/tags only.
- [No authentication: anyone reaching the Ingress can add items] → Acceptable for a skeleton; do not expose the example overlay publicly until auth is added in a later change.
- [Schema snapshot test rewrites a tracked file] → Intended; drift shows in `git diff` and the failure message says to commit it.
- [Dev Services need Docker/Podman] → README note; Podman needs `systemctl --user enable --now podman.socket`.

## Migration Plan

Greenfield, no data. First deployment:
1. Create PostgreSQL database and user.
2. Create Secret `restok-secrets` (DB password, OpenRouter key) in the namespace.
3. Copy `deploy/overlays/example`, set host, image tag, DB URLs, OTLP endpoint; `kubectl apply -k`.
Rollback: re-apply the overlay with the previous image tag. Flyway is forward-only; a bad migration is fixed with a new migration, never by editing an applied one.

## Open Questions

- Default OpenRouter model id (any configurable value works; pick at implementation).
- Final Java package/groupId (`io.github.gaetancollaud.restok` assumed; renaming is mechanical).
