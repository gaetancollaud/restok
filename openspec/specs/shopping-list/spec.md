# shopping-list Specification

## Purpose

Manages the products to buy: each has a name, a bought flag, and an optional category set by AI or by hand. The list can be sorted to follow a chosen shop's category order.

## Requirements

### Requirement: List products
The GraphQL API SHALL provide a `products` query returning every product with its UUID `id`, `name`, `bought`, `boughtAt` (when it was last marked bought, null when not bought), `category` (null when uncategorized), and `classification` (`PENDING`, `CLASSIFIED`, or `UNCLASSIFIED`). Without a shop argument, products SHALL be sorted by name.

#### Scenario: Products exist
- **WHEN** products "tomato" and "apple" are stored and a client queries `products { id name bought }`
- **THEN** the response lists "apple" then "tomato"

#### Scenario: No products
- **WHEN** no products are stored and a client queries `products`
- **THEN** the response is an empty list

### Requirement: Products sorted for a shop
With a `shopId` argument, `products` SHALL sort products by their category's position in that shop's category order, then by name. Products whose category is not in the shop's order, and uncategorized products, SHALL come after all ordered ones, sorted by name. An unknown shop SHALL be rejected with a GraphQL error.

#### Scenario: Shop order applied
- **WHEN** shop "Coop" orders [Pain, Fruits], products are "apple" (Fruits), "baguette" (Pain), "feta" (Fromage), and "foo" (none), and a client queries `products(shopId: <Coop>)`
- **THEN** the response lists "baguette", "apple", "feta", "foo"

#### Scenario: Different shop, different order
- **WHEN** shop "Migros" orders [Fruits, Pain] with the same products
- **THEN** `products(shopId: <Migros>)` lists "apple", "baguette", "feta", "foo"

### Requirement: Add a product
The GraphQL API SHALL provide an `addProduct(name)` mutation that stores a product with a generated UUID, `bought` false, no category, and `classification` `PENDING`, and returns it without waiting for classification. The name SHALL be trimmed. A blank name SHALL be rejected with a GraphQL error and nothing stored.

#### Scenario: Valid name
- **WHEN** a client calls `addProduct(name: " tomato ")`
- **THEN** the response contains a product named "tomato" with a new UUID, `bought` false, no category, and `classification` `PENDING`

#### Scenario: Blank name
- **WHEN** a client calls `addProduct(name: "  ")`
- **THEN** the response contains an error and no product is stored

### Requirement: Background AI classification
After a product is added, the system SHALL ask the AI model to choose one of the existing categories for the product's name. If the answer matches a category name (ignoring case and surrounding whitespace), the product SHALL get that category and `classification` `CLASSIFIED`. Otherwise the product SHALL keep no category and get `UNCLASSIFIED`.

#### Scenario: Category found
- **WHEN** product "apple" is added and the model answers "fruits"
- **THEN** a later `products` query shows "apple" in category "Fruits" with `classification` `CLASSIFIED`

#### Scenario: No matching category
- **WHEN** product "batteries" is added and the model answers a name that is not a category
- **THEN** a later `products` query shows "batteries" with no category and `classification` `UNCLASSIFIED`

### Requirement: Classification failure isolation
If the AI call fails or exceeds the configured AI timeout, the product SHALL end with no category and `classification` `UNCLASSIFIED`. The failure SHALL NOT fail the `addProduct` call or affect other requests.

#### Scenario: Upstream error
- **WHEN** a product is added and OpenRouter returns a 5xx
- **THEN** `addProduct` succeeds, the product later shows `UNCLASSIFIED`, and the application stays ready

### Requirement: Set a product's category by hand
The GraphQL API SHALL provide a `setProductCategory(id, categoryId)` mutation that sets the product's category, or clears it when `categoryId` is null, and returns the product. Setting a category SHALL set `classification` to `CLASSIFIED`; clearing it SHALL set `UNCLASSIFIED`. An unknown product or category SHALL be rejected with a GraphQL error.

#### Scenario: Correct the AI
- **WHEN** a client sets category "Légumes" on product "tomato"
- **THEN** "tomato" shows category "Légumes" and `classification` `CLASSIFIED`

### Requirement: Manual choice wins over late classification
A category set or cleared by hand SHALL NOT be overwritten by a background classification that finishes afterwards.

#### Scenario: Manual set while pending
- **WHEN** a client sets the category of a product whose classification is still `PENDING`, and the AI answer arrives later
- **THEN** the product keeps the category chosen by hand

### Requirement: Mark a product bought
The GraphQL API SHALL provide a `setProductBought(id, bought)` mutation that sets the product's bought flag and returns the product. Marking a product bought SHALL record the current time as `boughtAt`; marking it not bought SHALL clear `boughtAt`. Bought products SHALL stay in the list. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Check and uncheck
- **WHEN** a client calls `setProductBought` with true and then with false on the same product
- **THEN** the product shows `bought` true after the first call and false after the second

#### Scenario: Bought time recorded
- **WHEN** a client marks a product bought and then not bought
- **THEN** `boughtAt` is set after the first call and null after the second

### Requirement: Delete a product
The GraphQL API SHALL provide a `deleteProduct(id)` mutation that removes the product and returns the deleted id. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Delete
- **WHEN** a client deletes a product
- **THEN** it no longer appears in `products`

### Requirement: Products persist
Stored products, with their bought flag and category, SHALL survive an application restart.

#### Scenario: Restart
- **WHEN** a classified, bought product is stored and the application restarts
- **THEN** `products` still returns it with the same category and bought flag

### Requirement: Grocery screen in the SPA
The SPA SHALL open on a single grocery screen with a shop dropdown, a To-buy grid, a Bought grid and an add bar. To-buy products SHALL be sorted in the selected shop's category order, with products in other categories or uncategorized last, then by name.

#### Scenario: Pick a shop
- **WHEN** shop "Coop" orders [Pain, Fruits] and the user selects "Coop"
- **THEN** "baguette" (Pain) is shown before "apple" (Fruits) in To buy

### Requirement: Buy and add again from the screen
Tapping a To-buy product twice within a short time SHALL mark it bought and show it first in the Bought grid, which lists products most recently bought first; a single tap SHALL do nothing. Tapping a Bought product once SHALL mark it not bought and return it to To buy.

#### Scenario: Buy and add again
- **WHEN** the user double-taps "apple" in To buy, then taps "apple" in Bought
- **THEN** "apple" first moves to the top of Bought, then returns to To buy

#### Scenario: Stray tap
- **WHEN** the user taps "apple" in To buy once
- **THEN** "apple" stays in To buy

### Requirement: No duplicate products from the screen
Adding a name from the add bar that matches an existing product, ignoring case, SHALL put that product back on the To-buy list instead of creating a second product.

#### Scenario: No duplicate on add
- **WHEN** "Apple" is in Bought and the user adds "apple"
- **THEN** "Apple" returns to To buy and no second product is created

### Requirement: Category status on each tile
Every tile on the grocery screen SHALL show the product's classification state as a dot: a hollow orange ring while `PENDING`, a green disc when `CLASSIFIED`, a red disc when `UNCLASSIFIED`. The tile's accessible label SHALL name the state too: the category name when classified, "sorting into a category" while pending, "no category" when unclassified.

#### Scenario: New product while the AI works
- **WHEN** the user adds "pomme"
- **THEN** its tile shows the orange ring and is labelled "pomme, sorting into a category, mark as bought"

#### Scenario: Classified and unclassified
- **WHEN** "pomme" is classified as Fruits and "bougies" gets no category
- **THEN** "pomme" shows the green disc labelled "pomme, Fruits, mark as bought" and "bougies" shows the red disc labelled "bougies, no category, mark as bought"

### Requirement: Category name on each tile
Every To-buy tile SHALL show a light one-line text left of the status dot: the category name when `CLASSIFIED`, "Sorting…" in italic while `PENDING`, "No category" when `UNCLASSIFIED`. Bought tiles SHALL NOT show this text; their dot and accessible label still carry the state.

#### Scenario: To-buy tiles name their category
- **WHEN** "pomme" is classified as Fruits, "gruyère" is pending and "bougies" has no category
- **THEN** their tiles read "Fruits", "Sorting…" and "No category" beside the dot

#### Scenario: Bought tile
- **WHEN** "pomme" is marked bought
- **THEN** its Bought tile shows the dot but no category text

### Requirement: Grocery screen updates without reload
Changes SHALL appear on the grocery screen without a manual reload, including a category found by background classification.

#### Scenario: Classification appears
- **WHEN** the user adds "pomme" and the AI later classifies it as Fruits
- **THEN** the tile moves to the Fruits position of the selected shop without a reload
