# Proposal

## Why

Restok is used on a phone in the shop, but today it only runs in a browser tab. Users can't install it like an app, and they can't tell when a new version has been deployed. Making it an installable PWA, with a visible install/update button, fixes both.

## What Changes

- Add a web app manifest (name, icons, theme colour, `display: standalone`) so browsers offer to install Restok.
- Register a service worker in production builds. It caches the app shell so the installed app opens fast, and it detects when a new version has been deployed.
- Add one icon button at the top right of the grocery screen, next to the edit button:
  - **Install** when the browser can install the app and it isn't installed yet. A tap opens the browser's install prompt.
  - **Update** when a new version has been downloaded and is ready. A tap activates it and reloads. Update takes priority over Install.
  - Hidden otherwise: already installed and up to date, or on a browser with no install prompt (iOS Safari, Firefox desktop).
- Out of scope: offline use of the shopping list data. GraphQL calls still need the network. Push notifications. A custom iOS "Add to Home Screen" guide.

## Capabilities

### New Capabilities
- `pwa`: installability (manifest, icons, service worker) and the in-app install/update button.

### Modified Capabilities
<!-- None: web-frontend's same-origin delivery and route fallback already cover serving the new static files. -->

## Impact

- Frontend: new dependency `@angular/service-worker` (same version as the other Angular packages). Changes `angular.json` (service worker on), `app.config.ts` (register the worker), `index.html` (manifest link, theme colour), and `public/` (manifest and PNG icons). Adds `ngsw-config.json`, a small root service for install/update state, and the button in `grocery-screen`.
- Backend: no code change. Quinoa serves `ngsw-worker.js`, `ngsw.json` and `manifest.webmanifest` from the build dir. To verify: these files are not shadowed by the SPA fallback, and the manifest gets a usable content type in JVM and native builds.
- Deployment: service workers need HTTPS, so the cluster ingress must serve TLS (`localhost` is exempt for testing).
