# Design

## Context

The only business code today is the placeholder `item` package: a Panache reactive repository, a `@GraphQLApi` class that returns `Uni`, and `V1__item.sql`. Hibernate validates the model against the Flyway schema (`schema-management.strategy=validate`). SmallRye GraphQL generates the schema; `SchemaSnapshotTest` keeps `src/main/webui/schema.graphql` in sync, and the Angular client is generated from that snapshot. UUIDs are exposed as `String!`. `AiChat` (langchain4j, OpenRouter) returns a streaming `Multi<String>` and is tested with WireMock dev services. `NonBlockingTest` must cover every GraphQL operation. See proposal.md for the motivation.

## Goals / Non-Goals

**Goals:**
- Follow the `item` code pattern (entity + Panache repository + `@GraphQLApi` returning `Uni`) for each new package.
- Keep every request and the background classification non-blocking.
- Back critical rules with database constraints, and validate in the app so users get readable GraphQL errors.

**Non-Goals:**
- Multiple lists, users, or sharing. There is one global list.
- Renaming a product, re-running classification on demand, clearing bought items in bulk.
- Finding the nearest shop from the device location. The GPS location is stored only.
- A durable job queue for classification (see Risks).

## Decisions

### Schema: replace `V1__item.sql` with `V1__shopping_domain.sql`
- `product_category(id uuid pk, name text not null)` with `unique index on lower(name)`.
- `shop(id uuid pk, name text not null, latitude double precision not null check (-90..90), longitude double precision not null check (-180..180))`.
- `shop_category_order(shop_id uuid fk → shop on delete cascade, category_id uuid fk → product_category on delete cascade, position int not null, primary key (shop_id, category_id))`.
- `product(id uuid pk, name text not null, bought boolean not null default false, category_id uuid null fk → product_category on delete set null, classification text not null check in ('PENDING','CLASSIFIED','UNCLASSIFIED'))`.
- Seed the default categories, in French, with `gen_random_uuid()` (built into PostgreSQL 13+): Fruits, Légumes, Pain, Fromage, Produits laitiers, Viande, Poisson, Boissons, Surgelés, Ménage.

The FK actions implement "delete category → products uncategorized, removed from shop orders" and "delete shop → its order goes too" with no app code. V1 is rewritten instead of adding V2 because it was never deployed, so the "released migrations are immutable" rule does not apply yet.

### Shop category order: an explicit join entity, not `@ManyToMany @OrderColumn`
A `ShopCategory` entity maps `shop_category_order` with the composite key (shop, category) and a `position` column. `setShopCategoryOrder` deletes the shop's rows and inserts the new list with positions 0..n-1 in one transaction. Reads use `order by position`.

Alternative: `@ManyToMany @OrderColumn List<ProductCategory>` on `Shop`. Rejected: Hibernate assumes the positions have no gaps, but a DB cascade on category delete leaves gaps, which show up as `null` list entries. Hibernate's in-place index updates also clash with the primary key. With the explicit entity, gaps do not matter because we only sort by position.

`Shop.categoryOrder` is exposed as a GraphQL field through a batched `@Source List<Shop>` resolver that runs one query for all shops in a response. A per-shop resolver would also work, but concurrent per-shop calls could share one Hibernate Reactive session.

### Shop-sorted product query in HQL
```
select p from Product p
left join fetch p.category c
left join ShopCategory sc on sc.category = c and sc.shop.id = :shopId
order by sc.position nulls last, p.name
```
Without `shopId`, use `left join fetch p.category order by p.name`. Uncategorized products and products in unordered categories both have a null `sc.position`, so they come last and are sorted by name, as the spec requires. An unknown `shopId` is checked first with `findById`.

### Background classification over the Vert.x event bus
`addProduct` persists inside an explicit `Panache.withTransaction(...)`. After the transaction commits, it calls `eventBus.send("product.classify", id.toString())` and returns the product. The method is not annotated with `@WithTransaction`, because then the event would be sent before the commit and the consumer could miss the row.

A `@ConsumeEvent("product.classify")` method in `product.ClassificationConsumer` returns `Uni<Void>`. Quarkus runs it on a fresh duplicated Vert.x context, so it gets its own Hibernate Reactive session, and it never blocks. It:
1. Loads the product and all category names.
2. Calls `ai.ProductClassifier`, a dedicated `@RegisterAiService`. Its prompt is in French and declared with annotations: `@SystemMessage` lists the categories and asks for exactly one category name from the list, or AUCUNE; `@UserMessage` is "Produit : {product}". It collects the streamed answer into one string.
3. Matches the trimmed answer against the names, ignoring case.
4. Runs `update Product set category = :c, classification = :status where id = :id and classification = PENDING`.

On any failure, including the existing `quarkus.langchain4j.openai.timeout`, it recovers to `UNCLASSIFIED` through the same conditional update.

The conditional `where classification = PENDING` is what lets a manual choice win: `setProductCategory` always moves the status away from `PENDING`, so a late AI result updates zero rows.

Alternatives: (a) Subscribe fire-and-forget from the request's context. Rejected: the request's Hibernate session context is reused after it closes, which is fragile. (b) A scheduled sweep or a job table. Rejected for now: it adds a dependency and moving parts. It is listed as the upgrade path below. No new dependency is needed: `quarkus-vertx` is already on the classpath.

The event payload is a `String` so that no codec is needed.

### GraphQL surface
Entities are exposed directly as GraphQL types, like `Item` today. `ProductClassification` is a Java enum stored with `@Enumerated(STRING)` and becomes a GraphQL enum. Every mutation validates its input and reports errors as `GraphQLException("<message>")`, following `ItemGraphQLApi` (for example "name must not be blank", "shop not found", "category name already exists", "duplicate category in order"). Category name uniqueness is checked with a query first; the unique index is the backstop for races. Deletes return the deleted id. They use a bulk HQL `delete ... where id = ?` instead of Panache `deleteById`: under concurrent requests, entity removal failed with HR000069 (session used from another event loop), and the DB foreign keys handle the cascades anyway. SmallRye strips a `set` prefix from mutation names, so `set*` mutations declare their name explicitly.

### Frontend
The `items/` folder is replaced by three standalone components: `list/` (route `list`, the default), `shops/`, and `categories/`. Each has a `.graphql` operations file, as `items` does today. `app.ts` gains a nav with three `routerLink`s.

Every component, `app` included, is split into three files: `<name>.ts` (class), `<name>.html` (`templateUrl`) and `<name>.css` (`styleUrl`, kept even when empty). No inline `template` or `styles`.

On the list page, the shop selector is a native `<select>` that re-runs `products(shopId)`. The query calls `startPolling(2000)` while any product is `PENDING` and `stopPolling()` otherwise. Mutations refetch the affected queries, like `items.ts`. The shop page reorders categories with up/down buttons (no drag-and-drop library). Latitude and longitude use `<input type="number" step="any">`.

### Configuration
Configuration moves from `application.properties` to `application.yaml` (`quarkus-config-yaml`), with the same keys and profiles. Dev mode starts only PostgreSQL: `quarkus.observability.enabled: false` turns off the Grafana LGTM Dev Service, which was starting a `grafana/otel-lgtm` container.

### Tests
- One `@QuarkusTest` class per API (`ShopGraphQLApiTest`, `CategoryGraphQLApiTest`, `ProductGraphQLApiTest`). Each cleans its tables over JDBC in `@BeforeEach`, as `ItemGraphQLApiTest` does. Delete products and shops only; keep the seeded categories, or reset them with a known set per test.
- The classification test uses `@ConnectWireMock` with an SSE stub, as in `AiChatTest`. It waits with a small poll loop over the `products` query (5 s deadline) because Awaitility is not on the test classpath.
- `NonBlockingTest` runs `addProduct` and `products` (with and without `shopId`), plus one call to each of the other mutations.
- `MigrationTest` keeps asserting that V1 was applied once, and also asserts that the default categories exist.

## Risks / Trade-offs

- [A pod dies or restarts after `addProduct` commits but before classification finishes, so the product stays `PENDING` forever] → The UI shows it as pending and the user can set a category by hand. Upgrade path: on startup or on a schedule, re-send events for products that have been `PENDING` for longer than the AI timeout.
- [Prompt injection through the product name] → The model's answer is only matched against existing category names, so the worst case is a wrong or missing category, which the user can fix.
- [Many products added at once fire many concurrent AI calls] → Fine for a personal list. If it ever matters, throttle with a bounded concurrency on the consumer (`@ConsumeEvent(ordered = true)`, or a Mutiny semaphore).
- [`order by name` follows the database collation, so upper- and lower-case names may sort differently across environments] → Same behavior as the current `items` query. Switch to `lower(name)` if it becomes a problem.
- [A local database (docker-compose) that already applied the old V1 fails at startup with a Flyway checksum mismatch] → Reset that local database volume. Dev Services and test databases are fresh on every start, so they are not affected.

## Migration Plan

Nothing to migrate: the application has never been deployed, so the first deploy applies the new V1 on an empty database.
