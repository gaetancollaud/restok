## 1. Login keeps the path

- [x] 1.1 Add `preserveRequestedRoute: true` to `oauth.configure` in `src/main/webui/src/app/auth/auth.ts`. Verify: logged out, open `/shop/<id>`, log in, and land back on `/shop/<id>`.

## 2. URL ↔ panel/shop sync in `Grocery`

- [x] 2.1 Inject `Location`. Parse `location.path()` in the constructor to seed `panel` and `shopId` (`/shop/:id`, `/list/:id`, else list + `ALL_SHOPS`). Verify with a `grocery.spec.ts` test: rendering at `/shop/coop` shows the Shops panel on Coop. Reset the URL to `/` in `beforeEach`.
- [x] 2.2 Add one effect that writes the URL from `panel()` and the effective shop id. Use `go()` only on list → shops, `replaceState()` otherwise. Skip while data hasn't loaded, and skip when the path already matches. Verify with tests: selecting a shop gives `/list/<id>`, All shops gives `/`, opening the editor gives `/shop/<id>`, and an unknown id is corrected to the first shop.
- [x] 2.3 Subscribe to `location.onUrlChange` for Back/Forward. A shop URL sets the panel and the shop. A list URL sets only the panel and keeps `shopId`. Verify with a test: open the editor, pick another shop, then `location.back()`. The list shows that shop at `/list/<id>`.
- [x] 2.4 Wire the Shops panel's `(back)`: `location.back()` if this session pushed the editor entry, else `panel.set('list')`. Verify the existing "opens from the list and goes back" test still passes, plus a test that landing on `/shop/<id>` and tapping back gives `/list/<id>`.
- [x] 2.5 Verify with a test that a URL naming a shop wins over the nearby position: render at `/list/lidl` with Coop 50 m away, and the dropdown keeps Lidl.

## 3. Check end to end

- [ ] 3.1 Run `npm test` in `src/main/webui` and confirm it passes. Then in `quarkus dev`, reload on `/shop/<id>` and `/list/<id>`, and check that the phone/browser Back closes the editor without stepping through every shop switch.
