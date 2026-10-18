# Spec Delta

## MODIFIED Requirements

### Requirement: GraphQL endpoint
The backend SHALL expose one GraphQL endpoint at `/graphql` accepting POST requests with a JSON body (`query`, `variables`, `operationName`) and returning standard GraphQL JSON responses (`data`, `errors`). Requests SHALL carry a valid OIDC bearer token; without one the response is HTTP 401. GraphQL SHALL be the only application API; no other REST endpoints SHALL exist besides health and the public auth configuration (`/auth-config`).

#### Scenario: Valid query
- **WHEN** a client POSTs a valid query to `/graphql` with a valid bearer token
- **THEN** the response status is 200 and the body contains a `data` object matching the query shape

#### Scenario: Invalid query
- **WHEN** a client POSTs a query referencing a field that does not exist
- **THEN** the response contains an `errors` array describing the validation failure and no `data` for that field

#### Scenario: Missing token
- **WHEN** a client POSTs a valid query to `/graphql` without an `Authorization` header
- **THEN** the response status is 401 and no query is executed
