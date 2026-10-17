# Tasks

## 1. Toolchain and scaffold

- [x] 1.1 Install JDK 25 and Quarkus CLI 3.40 (`sdk install java 25-tem`, `sdk install quarkus 3.40.x`); verify `java -version` shows 25 and `quarkus version` shows 3.40.x
- [x] 1.2 Generate the Quarkus Maven project at repo root (groupId `io.github.gaetancollaud`, artifactId `restok`, Java 25, Maven wrapper, platform 3.40); verify `./mvnw -q verify` passes on the generated sample
- [x] 1.3 Add extensions: smallrye-graphql, hibernate-reactive-panache, reactive-pg-client, jdbc-postgresql, flyway, smallrye-health, opentelemetry, logging-json, container-image-jib, quinoa, langchain4j-openai (Quarkiverse versions aligned with 3.40); test deps quarkus-junit5, rest-assured, quarkus-wiremock-test; remove the generated sample and any quarkus-rest dependency; verify `./mvnw -q compile` passes and `./mvnw dependency:tree | grep quarkus-rest` is empty
- [x] 1.4 Add `.gitignore` entries (target, node_modules, dist, .angular); verify `git status` shows no build output after a build

## 2. Database, Flyway and the Item repository

- [x] 2.1 Configure JDBC (Flyway only, `max-size=2`) and reactive datasources from env, `quarkus.flyway.migrate-at-start=true`, Hibernate schema management `validate`; verify `quarkus dev` starts a Postgres Dev Service and logs Flyway "Successfully applied"
- [x] 2.2 Add `db/migration/V1__item.sql`, the plain `@Entity Item` (id uuid, name text not null) and `ItemRepository implements PanacheRepositoryBase<Item, UUID>` with `listByName()`; verify the app starts with `validate` and no mismatch
- [x] 2.3 Add a `@QuarkusTest` asserting `flyway_schema_history` contains V1 exactly once and readiness is UP; verify it passes
- [x] 2.4 Document in README: migrations are immutable once merged, schema changes only via new `V<n>__*.sql`, entities are plain `@Entity` + one Panache repository each (no active record), no blocking calls in main code; verify the README section exists

## 3. GraphQL items API

- [x] 3.1 Implement `ItemGraphQLApi` with `items: Uni<List<Item>>` (`@WithSession`) and `addItem(name): Uni<Item>` (`@WithTransaction`, trim, blank → GraphQL error); verify `@QuarkusTest` covers ordered list, empty list, trimmed add, blank rejected with nothing stored
- [x] 3.2 Add a test asserting the full test run logs no Vert.x blocked-thread warnings (log capture on `io.vertx.core.impl.BlockedThreadChecker`) and no blocking-on-IO-thread errors; verify it passes
- [x] 3.3 Add `SchemaSnapshotTest` (design D6) writing `src/main/webui/schema.graphql` and failing on change; verify it fails once on first run, passes on the second, and the file contains `items` and `addItem`
- [x] 3.4 Verify GraphiQL is served in dev (`/q/graphql-ui` 200 in `quarkus dev`) and absent in prod (404 from `java -jar target/quarkus-app/quarkus-run.jar`)

## 4. Angular frontend

- [x] 4.1 Create the Angular workspace in `src/main/webui` (latest Angular CLI via npx, standalone, routing, no SSR); configure Quinoa (`build-dir`, pinned `node-version`, `enable-spa-routing=true`, dev server port); verify `quarkus dev` serves the Angular page at `http://localhost:8080/` with live reload on edit
- [x] 4.2 Add Apollo Angular (uri `/graphql`) + GraphQL Code Generator reading `schema.graphql`, `prebuild`/`prestart` codegen scripts, `items.graphql` with the query and mutation; verify `npm run build` generates typed `ItemsGQL`/`AddItemGQL` and that referencing a non-existent field fails the build
- [x] 4.3 Items page: list + add form, list refreshed after add (refetch or cache update); verify an Angular component test with mocked Apollo, and manually in `quarkus dev`: add "bolt" → appears without reload; reload `/items` deep link → page loads
- [x] 4.4 Verify `./mvnw package` on a clean checkout (no `node_modules`, no `dist`) builds the SPA and `java -jar target/quarkus-app/quarkus-run.jar` serves it at `/`

## 5. OpenRouter client

- [x] 5.1 Configure `quarkus.langchain4j.openai.*` for OpenRouter from env (`OPENROUTER_API_KEY` default `not-configured`, `OPENROUTER_MODEL`, `OPENROUTER_TIMEOUT`), logging off; add `AiChat` AI service returning `Multi<String>`; verify the app starts with no key set
- [x] 5.2 Add WireMock-backed `@QuarkusTest` (SSE stub): asserts model id and `Authorization: Bearer <key>`, chunk order and joined text, failure on 5xx, failure on timeout, readiness UP afterwards, no blocked-thread warning; verify it passes
- [x] 5.3 Document the OpenRouter env vars in README; verify the README lists all three

## 6. Runtime: observability, logging, shutdown

- [x] 6.1 Configure `quarkus-opentelemetry` (metrics on, OTLP endpoint from `OTEL_EXPORTER_OTLP_ENDPOINT`, SDK disabled in dev/test); verify `quarkus dev` logs no exporter errors and a test profile with an in-memory metric exporter sees `http.server.request.duration` after a GraphQL call
- [x] 6.2 Configure JSON logging for prod only, `quarkus.shutdown.timeout=20s` + `delay-enabled`; verify the prod jar prints single-line JSON logs, dev prints plain text, and `kill -TERM` during a slow request lets it complete
- [x] 6.3 Add a test asserting readiness includes the reactive datasource check and returns 503 when the DB is stopped; verify it passes

## 7. Native image

- [x] 7.1 Configure the `native` profile with container build and Mandrel JDK 25 builder; add `*IT` (`@QuarkusIntegrationTest`) for `items`/`addItem`, SPA at `/`, and readiness; verify `./mvnw verify -Dnative -Dquarkus.native.container-build=true` passes
- [x] 7.2 Configure Jib (native micro base image, `ghcr.io/gaetancollaud/restok`); verify `./mvnw package -Dnative -Dquarkus.native.container-build=true -Dquarkus.container-image.build=true` produces an image whose process runs as non-root (`podman run ... id -u` ≠ 0 or `podman inspect` user) and serves `/q/health/ready` with a DB

## 8. Kustomize

- [x] 8.1 Write `deploy/base` (Deployment with probes, non-root + read-only root FS + `/tmp` emptyDir, `envFrom` `restok-config`/`restok-secrets`; Service; Ingress; kustomization); verify `kubectl kustomize deploy/base` renders
- [x] 8.2 Write `deploy/overlays/example` (image tag, `configMapGenerator` for non-secret env incl. OTLP endpoint and DB URLs, Ingress host patch) and a README "Deploy to Kubernetes" section incl. the out-of-band Secret creation command; verify `kubectl kustomize deploy/overlays/example` renders with the tag and no secret values (`grep -i -E 'password|api.?key'` shows only secret refs)

## 9. GitHub Actions

- [ ] 9.1 Add `.github/workflows/ci.yml` job `verify` (Temurin 25, Maven cache, `./mvnw -B verify`, schema `git diff --exit-code`, `kubectl kustomize deploy/overlays/example`); verify it passes on a pull request
- [ ] 9.2 Add job `native` (needs `verify`): native build + `*IT` on all triggers; on `main`/`v*` also push to GHCR with tags per ci-delivery spec using `GITHUB_TOKEN`, `packages: write` only on this job; verify on a PR no image is pushed, and after merge `ghcr.io/gaetancollaud/restok:main` and `:sha-<short>` exist
- [ ] 9.3 Add a CI badge and pipeline description to README; verify the badge renders on GitHub

## 10. Integration check

- [x] 10.1 Run the native image locally (Docker/Podman, or `docker compose`) against a Postgres container using env vars only; verify items page add/list works, `/q/health/ready` UP, JSON logs, clean exit on stop within 20s
- [x] 10.2 Run `openspec validate bootstrap-web-app-platform --strict` and `./mvnw verify`; verify both pass

## 11. Local packaging (Docker Compose)

- [x] 11.1 Add `src/main/docker/Dockerfile.native-micro` (Quarkus template, UBI 9 micro base, uid 1001); verify `docker build` succeeds from a native `target/*-runner`
- [x] 11.2 Add root `docker-compose.yml` (PostgreSQL with healthcheck + app built from the Dockerfile, env from `.env`) and `.env.example` (OpenRouter key placeholder; `.env` stays git-ignored), README section; verify `docker compose up --build` serves `/`, `addItem`/`items` work, readiness UP, and `docker compose down -v` cleans up

## Workflow follow-up

- Archive the change with `/opsx:archive` after review.
