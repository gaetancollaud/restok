# Proposal

## Why

A typo in a product name ("tomatoe") can only be fixed today by deleting the product and adding it again, which loses its category and shop. The long-press popup already edits the category and shop; the name should be editable there too. Each product field also has its own `setProductX` mutation, and more product edits are coming: one `updateProduct` mutation keeps the API from growing a mutation per field. Categories get the same shape now (`updateCategory` instead of `renameCategory`), so both entities follow one convention.

## What Changes

- New `updateProduct(id, input)` GraphQL mutation. Every input field is optional: `name`, `bought`, `categoryId`, `shopId`. A missing or null field is left unchanged; an empty input changes nothing.
- An empty string clears: `categoryId: ""` removes the category, `shopId: ""` removes the shop restriction.
- All or nothing: one invalid field (unknown category or shop, blank or taken name) rejects the whole call and nothing changes.
- **BREAKING**: `setProductBought`, `setProductCategory` and `setProductShop` are removed. The SPA is their only client and moves to `updateProduct` in the same change.
- The name is trimmed; a blank name or one another product already has (ignoring case) is rejected. Renaming keeps category, classification, shop and bought state, with no new AI classification.
- New `updateCategory(id, input)` mutation with the same rules; its only field for now is an optional `name`, checked by the existing category name rules.
- **BREAKING**: `renameCategory` is removed. The Shops panel's category rename moves to `updateCategory`.
- The product popup's title becomes an editable name field, saved on change (blur or Enter); the tile shows it at once. A product not saved yet keeps a read-only title.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: adds `updateProduct` and the editable name in the product popup; the bought, category and shop requirements move from their own mutations to `updateProduct` fields.
- `product-categories`: "Rename a category" moves from `renameCategory` to `updateCategory`.
- `shops`: the Shops panel's category rename saves with `updateCategory`.

## Impact

- Backend: `ProductGraphQLApi` (new mutation and input type, three mutations removed), `ProductRepository` (case-insensitive name lookup), `ProductGraphQLApiTest` (set-mutation tests migrated), `CategoryGraphQLApi` + `CategoryGraphQLApiTest` (`renameCategory` replaced), `src/main/webui/schema.graphql` snapshot.
- Frontend: `grocery.graphql` (three product mutations and `RenameCategory` replaced, regenerated types), `grocery.ts`/`grocery.html`/`grocery.spec.ts`, `grocery-screen.ts`/`.html`, `product-popup.ts`/`.html`/`.css`, and their spec tests.
- No schema migration: `product.name` already exists.
