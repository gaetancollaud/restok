# Spec Delta

## Purpose

Defines the single API between the Angular frontend and the backend: a GraphQL endpoint whose schema is generated from backend code and drives a typed frontend client.

## ADDED Requirements

### Requirement: GraphQL endpoint
The backend SHALL expose one GraphQL endpoint at `/graphql` accepting POST requests with a JSON body (`query`, `variables`, `operationName`) and returning standard GraphQL JSON responses (`data`, `errors`). GraphQL SHALL be the only application API; no other REST endpoints SHALL exist besides health.

#### Scenario: Valid query
- **WHEN** a client POSTs a valid query to `/graphql`
- **THEN** the response status is 200 and the body contains a `data` object matching the query shape

#### Scenario: Invalid query
- **WHEN** a client POSTs a query referencing a field that does not exist
- **THEN** the response contains an `errors` array describing the validation failure and no `data` for that field

### Requirement: Non-blocking request handling
GraphQL requests SHALL be processed without blocking I/O threads, including database and outbound HTTP access.

#### Scenario: Test suite run
- **WHEN** the backend test suite exercises every GraphQL operation
- **THEN** the logs contain no blocked-thread warnings and no "blocking operation on I/O thread" errors

### Requirement: Schema generated from backend code
The GraphQL schema SHALL be derived from backend code only; no hand-written schema file is the source of truth. The generated schema SHALL be published in SDL form at `/graphql/schema.graphql`.

#### Scenario: Schema reflects code
- **WHEN** a new query is added to the backend code and the application is rebuilt
- **THEN** `/graphql/schema.graphql` contains the new query without any manual schema edit

### Requirement: Typed frontend client from the generated schema
The frontend build SHALL generate its TypeScript types and operation documents from the backend-generated schema. A frontend operation that does not match the schema SHALL fail the build.

#### Scenario: Schema drift breaks the build
- **WHEN** a backend field used by a frontend operation is removed and the full build runs
- **THEN** the build fails with an error naming the invalid operation

### Requirement: Interactive explorer only in development
An interactive GraphQL explorer UI SHALL be available in development mode and SHALL NOT be served in production.

#### Scenario: Production build
- **WHEN** the production container is running and a client requests the explorer UI path
- **THEN** the response is 404
