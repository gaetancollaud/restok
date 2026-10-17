# Spec Delta

## MODIFIED Requirements

### Requirement: List products
The GraphQL API SHALL provide a `products` query returning every product with its UUID `id`, `name`, `bought`, `boughtAt` (when it was last marked bought, null when not bought), `category` (null when uncategorized), and `classification` (`PENDING`, `CLASSIFIED`, or `UNCLASSIFIED`). Without a shop argument, products SHALL be sorted by name.

#### Scenario: Products exist
- **WHEN** products "tomato" and "apple" are stored and a client queries `products { id name bought }`
- **THEN** the response lists "apple" then "tomato"

#### Scenario: No products
- **WHEN** no products are stored and a client queries `products`
- **THEN** the response is an empty list

### Requirement: Mark a product bought
The GraphQL API SHALL provide a `setProductBought(id, bought)` mutation that sets the product's bought flag and returns the product. Marking a product bought SHALL record the current time as `boughtAt`; marking it not bought SHALL clear `boughtAt`. Bought products SHALL stay in the list. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Check and uncheck
- **WHEN** a client calls `setProductBought` with true and then with false on the same product
- **THEN** the product shows `bought` true after the first call and false after the second

#### Scenario: Bought time recorded
- **WHEN** a client marks a product bought and then not bought
- **THEN** `boughtAt` is set after the first call and null after the second

## REMOVED Requirements

### Requirement: Shopping list page in the SPA
**Reason**: The test UI is replaced by the single grocery screen.
**Migration**: Use the grocery screen (see "Grocery screen in the SPA").

## ADDED Requirements

### Requirement: Grocery screen in the SPA
The SPA SHALL open on a single grocery screen with a shop dropdown, a To-buy grid, a Bought grid and an add bar. To-buy products SHALL be sorted in the selected shop's category order, with products in other categories or uncategorized last, then by name.

#### Scenario: Pick a shop
- **WHEN** shop "Coop" orders [Pain, Fruits] and the user selects "Coop"
- **THEN** "baguette" (Pain) is shown before "apple" (Fruits) in To buy

### Requirement: Buy and add again from the screen
Tapping a To-buy product SHALL mark it bought and show it first in the Bought grid, which lists products most recently bought first. Tapping a Bought product SHALL mark it not bought and return it to To buy.

#### Scenario: Buy and add again
- **WHEN** the user taps "apple" in To buy, then taps "apple" in Bought
- **THEN** "apple" first moves to the top of Bought, then returns to To buy

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
