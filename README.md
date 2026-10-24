# restok

[![CI](https://github.com/gaetancollaud/restok/actions/workflows/ci.yml/badge.svg)](https://github.com/gaetancollaud/restok/actions/workflows/ci.yml)

Quarkus (Java 25) + PostgreSQL + GraphQL + Angular, shipped as a native image to Kubernetes.

## Prerequisites

- JDK 25 and Quarkus CLI 3.40 (`sdk env` picks them from `.sdkmanrc`)
- Docker or Podman (Dev Services start PostgreSQL for dev and tests; with Podman run `systemctl --user enable --now podman.socket`)

## Run

```sh
quarkus dev          # app + Angular live reload on http://localhost:8080
./mvnw verify        # JVM tests
```

### Packaged image with Docker Compose

Runs the native image (built from `src/main/docker/Dockerfile.native-micro`) with PostgreSQL:

```sh
./mvnw package -Dnative -DskipTests   # native executable in target/
cp .env.example .env                  # once; put your OIDC realm URL and OpenRouter key in .env (git-ignored)
docker compose up --build             # http://localhost:8080
docker compose down -v                # stop and drop the database volume
```

## Configuration

All environment-specific values come from environment variables (Dev Services cover the database in dev/test).

| Variable | Purpose | Default |
|---|---|---|
| `QUARKUS_DATASOURCE_JDBC_URL` | App database, e.g. `jdbc:postgresql://host:5432/restok` | — |
| `QUARKUS_DATASOURCE_USERNAME` / `QUARKUS_DATASOURCE_PASSWORD` | Database credentials (password from a Secret) | — |
| `QUARKUS_OIDC_AUTH_SERVER_URL` | OIDC realm URL, e.g. `https://keycloak.example.com/realms/home`. Required, also in dev (put it in `.env`). The SPA gets it from `/auth-config` | — |
| `QUARKUS_OIDC_CLIENT_ID` | OIDC client: public, standard flow with PKCE, redirect URI and web origin = the app URL. It must allow the `offline_access` scope (Keycloak default), which keeps users logged in for the realm's "Offline Session Idle" / "Offline Session Max"; leave "Revoke Refresh Token" off. "Valid post logout redirect URIs" must include the app URL (`+` reuses the redirect URIs) for Logout | `restok` |
| `OPENROUTER_API_KEY` | OpenRouter API key (Secret). App starts without it; AI calls then fail | `not-configured` |
| `OPENROUTER_MODEL` | Model id, see https://openrouter.ai/models | `openrouter/auto` |
| `OPENROUTER_TIMEOUT` | Request timeout | `60s` |
| `OPENROUTER_BASE_URL` | API base URL | `https://openrouter.ai/api/v1` |

## Conventions

### Database migrations

- Migrations live in `src/main/resources/db/migration` and run automatically at startup (Flyway).
- Schema changes are made **only** through a new `V<n>__<description>.sql`. Hibernate validates the schema and never changes it.
- A migration is **immutable** once merged: never edit an applied file, add a new one instead (Flyway refuses to start on checksum mismatch).

### Persistence

- Entities are plain `@Entity` classes (no Panache active record).
- Each entity has one `@ApplicationScoped` repository implementing `PanacheRepositoryBase<Entity, ID>`.

### Blocking only

- No reactive code in main sources: no `Uni`/`Multi`, no Mutiny, no Hibernate Reactive, no reactive clients.
- Persistence is Hibernate ORM with Panache over JDBC. GraphQL resolvers return plain types and run on worker threads; writes use `@Transactional`.
- AI services (`@RegisterAiService`) return `String` and block until the answer arrives.

## Deploy to Kubernetes

Manifests are plain Kustomize: `deploy/base` (Deployment, Service, Ingress) and `deploy/overlays/example` (image tag, ConfigMap, Ingress host). Copy the example overlay per environment.

1. Create the PostgreSQL database and user.
2. Create the namespace and the Secret (never committed):
   ```sh
   kubectl create namespace restok
   kubectl -n restok create secret generic restok-secrets \
     --from-literal=QUARKUS_DATASOURCE_PASSWORD='<db password>' \
     --from-literal=OPENROUTER_API_KEY='<openrouter key>'
   ```
3. Adjust `deploy/overlays/example/kustomization.yaml` (image tag, DB URLs, OTLP endpoint, Ingress host), check the output, and apply:
   ```sh
   kubectl kustomize deploy/overlays/example
   kubectl apply -k deploy/overlays/example
   ```

Rollback: set the previous image tag in the overlay and apply again. Migrations are forward-only.

> There is no authentication yet: do not expose the Ingress publicly.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) on every pull request, push to `main` and `v*` tag:

1. `verify`: JVM tests, GraphQL schema snapshot committed, Kustomize overlay renders.
2. `native`: native build + integration tests against the native executable.
3. Pushes to `main` / tags only, after the tests: image `ghcr.io/gaetancollaud/restok` pushed with tags `main` + `sha-<short sha>`, or `<version>` + `latest` for `v<version>` tags. Pull requests never push.
