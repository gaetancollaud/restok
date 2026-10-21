## ADDED Requirements

### Requirement: Update a product
The GraphQL API SHALL provide an `updateProduct(id, input)` mutation that returns the product. Every input field (`name`, `bought`, `categoryId`, `shopId`) SHALL be optional: a missing or null field SHALL leave that property unchanged, and an empty input SHALL change nothing. An unknown id, or any invalid field, SHALL be rejected with a GraphQL error and no field changed. The `setProductBought`, `setProductCategory` and `setProductShop` mutations SHALL NOT exist.

#### Scenario: Several fields at once
- **WHEN** a client calls `updateProduct` on "parmesan" with `bought` true and `shopId` <Lidl>
- **THEN** the response shows "parmesan" bought and restricted to "Lidl"

#### Scenario: Empty input
- **WHEN** a client calls `updateProduct` on "apple" with an empty input
- **THEN** the response shows "apple" with its name, bought flag, category and shop unchanged

#### Scenario: One invalid field changes nothing
- **WHEN** a client calls `updateProduct` on "apple" with `bought` true and a `shopId` that does not exist
- **THEN** the response contains an error and "apple" is still not bought

#### Scenario: Unknown product
- **WHEN** a client calls `updateProduct` with an id that does not exist
- **THEN** the response contains an error

#### Scenario: Old mutations gone
- **WHEN** a client calls `setProductBought`, `setProductCategory` or `setProductShop`
- **THEN** the response contains a validation error

### Requirement: Rename a product
`updateProduct`'s `name` field SHALL set the product's name, trimmed. A blank name, or a name another product already has (ignoring case), SHALL be rejected. Renaming SHALL keep the product's category, classification, shop and bought state, and SHALL NOT start a new classification.

#### Scenario: Fix a typo
- **WHEN** "tomatoe" is in category "Légumes", restricted to "Coop", and a client calls `updateProduct` with its id and name " tomato "
- **THEN** the response and a following `products` query show "tomato" with category "Légumes", `classification` `CLASSIFIED` and shop "Coop"

#### Scenario: Change only the case
- **WHEN** a client calls `updateProduct` on "apple" with name "Apple"
- **THEN** the product is named "Apple"

#### Scenario: Blank name
- **WHEN** a client calls `updateProduct` with name "  "
- **THEN** the response contains an error and the product keeps its name

#### Scenario: Name taken
- **WHEN** products "apple" and "aple" exist and a client calls `updateProduct` on "aple" with name "APPLE"
- **THEN** the response contains an error and "aple" keeps its name

### Requirement: Name from the popup
The product popup's title SHALL be a text field holding the product's name, labelled "Name". A changed name SHALL be saved with `updateProduct` when the field loses focus or on Enter, and the tile SHALL show it at once. A blank or unchanged name SHALL save nothing, and a blank one SHALL put the name back. A product not saved yet SHALL show its name as plain text.

#### Scenario: Rename from the popup
- **WHEN** the user long-presses "tomatoe", changes the name to "tomato" and presses Enter
- **THEN** `updateProduct` is called with name "tomato", the popup title and the tile read "tomato", and it is still "tomato" after a reload

#### Scenario: Cleared name
- **WHEN** the user clears the name field and closes the popup
- **THEN** `updateProduct` is not called and the product keeps its name

#### Scenario: Rename fails
- **WHEN** the user renames "aple" to "apple" and another product is already named "apple"
- **THEN** the screen shows the error, and the tile reads "aple" again after the next refresh

#### Scenario: Product not saved yet
- **WHEN** the user long-presses a product just added whose save has not finished
- **THEN** the popup shows its name as plain text with no name field

## MODIFIED Requirements

### Requirement: Set a product's category by hand
`updateProduct`'s `categoryId` field SHALL set the product's category, or clear it when it is an empty string. Setting a category SHALL set `classification` to `CLASSIFIED`; clearing it SHALL set `UNCLASSIFIED`. An unknown category SHALL be rejected with a GraphQL error and the product left unchanged.

#### Scenario: Correct the AI
- **WHEN** a client calls `updateProduct` on "tomato" with `categoryId` <Légumes>
- **THEN** "tomato" shows category "Légumes" and `classification` `CLASSIFIED`

#### Scenario: Clear the category
- **WHEN** a client calls `updateProduct` on "tomato" with `categoryId` ""
- **THEN** "tomato" has no category and `classification` `UNCLASSIFIED`

#### Scenario: Unknown category
- **WHEN** a client calls `updateProduct` on "tomato" with a `categoryId` that does not exist
- **THEN** the response contains an error and "tomato" keeps its category

### Requirement: Mark a product bought
`updateProduct`'s `bought` field SHALL set the product's bought flag. Marking a product bought SHALL record the current time as `boughtAt`; marking it not bought SHALL clear `boughtAt`; sending the flag it already has SHALL keep `boughtAt`. Bought products SHALL stay in the list.

#### Scenario: Check and uncheck
- **WHEN** a client calls `updateProduct` with `bought` true and then with `bought` false on the same product
- **THEN** the product shows `bought` true after the first call and false after the second

#### Scenario: Bought time recorded
- **WHEN** a client marks a product bought and then not bought
- **THEN** `boughtAt` is set after the first call and null after the second

### Requirement: Restrict a product to a shop
`updateProduct`'s `shopId` field SHALL restrict the product to that shop, or clear the restriction when it is an empty string. An unknown shop SHALL be rejected with a GraphQL error and the product left unchanged.

#### Scenario: Parmesan only at Lidl
- **WHEN** a client calls `updateProduct` on "parmesan" with `shopId` <Lidl>
- **THEN** the response and a following `products` query show "parmesan" with shop "Lidl"

#### Scenario: Buy anywhere again
- **WHEN** a client calls `updateProduct` on "parmesan" with `shopId` ""
- **THEN** "parmesan" has a null shop

#### Scenario: Unknown shop
- **WHEN** a client calls `updateProduct` with an existing product and a `shopId` that does not exist
- **THEN** the response contains an error and the product keeps its previous shop

### Requirement: Product popup
Long-pressing any tile, or opening its context menu (right click, menu key), SHALL open a popup showing the product's name, a category dropdown, and a shop dropdown listing "Any shop" then every shop. The shop dropdown SHALL show the product's shop, or "Any shop" when it has none. Changing it SHALL save it with `updateProduct` at once, "Any shop" as `""`. The long press SHALL NOT also mark the product bought or not bought. The popup SHALL close with a close button or Escape.

#### Scenario: Restrict from the popup
- **WHEN** the user long-presses "parmesan", picks "Lidl" in the dropdown, and closes the popup while "Coop" is selected
- **THEN** `updateProduct` is called with `shopId` <Lidl> and "parmesan" leaves To buy

#### Scenario: Default is any shop
- **WHEN** the user long-presses a product that has no shop
- **THEN** the dropdown shows "Any shop"

#### Scenario: Long press does not buy
- **WHEN** the user long-presses a To-buy tile and releases
- **THEN** the product stays in To buy and the popup is open

### Requirement: Category from the popup
The product popup's category dropdown SHALL list "No category" then every category by name, and SHALL show the product's category, or "No category" when it has none. While the product is `PENDING`, the popup SHALL also read "Sorting into a category…". Changing the dropdown SHALL save the `categoryId` with `updateProduct` at once, and "No category" SHALL clear the category by sending an empty string.

#### Scenario: Correct a wrong category
- **WHEN** the AI put "tomato" in "Fruits", "Coop" orders [Légumes, Pain, Fruits], and the user long-presses "tomato" and picks "Légumes"
- **THEN** `updateProduct` is called with `categoryId` <Légumes>, and without a reload the tile reads "Légumes" with the green dot and moves to the Légumes position in To buy

#### Scenario: Categorize an unclassified product
- **WHEN** "bougies" has no category and the user long-presses it
- **THEN** the category dropdown shows "No category", and picking "Ménage" saves it and the tile reads "Ménage"

#### Scenario: Clear a category
- **WHEN** the user picks "No category" for "tomato"
- **THEN** `updateProduct` is called with `categoryId` "" and the tile reads "No category" with the red dot

#### Scenario: Choose while the AI is sorting
- **WHEN** "gruyère" is still `PENDING`, the user picks "Fromage", and the AI answers later
- **THEN** the popup first read "Sorting into a category…", and "gruyère" keeps "Fromage"
