# cloud-runtime Specification

## Purpose

Makes the application run correctly in Kubernetes: a native container image, Kustomize manifests, health probes, environment-driven configuration, structured logs, OpenTelemetry metrics, graceful shutdown, and stateless horizontal scaling.

## Requirements

### Requirement: Health probes
The application SHALL expose a liveness endpoint at `/q/health/live` and a readiness endpoint at `/q/health/ready`. Readiness SHALL report DOWN while the database is unreachable.

#### Scenario: Healthy
- **WHEN** the application is started and the database is reachable
- **THEN** both endpoints return 200 with status UP

#### Scenario: Database down
- **WHEN** the database becomes unreachable
- **THEN** readiness returns 503 with status DOWN and liveness still returns 200

### Requirement: Native container image
The release container image SHALL contain the native executable (not a JVM), run as a non-root user, and pass the same functional tests as the JVM build.

#### Scenario: Image contents
- **WHEN** the release image is started
- **THEN** the process is the native executable running as a non-root user and `/q/health/ready` returns UP with a database available

### Requirement: Environment-driven configuration
Every environment-specific value (database URLs and credentials, OpenRouter key and model, OTLP endpoint) SHALL be settable through environment variables. Secrets SHALL NOT be stored in the image or in committed manifests.

#### Scenario: Deploy to a new environment
- **WHEN** the same image is started with different environment variables
- **THEN** it connects to the database and collector given by those variables

#### Scenario: Secrets in manifests
- **WHEN** the committed Kustomize files are inspected
- **THEN** the database password and OpenRouter API key are only referenced from a Secret, never written as values

### Requirement: Kustomize manifests
The repository SHALL provide a Kustomize base (Deployment, Service, Ingress) wired to the health probes and to environment configuration, plus at least one example overlay that sets the image tag and environment values.

#### Scenario: Render overlay
- **WHEN** `kubectl kustomize` is run on the example overlay
- **THEN** it renders valid manifests whose Deployment declares liveness and readiness probes, a non-root security context, and the overlay's image tag

### Requirement: OpenTelemetry metrics
The application SHALL export metrics (at least HTTP server and runtime metrics) via OpenTelemetry OTLP to the configured endpoint. Metrics export SHALL be disabled in development and tests unless explicitly configured.

#### Scenario: Collector configured
- **WHEN** the application runs with an OTLP endpoint configured and serves GraphQL requests
- **THEN** the collector receives HTTP server request metrics for those requests

#### Scenario: No collector in development
- **WHEN** the application runs in development mode without an OTLP endpoint
- **THEN** no export errors are logged

### Requirement: Structured logs to stdout
In production, the application SHALL write logs to stdout as one JSON object per line.

#### Scenario: Production log line
- **WHEN** the production container logs a message
- **THEN** stdout receives a single-line JSON object with timestamp, level, logger, and message fields

### Requirement: Graceful shutdown
On SIGTERM, the application SHALL stop accepting new requests and let in-flight requests finish within a bounded timeout before exiting.

#### Scenario: Rolling update
- **WHEN** a pod receives SIGTERM while a request is in progress
- **THEN** that request completes successfully and the process then exits

### Requirement: Stateless horizontal scaling
The application SHALL keep no per-user state in memory between requests, so any replica can serve any request.

#### Scenario: Two replicas
- **WHEN** two replicas run behind one Service and consecutive requests hit different replicas
- **THEN** all requests succeed with the same results
