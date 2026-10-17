# Tasks

## 1. Service worker and manifest

- [x] 1.1 In `src/main/webui`, run `npm i @angular/service-worker@^22.2.0`; verify `package.json` lists it at the same major as `@angular/core` and `npm ls @angular/service-worker` resolves
- [x] 1.2 Generate `public/icons/icon-192.png`, `icon-512.png` (from `favicon.svg`, transparent) and `icon-maskable-512.png` (bag in the central 80% on a full-bleed `#fff7ef` square) with `magick`; verify with `magick identify public/icons/*.png` that sizes are 192x192 / 512x512
- [x] 1.3 Add `public/manifest.webmanifest` (name/short_name Restok, `start_url`/`scope` `/`, `display: standalone`, `theme_color #c2410c`, `background_color #fff7ef`, the three icons with `any`/`maskable` purposes) and, in `index.html`, the manifest link, `theme-color` meta and `apple-touch-icon`; verify `npm run build` copies the manifest and icons into `dist/restok/browser`
- [x] 1.4 Add `ngsw-config.json` (prefetch `app` group: `/index.html`, `/*.js`, `/*.css`, `/favicon.*`, `/manifest.webmanifest`; lazy `assets` group: `/icons/**`; no `dataGroups`), set `"serviceWorker": "ngsw-config.json"` in `angular.json` build options, and register with `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })` in `app.config.ts`; verify `npm run build` emits `ngsw-worker.js` and `ngsw.json`, and `ngsw.json` has no `/graphql` entry

## 2. Install/update state and header button

- [x] 2.1 Create `src/app/pwa/pwa.ts`: root `Pwa` service with `canInstall` / `updateReady` signals and `install()` / `update()` as in design §2, injecting `SwUpdate` with `{ optional: true }` so that specs without `provideServiceWorker` still construct it; add `pwa.spec.ts` checking that a dispatched `beforeinstallprompt` sets `canInstall`, `install()` calls `prompt()` and clears it, `appinstalled` clears it, and a fake `SwUpdate` emitting `VERSION_READY` sets `updateReady`; verify `npm test` passes
- [x] 2.2 In `grocery-screen.html`/`.ts`, inject `Pwa` and render one `.iconbtn` after the edit button: Update (refresh icon, `aria-label="Update Restok"`) when `updateReady()`, otherwise Install (download icon, `aria-label="Install Restok"`) when `canInstall()`, otherwise nothing; extend `grocery-screen.spec.ts` with a stub `Pwa` provider covering three cases (neither → no button, install only → Install, both → Update only) and that tapping calls the matching action; verify `npm test` passes, existing specs included

## 3. Integration checks

- [x] 3.1 Run `./mvnw package -DskipTests` (JVM), start the jar, and in Chromium on `http://localhost:8080`, check DevTools > Application: the manifest parses with no errors and its icons load, the service worker is activated, `/graphql` requests reach the network (ngsw passes unmatched requests through with `safeFetch`, so Chrome still flags them "from ServiceWorker"; nothing is cached), and the Install button appears and opens the browser prompt
- [x] 3.2 With the app from 3.1 open, rebuild with any visible frontend change and restart; reload once, then verify the Update button appears and tapping it shows the new version
- [x] 3.3 Verify the native build serves the new files: after `./mvnw verify -Dnative` (or CI), `curl -sI` against the native runner returns 200 for `/manifest.webmanifest`, `/ngsw-worker.js`, `/ngsw.json` and `/icons/icon-192.png` (not the `index.html` fallback); note the manifest `Content-Type`, and if Chromium rejects it, apply the mitigation from design.md Risks
- [x] 3.4 Run `./mvnw quarkus:dev` and verify no service worker is registered on `http://localhost:8080` (DevTools > Application > Service workers is empty)
