## Purpose

Links products on the list to products of the supermarket chains Migros, Coop, Aldi and Lidl, so the list can show their price, description and current sale, fetched from the chains.

## ADDED Requirements

### Requirement: Search a chain
The GraphQL API SHALL provide a `chainSearch(chain, query)` query, `chain` being one of `MIGROS`, `COOP`, `ALDI`, `LIDL`. It SHALL return up to 10 of that chain's products matching the trimmed query, in the chain's order. A blank query SHALL be rejected with a GraphQL error. Lidl SHALL search only the products of its current leaflet.

#### Scenario: Search Migros
- **WHEN** a client queries `chainSearch(chain: MIGROS, query: "lait")` and Migros answers with products
- **THEN** the response lists at most 10 of them, the first being "Lait entier" with price 1.90, quantity "1l" and its migros.ch URL

#### Scenario: Search the other chains
- **WHEN** a client searches "lait" at Coop or Aldi, or "pommes" at Lidl, and the chain answers
- **THEN** the response lists that chain's matching products with their name and price

#### Scenario: Blank query
- **WHEN** a client queries `chainSearch(chain: COOP, query: "  ")`
- **THEN** the response contains an error and no chain is called

### Requirement: Chain product fields
A chain product SHALL have these fields:
- `chain` and `code` (the chain's product id);
- `name`, `description` and `quantity`;
- `price` (CHF, the regular price);
- `url` (its page on the chain's site);
- `sale`.

`description`, `quantity`, `url` and `sale` SHALL be null when the chain does not give them.

#### Scenario: Coop has no description
- **WHEN** a Coop product is returned
- **THEN** its `description` is null and its `quantity` combines Coop's content and unit, e.g. "1 l"

### Requirement: Link a product to chain products
The GraphQL API SHALL provide a `setProductLink(id, chain, code)` mutation. It links the product to that chain's product, replacing the product's earlier link to the same chain, or unlinks it from that chain when `code` is null. It returns the product. A product SHALL have at most one link per chain. Links SHALL survive a restart. An unknown product SHALL be rejected with a GraphQL error. The code SHALL be stored without contacting the chain.

#### Scenario: Link, relink and unlink
- **WHEN** a client links "lait" to Migros 100006357 and to Coop 4446520, then to Coop 3081654, then unlinks Migros
- **THEN** "lait" ends with one link: Coop 3081654

#### Scenario: Unknown product
- **WHEN** a client calls `setProductLink` with a product id that does not exist
- **THEN** the response contains an error

### Requirement: Chain details of a linked product
`Product.links` SHALL list the product's links in the order Migros, Coop, Aldi, Lidl. Each link has `chain`, `code` and `product`: the chain product with the same fields as a search result, or null when the chain doesn't know the code anymore or can't be reached. One `products` query SHALL make at most one batch of calls per chain.

#### Scenario: Linked product
- **WHEN** "lait" is linked to Migros 100006357 and a client queries `products { name links { chain code product { name price } } }`
- **THEN** "lait" has one Migros link with name "Lait entier" and price 1.90, and unlinked products have no links

#### Scenario: Lidl product left the leaflet
- **WHEN** a product is linked to a Lidl code that is not in the current leaflet
- **THEN** its Lidl link keeps the code and has a null `product`

### Requirement: Current sale
A chain product's `sale` SHALL be set when the chain reports it on sale today. `sale` has these fields:
- `label`: the chain's badge, e.g. "Hit" or "-23%", or "Sale" when the chain has none;
- `price`: the sale price in CHF;
- `endDate`: its last day, or null when the chain does not say.

When on sale, `price` SHALL be the regular price. Otherwise `sale` SHALL be null. Migros promotions SHALL count only while their date range includes today in `Europe/Zurich`.

#### Scenario: Migros on sale
- **WHEN** Migros reports "Kopfsalat" with badge "Hit", promotion price 2.95 and promotion dates 2026-10-15 to 2026-10-21, and today is 2026-10-18
- **THEN** its `sale` has label "Hit", price 2.95 and endDate 2026-10-21

#### Scenario: Coop on sale
- **WHEN** Coop reports a product at 2.95 with original price 3.80 and promotion "22%"
- **THEN** its `price` is 3.80 and its `sale` has label "22%", price 2.95 and a null endDate

#### Scenario: Not on sale
- **WHEN** a chain reports a product with no promotion
- **THEN** its `sale` is null

### Requirement: Chain failure isolation
When a chain is unreachable, answers with an error, or answers in an unexpected shape:
- `products` SHALL still succeed, keeping the links, with a null `product` for that chain's links only;
- `chainSearch` for that chain SHALL fail with the error "<Chain> is unavailable";
- other chains and other requests SHALL NOT be affected.

#### Scenario: Migros down
- **WHEN** "lait" is linked to Migros and Coop, and Migros returns a 5xx
- **THEN** `products` succeeds, the Migros link has a null `product`, the Coop link has its details, and `chainSearch(chain: MIGROS, …)` returns the error "Migros is unavailable"

### Requirement: Chain answers cached
Chain product details SHALL be reused for one hour after being fetched, so repeated `products` queries within the hour do not call the chain again for the same products. Failed fetches SHALL NOT be cached.

#### Scenario: Polling the list
- **WHEN** a client queries `products` twice within a minute with "lait" linked to Migros
- **THEN** Migros is called for its details only once

### Requirement: Link from the product popup
The product popup SHALL have a "Prices" section:
- one row per linked chain, showing that chain's details and an Unlink button that calls `setProductLink` with a null code;
- a search form with a chain picker, which lists the matching products (name, quantity, price) and links the tapped one with `setProductLink`.

A failed search SHALL show "<Chain> is unavailable" instead of results. A link whose `product` is null SHALL show "Not available right now" with its Unlink button.

#### Scenario: Link from a search
- **WHEN** the user opens the popup of "lait", picks Migros, searches "lait" and taps "Lait entier"
- **THEN** `setProductLink` is called with chain MIGROS and code "100006357"

#### Scenario: Unlink
- **WHEN** the user taps Unlink on the Coop row of a linked product
- **THEN** `setProductLink` is called with chain COOP and a null code

### Requirement: Chain details in the popup
For each link, the popup SHALL show:
- the chain name, the product name, its quantity and its price;
- its description and a link opening the chain's page in a new tab, when the chain gives them;
- when on sale: the sale label, the sale price, the regular price struck through when it differs, and "until" the last day when known.

#### Scenario: On sale in the popup
- **WHEN** the user opens the popup of a product linked to Migros "Kopfsalat", on sale "Hit" at 2.95 until 2026-10-21
- **THEN** the popup shows "Hit", 2.95 and "until 21.10."

### Requirement: Sale badge on tiles
A To-buy tile SHALL show a badge with the chain and the sale label of its first linked product on sale, in the order Migros, Coop, Aldi, Lidl. Its accessible label SHALL include "on sale at <Chain> <label>". Tiles without a linked product on sale, and Bought tiles, SHALL show no badge.

#### Scenario: Badge
- **WHEN** "salade" is linked to Migros "Kopfsalat", on sale "Hit", and is still to buy
- **THEN** its tile shows "Migros Hit" and its label reads "salade, Légumes, on sale at Migros Hit, tap twice to mark as bought"

#### Scenario: No link, no badge
- **WHEN** "pomme" is not linked
- **THEN** its tile shows no badge
