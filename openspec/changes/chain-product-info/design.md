# Design

## Context

- **Backend.** Quarkus with SmallRye GraphQL (blocking resolvers on worker threads), Panache entities and Flyway (`V1`, `V2`). It ships as a native image, so whatever we use must work in native.
- **The AI client** is the only outbound HTTP today. It is tested against WireMock Dev Services (`AiChatTest`).
- **Schema snapshot.** `SchemaSnapshotTest` rewrites `src/main/webui/schema.graphql`, and the SPA codegen builds `generated.ts` from it.
- **Frontend.** The popup and the tiles are presentational. `Grocery` does all GraphQL I/O and passes functions down when a child needs an answer (`classify`).
- **Endpoints** were verified live on 2026-10-18. Every product read is cached.

| Chain | Search | Details | Notes |
|---|---|---|---|
| Migros | `POST /onesearch-oc-seaapi/public/v5/search` returns ids | `POST /product-display/public/v4/product-cards` takes several uids | The token comes from the `leshopch` header of `GET /authentication/public/v1/api/guest` and is sent back as a `leshopch` header. |
| Coop | `GET /rest/v2/coopathome/products/search/{q}?currentPage=0&pageSize=10&query=availableOnline:false&language=fr` | `GET /rest/v2/coopathome/products/{code}?language=fr`, one per code | Uses a mobile browser User-Agent. On sale: `originalPrice` is set, and `listPromotions[0]` holds the label. There is no end date. |
| Aldi | `GET /v3/product-search?q=…&servicePoint=E172&serviceType=walk-in&offset=0&limit=12` returns `data[]` | `GET /v2/products/{sku}?servicePoint=E172` returns `data`, one per sku | Akamai lets the request through only with browser CORS headers (Origin and Referer set to aldi-suisse.ch, `Sec-Fetch-*`) and an `Accept-Encoding` header over HTTP/2. `ChainHttp` asks every chain for gzip and decodes it, since the JDK client can't decode Brotli. The price is `price.amount` in centimes. On sale: `price.wasPriceDisplay` is set ("CHF 3.79"). There is no end date. |
| Lidl | Done locally on the current leaflet | Done locally on the current leaflet | `GET /api/v1/CH/campaignGroups` lists the campaign ids, and `GET /api/v1/CH/campaigns/{id}` returns `products[]`, each with `id`, `title`, `mainPrice.{price,oldPrice,discount}` and a badge `AvailableInStoreFrom` such as "15.10. - 21.10.". Uses the Lidl Plus app headers. |

## Goals / Non-Goals

**Goals:**
- Each chain's shapes stay behind one `ChainClient` implementation that returns the shared `ChainProduct` record, so a chain's API change touches one class.

**Non-Goals:**
- Images, stock per store, regional prices, and automatic matching by name.
- Tying the user's shops to chains, for example showing only the Coop sale while in the Coop. Possible later through a `Shop.chain`.
- A price history. Nothing from the chains is stored except the codes.

## Decisions

1. **JDK `HttpClient` plus Jackson `JsonNode`, through one `ChainHttp` helper.**
   - `get` and `post` return a `JsonNode`, and any status other than 2xx throws.
   - Connect and request timeouts are 5 s.
   - Each client adds its own headers.
   - Base URLs come from config (`restok.catalog.<chain>-url`, defaulting to the real hosts), and `%test` points all four at WireMock. The paths don't overlap.
   - Parsers read fields with `path(...)`, so a missing field becomes null or 0 instead of an exception. No DTOs mirror the chains' payloads.
   - Alternative considered: four MicroProfile REST client interfaces. They would add 4 interfaces and 4 config keys for no gain, since the paths are fixed and the answers are parsed as trees anyway.

2. **`ChainClient`, one implementation per chain.**
   - It has three methods: `chain()`, `search(query)` (at most 10 results) and `products(codes)`, which returns the products found and omits unknown codes.
   - **Migros** keeps its guest token in a field. On a 401 or 403 it drops the token, fetches a new one and retries the call once.
   - **Lidl** keeps the parsed leaflet in a field for 1 hour.
   - Sale rules:
     - Migros: a promotion counts only while its date range includes today in `Europe/Zurich`, with today passed to the parser so tests can fix it.
     - Coop and Aldi: an item is on sale when the chain reports a higher original price.
     - Lidl: an item is on sale when `oldPrice` is set. The end date comes from the badge's last `dd.MM.`, using this year, or next year when that date is more than 6 months in the past.

3. **The `Catalog` service handles caching, batching and isolation.**
   - The cache is a `ConcurrentHashMap<(Chain, code), (ChainProduct, Instant)>` with a 1 h TTL. Search results feed it too. `ponytail:` it is unbounded, but only linked and searched products land in it (hundreds at most). Swap it for `quarkus-cache` if it grows.
   - `products(Map<Chain, Set<String>>)` serves cached codes first. It then calls each chain once for the rest. A chain that throws is logged as a warning, and its codes stay unresolved.
   - `search(chain, query)` wraps any failure into `GraphQLException("<Chain> is unavailable")`.

4. **GraphQL.**
   - `CatalogGraphQLApi` provides `@Query chainSearch(@NonNull Chain chain, @NonNull String query): [ChainProduct!]!`. A blank query throws a `GraphQLException` before any call.
   - It also provides `links(@Source List<Product>): List<List<ProductLink>>`. SmallRye batches the source field, so one `products` query triggers one `Catalog.products` call.
   - `@Mutation("setProductLink")` goes in `ProductGraphQLApi`, next to `setProductShop`.
   - The records are `ChainProduct(chain, code, name, description, quantity, price, url, sale)`, `Sale(label, price, endDate)` and `ProductLink(chain, code, product)`.

5. **Storage.**
   - `Product.links` is a `Map<Chain, String>` `@ElementCollection` (eager, since GraphQL serializes after the session closes), stored in table `product_link (product_id, chain, code)`.
   - The primary key is `(product_id, chain)`, which enforces one link per chain. `product_id` uses `on delete cascade`.
   - The Java field is `codes`, marked `@Ignore` so GraphQL exposes only the resolved `links`.
   - The table comes from Flyway `V3__product_link.sql`.

6. **Frontend.**
   - **`grocery.graphql`**: `products { … links { chain code product { …ChainProduct } } }`, plus a `ChainSearch` query and a `SetProductLink` mutation.
   - **`basket.ts`**: `Item.links?: ProductLink[]`, `CHAINS` (value and display name), and a `firstSale(item)` helper.
   - **`Grocery`** passes `searchChain(chain, q)` down through `GroceryScreen` to `ProductPopup` (same pattern as `classify`), and handles a `linkChange` output like `shopChange`.
   - **`ProductPopup`** gets a "Prices" section:
     - one row per link: details, sale line, "View" link (`target="_blank" rel="noopener"`) and Unlink;
     - a search form with a chain `<select>`, submitted on Enter or with the button;
     - result buttons.
   - **`ItemTile`** gets a `sale` input (text such as "Migros Hit"). The badge sits in the top row of To-buy tiles, and the accessible label adds `on sale at <sale>`.

## Risks / Trade-offs

- **A chain changes or blocks its endpoints.** Failure isolation is per chain, and each chain has one parser tested against a fixture trimmed from the live payload of 2026-10-18.
- **Bot protection** (Coop DataDome, Aldi Akamai). The headers can be changed in one place per client, and a block only empties that chain's details.
- **Terms of use.** Volume stays low by design: one batch per chain per hour for the linked set, and searches only on submit.
- **Lidl links expire with the leaflet.** The link is kept and the popup says "Not available right now"; the user can relink or unlink.
- **Coop and Aldi detail calls are one per product.** They are cached for 1 hour, and a list has tens of linked products at most.
