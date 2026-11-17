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

### Requirement: Page URLs
The SPA's path SHALL mirror the panel and shop on screen:
- `/`: the grocery list on "All shops"
- `/list/{shopId}`: the grocery list on that shop
- `/shop/{shopId}`: the Shops panel on that shop

Opening any of these paths directly SHALL show that panel and shop. If `{shopId}` names no existing shop, the panel SHALL fall back to the first shop and the path SHALL be corrected to that shop's id. Any other path SHALL show the list on "All shops" and be replaced with `/`.

#### Scenario: Edit a shop
- **WHEN** the user opens the Shops panel with "Coop" (id `c0`) selected
- **THEN** the path is `/shop/c0`

#### Scenario: Pick a shop in the list
- **WHEN** the user selects "Lidl" (id `l1`) in the list's dropdown
- **THEN** the path is `/list/l1`, and selecting "All shops" afterwards makes it `/`

#### Scenario: Reload in the Shops panel
- **WHEN** the user reloads the page at `/shop/c0`
- **THEN** the Shops panel opens with "Coop" selected

#### Scenario: Unknown shop
- **WHEN** the user opens `/shop/does-not-exist` and the first shop is "Coop" (id `c0`)
- **THEN** the Shops panel shows "Coop" and the path becomes `/shop/c0`

#### Scenario: Deleted shop
- **WHEN** the user deletes the selected shop in the Shops panel
- **THEN** the path follows the shop now selected

### Requirement: Back closes the Shops panel
Opening the Shops panel SHALL add a browser history entry. Changing the selected shop SHALL replace the current entry instead of adding one. Browser Back from the Shops panel SHALL return to the list on the same shop. Forward SHALL reopen the panel.

#### Scenario: Back from the editor
- **WHEN** the user is on the list at `/list/c0`, opens the Shops panel, selects "Lidl", and presses Back
- **THEN** the list shows "Lidl" at `/list/l1`

#### Scenario: Switching shops adds no history
- **WHEN** the user selects three different shops in the list's dropdown and presses Back
- **THEN** the browser leaves the page it was on before the app, not a previous shop
