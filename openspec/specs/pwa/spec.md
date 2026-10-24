# pwa Specification

## Purpose

Lets users install Restok on their device as a standalone app and tells them when a newer version is ready, from a single button in the app header.

## Requirements

### Requirement: Installable web app
The production build SHALL serve a web app manifest that names the app Restok, opens it standalone at `/`, and provides icons of at least 192x192 and 512x512 pixels, including a maskable one. Together with the service worker, this SHALL meet the installability criteria of Chromium browsers.

#### Scenario: Manifest served
- **WHEN** a browser loads `/` from a production build
- **THEN** the page links a manifest that loads with status 200, and it declares `display: standalone`, `start_url` `/`, and the required icons

#### Scenario: Browser offers install
- **WHEN** a Chromium browser opens the production app over HTTPS and it is not installed
- **THEN** the browser treats the app as installable

### Requirement: App shell cached by a service worker
Production builds SHALL register a service worker that caches the app shell (HTML, scripts, styles, icons), so the installed app opens without re-downloading them. GraphQL requests SHALL always go to the network. Development mode SHALL NOT register the service worker.

#### Scenario: Shell from cache
- **WHEN** the installed app is reopened with no new version deployed
- **THEN** the shell loads from the service worker cache

#### Scenario: API not cached
- **WHEN** the app sends a GraphQL request
- **THEN** the request reaches `/graphql` and its response is not served from the service worker cache

#### Scenario: No worker in dev mode
- **WHEN** the app runs in development mode
- **THEN** no service worker is registered

### Requirement: Install button
The grocery screen header SHALL show an Install button next to the menu button while the browser offers an install prompt for the app. Tapping it SHALL open the browser's install prompt. The button SHALL disappear once the app is installed or the prompt has been used.

#### Scenario: Not installed
- **WHEN** the browser offers to install the app and no update is ready
- **THEN** the header shows the Install button next to the menu button

#### Scenario: Tap Install
- **WHEN** the user taps the Install button
- **THEN** the browser's install prompt opens, and the button is hidden afterwards whether the user accepts or dismisses it

#### Scenario: Already installed or unsupported
- **WHEN** the app runs installed, or in a browser that offers no install prompt
- **THEN** no Install button is shown

### Requirement: Update button
When a new deployed version has been downloaded and is ready, the header SHALL show an Update button in the same place, in priority over Install. Tapping it SHALL activate the new version and reload the app.

#### Scenario: New version ready
- **WHEN** a new version is deployed and the running app has downloaded it
- **THEN** the header shows the Update button, even if Install would otherwise be shown

#### Scenario: Tap Update
- **WHEN** the user taps the Update button
- **THEN** the app reloads on the new version and the button is gone

#### Scenario: Up to date
- **WHEN** no newer version is ready and the app is installed
- **THEN** the header shows neither button
