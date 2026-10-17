# web-frontend Specification

## Purpose

Defines how the Angular single-page application is built, delivered from the same origin as the API, and developed with live reload.

## Requirements

### Requirement: Single build artifact
One backend build command SHALL build the Angular application and package it with the backend into one deployable artifact, in both JVM and native builds.

#### Scenario: Full build
- **WHEN** the backend build runs on a clean checkout
- **THEN** the produced artifact serves the compiled SPA without any separate frontend build step

#### Scenario: Native build
- **WHEN** the native executable is started
- **THEN** it serves the compiled SPA at `/`

### Requirement: Same-origin delivery
The SPA SHALL be served at `/` from the same origin as `/graphql`, so the browser needs no cross-origin requests to reach the API.

#### Scenario: Open the root
- **WHEN** a browser requests `/`
- **THEN** the SPA's `index.html` is returned

### Requirement: Client-side route fallback
Requests for unknown non-API paths SHALL return the SPA's `index.html` so client-side routes work on reload and deep links. GraphQL, health, and static asset paths SHALL NOT be shadowed by this fallback.

#### Scenario: Deep link reload
- **WHEN** a browser requests `/some/client/route` directly
- **THEN** `index.html` is returned with status 200

#### Scenario: API path not shadowed
- **WHEN** a client POSTs to `/graphql`
- **THEN** the request reaches the GraphQL endpoint, not `index.html`

### Requirement: Development live reload
In development mode, frontend source changes SHALL be reflected in the browser without restarting the backend.

#### Scenario: Edit a component
- **WHEN** a developer edits an Angular component while dev mode is running
- **THEN** the browser shows the change after reload with the backend still running
