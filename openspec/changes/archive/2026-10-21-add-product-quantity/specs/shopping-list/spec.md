## MODIFIED Requirements

### Requirement: List products
The GraphQL API SHALL provide a `products` query returning every product with its UUID `id`, `name`, `quantity`, `bought`, `boughtAt` (when it was last marked bought, null when not bought), `category` (null when uncategorized), `classification` (`PENDING`, `CLASSIFIED`, or `UNCLASSIFIED`), and `shop` (the only shop to buy it at, null when it can be bought anywhere). Without a shop argument, products SHALL be sorted by name.

#### Scenario: Products exist
- **WHEN** products "tomato" and "apple" are stored and a client queries `products { id name bought }`
- **THEN** the response lists "apple" then "tomato"

#### Scenario: No products
- **WHEN** no products are stored and a client queries `products`
- **THEN** the response is an empty list

#### Scenario: Shop of a product
- **WHEN** "parmesan" is restricted to "Lidl" and "apple" is not, and a client queries `products { name shop { name } }`
- **THEN** "parmesan" has shop "Lidl" and "apple" has a null shop

#### Scenario: Quantity of a product
- **WHEN** "apple" was added with quantity 3 and "tomato" without one, and a client queries `products { name quantity }`
- **THEN** "apple" has quantity 3 and "tomato" has quantity 1

### Requirement: Add a product
The GraphQL API SHALL provide an `addProduct(name, quantity)` mutation that stores a product with a generated UUID, the given `quantity` (1 when omitted), `bought` false, no category, no shop, and `classification` `PENDING`, and returns it without waiting for classification. The name SHALL be trimmed and stored as given, without reading a number from it. A blank name, or a quantity below 1, SHALL be rejected with a GraphQL error and nothing stored.

#### Scenario: Valid name
- **WHEN** a client calls `addProduct(name: " tomato ")`
- **THEN** the response contains a product named "tomato" with a new UUID, quantity 1, `bought` false, no category, no shop, and `classification` `PENDING`

#### Scenario: With a quantity
- **WHEN** a client calls `addProduct(name: "apple", quantity: 3)`
- **THEN** the response contains a product named "apple" with quantity 3

#### Scenario: Name is not parsed by the API
- **WHEN** a client calls `addProduct(name: "2 apples")`
- **THEN** the response contains a product named "2 apples" with quantity 1

#### Scenario: Blank name
- **WHEN** a client calls `addProduct(name: "  ")`
- **THEN** the response contains an error and no product is stored

#### Scenario: Quantity below 1
- **WHEN** a client calls `addProduct(name: "apple", quantity: 0)`
- **THEN** the response contains an error and no product is stored

### Requirement: Update a product
The GraphQL API SHALL provide an `updateProduct(id, input)` mutation that returns the product. Every input field (`name`, `quantity`, `bought`, `categoryId`, `shopId`) SHALL be optional: a missing or null field SHALL leave that property unchanged, and an empty input SHALL change nothing. An unknown id, or any invalid field, SHALL be rejected with a GraphQL error and no field changed. The `setProductBought`, `setProductCategory` and `setProductShop` mutations SHALL NOT exist.

#### Scenario: Several fields at once
- **WHEN** a client calls `updateProduct` on "parmesan" with `bought` true and `shopId` <Lidl>
- **THEN** the response shows "parmesan" bought and restricted to "Lidl"

#### Scenario: Empty input
- **WHEN** a client calls `updateProduct` on "apple" with an empty input
- **THEN** the response shows "apple" with its name, quantity, bought flag, category and shop unchanged

#### Scenario: One invalid field changes nothing
- **WHEN** a client calls `updateProduct` on "apple" with `bought` true and a `shopId` that does not exist
- **THEN** the response contains an error and "apple" is still not bought

#### Scenario: Unknown product
- **WHEN** a client calls `updateProduct` with an id that does not exist
- **THEN** the response contains an error

#### Scenario: Old mutations gone
- **WHEN** a client calls `setProductBought`, `setProductCategory` or `setProductShop`
- **THEN** the response contains a validation error

### Requirement: No duplicate products from the screen
Adding a name from the add bar that matches an existing product, ignoring case, SHALL put that product back on the To-buy list instead of creating a second product. The name compared SHALL be the one left after reading the quantity, and the existing product SHALL get that quantity (1 when none was typed).

#### Scenario: No duplicate on add
- **WHEN** "Apple" is in Bought and the user adds "apple"
- **THEN** "Apple" returns to To buy and no second product is created

#### Scenario: Re-add with a quantity
- **WHEN** "apple" is in Bought with quantity 1 and the user adds "3 apple"
- **THEN** "apple" returns to To buy with quantity 3 and no second product is created

#### Scenario: Re-add without a quantity
- **WHEN** "apple" is in Bought with quantity 3 and the user adds "apple"
- **THEN** "apple" returns to To buy with quantity 1

### Requirement: Products persist
Stored products, with their quantity, bought flag, category and shop, SHALL survive an application restart.

#### Scenario: Restart
- **WHEN** a classified, bought product with quantity 2, restricted to a shop, is stored and the application restarts
- **THEN** `products` still returns it with the same quantity, category, bought flag and shop

## ADDED Requirements

### Requirement: Set a product's quantity
`updateProduct`'s `quantity` field SHALL set the product's quantity. A quantity below 1 SHALL be rejected with a GraphQL error and the product left unchanged. Changing the quantity SHALL keep every other property.

#### Scenario: Change the quantity
- **WHEN** a client calls `updateProduct` on "apple" with `quantity` 4
- **THEN** the response and a following `products` query show "apple" with quantity 4

#### Scenario: Quantity below 1
- **WHEN** a client calls `updateProduct` on "apple" with `quantity` 0
- **THEN** the response contains an error and "apple" keeps its quantity

### Requirement: Quantity read from the add bar
When the user adds a product from the add bar, a whole number from 1 to 999 typed as the first or the last word, alone or with an "x" or "×" stuck to it (any case), SHALL become the product's quantity and be removed from its name. Without such a number the quantity SHALL be 1 and the name kept whole. Numbers inside the name or stuck to other letters (e.g. "500g") SHALL stay in the name. Text that is only a number SHALL be kept as the name with quantity 1.

#### Scenario: Leading number
- **WHEN** the user adds "2 apples"
- **THEN** a product "apples" with quantity 2 is added

#### Scenario: Number with x
- **WHEN** the user adds "3x eggs", "eggs x3" or "eggs 3"
- **THEN** a product "eggs" with quantity 3 is added

#### Scenario: No number
- **WHEN** the user adds "apples"
- **THEN** a product "apples" with quantity 1 is added

#### Scenario: Number glued to a unit
- **WHEN** the user adds "500g butter"
- **THEN** a product "500g butter" with quantity 1 is added

#### Scenario: Only a number
- **WHEN** the user adds "7"
- **THEN** a product "7" with quantity 1 is added

### Requirement: Quantity on each tile
A tile whose product has a quantity above 1 SHALL show the name as `{quantity}x {name}`, e.g. "2x apples", on both To-buy and Bought tiles, and the accessible label SHALL start the same way. A product with quantity 1 SHALL show its name alone.

#### Scenario: Quantity shown
- **WHEN** "apples" has quantity 2
- **THEN** its tile reads "2x apples"

#### Scenario: Quantity 1 hidden
- **WHEN** "apples" has quantity 1
- **THEN** its tile reads "apples" with no quantity

### Requirement: Quantity from the popup
The product popup SHALL show a whole-number field labelled "Quantity" holding the product's quantity, separate from the name. A changed value of 1 or more SHALL be saved with `updateProduct` when the field loses focus or on Enter, and the tile SHALL show it at once. An empty, below-1 or unchanged value SHALL save nothing and put the saved quantity back. Editing the name SHALL NOT read a quantity from it. A product not saved yet SHALL have no quantity field.

#### Scenario: Change from the popup
- **WHEN** the user long-presses "apples", sets Quantity to 3 and presses Enter
- **THEN** `updateProduct` is called with quantity 3 and the tile reads "3x apples"

#### Scenario: Back to one
- **WHEN** the user sets Quantity of "3x apples" to 1
- **THEN** `updateProduct` is called with quantity 1 and the tile reads "apples"

#### Scenario: Invalid quantity
- **WHEN** the user sets Quantity to 0 and closes the popup
- **THEN** `updateProduct` is not called and the product keeps its quantity

#### Scenario: Rename does not parse
- **WHEN** the user renames "apples" to "2 apples" in the popup
- **THEN** `updateProduct` is called with name "2 apples" and the quantity is unchanged
