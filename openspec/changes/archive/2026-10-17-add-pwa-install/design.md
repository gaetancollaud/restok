# Design

## Context

- The SPA is Angular 22 (`@angular/build:application`) under `src/main/webui`. Quinoa serves it from `dist/restok/browser`, with SPA routing on, in both the JVM and the native (Mandrel) builds. There is no service worker or manifest yet. `public/` only has `favicon.ico` and `favicon.svg` (orange bag, `#c2410c`).
- The only header is in `basket/grocery-screen/grocery-screen.html`: the shop dropdown, then the `.iconbtn` edit button, which emits `editShops`. `GroceryScreen` is a presentational component. Its inputs and outputs are wired by `grocery/grocery.ts`.
- Brand tokens are in `src/styles.css`: `--brand: #c2410c`, `--surface: #fff7ef`.

## Goals / Non-Goals

**Goals:**
- One small, testable source of truth for "can install" and "update ready" that the header reads.
- No backend code change.

**Non-Goals:**
- Caching GraphQL data or any offline write queue.
- Our own update polling loop beyond what the Angular service worker already does on navigation and reload.

## Decisions

### 1. `@angular/service-worker` (ngsw), not a hand-written worker
It's an official Angular package, versioned with the rest. It handles hashed app-shell caching from `ngsw-config.json`, and `SwUpdate.versionUpdates` emits `VERSION_READY`, which is the signal the Update button needs. A hand-written worker would have to reimplement version manifests and cache cleanup.
Alternatives: Workbox adds a build plugin and duplicates what ngsw does. Manifest only, no worker: Chromium still installs, but nothing detects updates.

Setup: add the dependency with `npm i @angular/service-worker@^22.2.0` rather than `ng add @angular/pwa`. The schematic writes generic Angular icons and a manifest we'd rewrite anyway. Add the files by hand:
- `angular.json` build options: `"serviceWorker": "ngsw-config.json"`.
- `app.config.ts`: `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`.
- `ngsw-config.json`: the default `app` asset group (prefetch `index.html`, `*.js`, `*.css`, `favicon.*`, `manifest.webmanifest`) and an `assets` group (lazy, `icons/**`). No `dataGroups`, so `/graphql` POSTs pass through untouched (ngsw never caches non-GET requests anyway).
- Exclude the Google Fonts stylesheet: it stays network-only, and the system fallback font applies offline.

### 2. One root service, `Pwa`, exposing two signals and two actions
`src/app/pwa/pwa.ts`, `@Injectable({ providedIn: 'root' })`:
- `canInstall = signal(false)`: set true on `window` `beforeinstallprompt`, where it calls `preventDefault()` and stores the event. Reset to false on `appinstalled` or after `prompt()` resolves, whatever the outcome.
- `updateReady = signal(false)`: set from `SwUpdate.versionUpdates`, filtered to `VERSION_READY`.
- `install()`: `await deferred.prompt()`, then clear the event.
- `update()`: `await swUpdate.activateUpdate()`, then `document.location.reload()`.
- `SwUpdate.isEnabled` false (dev mode, or no SW support): `updateReady` stays false.

`beforeinstallprompt` isn't in the TS DOM lib, so declare a minimal local interface (`prompt(): Promise<unknown>`) in the same file.
Alternatives: putting the listeners straight into `GroceryScreen` would mix browser globals into a presentational component and make its spec harder. A separate component for the button is one more file for a single `<button>`. Skip it.

### 3. The button lives in `GroceryScreen`, which injects `Pwa`
`GroceryScreen` already owns the header markup. It injects `Pwa` and renders one `.iconbtn` after the edit button, reusing that button's class and size:
- `@if (pwa.updateReady())`: refresh icon, `aria-label="Update Restok"`, `title="Update"`, calls `pwa.update()`.
- `@else if (pwa.canInstall())`: download icon, `aria-label="Install Restok"`, `title="Install"`, calls `pwa.install()`.
- Neither: nothing is rendered, so the header looks exactly as it does today.

"Top right, next to edit" maps to just after the edit button in the flex header. Use the same inline-SVG style as the edit icon (24px, stroke `currentColor`, width 2.5).
Alternative: passing inputs and outputs through `Grocery` means more wiring for a global concern. Injection is simpler, and specs can override the provider.

### 4. Manifest and icons
`public/manifest.webmanifest`: `name`/`short_name` Restok, `start_url` `/`, `scope` `/`, `display: standalone`, `theme_color` `#c2410c`, `background_color` `#fff7ef`, and icons `icons/icon-192.png`, `icons/icon-512.png` (purpose `any`), plus `icons/icon-maskable-512.png` (purpose `maskable`: the bag on a full-bleed `#fff7ef` square, scaled into the central 80% safe zone).
Generate the PNGs once from `favicon.svg` with ImageMagick (`magick`, already on the dev machine) and commit them. No build-time generation.
`index.html`: add `<link rel="manifest" href="manifest.webmanifest">`, `<meta name="theme-color" content="#c2410c">`, and `<link rel="apple-touch-icon" href="icons/icon-192.png">` (iOS home screen icon, free).

## Risks / Trade-offs

- [Vert.x may serve `.webmanifest` as `application/octet-stream`] → Chromium accepts the manifest regardless of MIME type. Check it in DevTools > Application > Manifest on a JVM and a native build. If it's rejected, add `quarkus.http.static-resources` / a MIME mapping, or rename it to `manifest.json`.
- [The service worker serves a stale `index.html` after a deploy] → that's ngsw's intended behaviour. The new version downloads in the background, and the Update button (or the next full reload after all tabs close) switches to it. Browsers fetch `ngsw-worker.js` itself bypassing the HTTP cache by default.
- [No HTTPS on the cluster] → the worker doesn't register, and Chromium won't offer install. Both buttons stay hidden, so nothing breaks, but the feature is inert. Make sure the ingress serves TLS.
- [iOS Safari never fires `beforeinstallprompt`] → no Install button on iOS. Users can still use Share > Add to Home Screen, and the manifest and apple-touch-icon make that a proper standalone app. Accepted per proposal.
- [Native image resources] → Quinoa already packages everything in the build dir. The new files are plain static files under the same dir, so they're included without native config. Verify in the native IT run.

## Migration Plan

Deploy as normal. First visit after the deploy registers the worker. Rollback: deploy the previous image. A worker that's already installed then finds a different `ngsw.json` and updates to it. To remove the worker entirely, ship ngsw's `safety-worker.js` as `ngsw-worker.js`.
