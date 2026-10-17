# Spec Delta

## MODIFIED Requirements

### Requirement: List products
The GraphQL API SHALL provide a `products` query returning every product with its UUID `id`, `name`, `bought`, `boughtAt` (when it was last marked bought, null when not bought), `category` (null when uncategorized), `classification` (`PENDING`, `CLASSIFIED`, or `UNCLASSIFIED`), and `shop` (the only shop to buy it at, null when it can be bought anywhere). Without a shop argument, products SHALL be sorted by name.

#### Scenario: Products exist
- **WHEN** products "tomato" and "apple" are stored and a client queries `products { id name bought }`
- **THEN** the response lists "apple" then "tomato"

#### Scenario: No products
- **WHEN** no products are stored and a client queries `products`
- **THEN** the response is an empty list

#### Scenario: Shop of a product
- **WHEN** "parmesan" is restricted to "Lidl" and "apple" is not, and a client queries `products { name shop { name } }`
- **THEN** "parmesan" has shop "Lidl" and "apple" has a null shop

### Requirement: Add a product
The GraphQL API SHALL provide an `addProduct(name)` mutation that stores a product with a generated UUID, `bought` false, no category, no shop, and `classification` `PENDING`, and returns it without waiting for classification. The name SHALL be trimmed. A blank name SHALL be rejected with a GraphQL error and nothing stored.

#### Scenario: Valid name
- **WHEN** a client calls `addProduct(name: " tomato ")`
- **THEN** the response contains a product named "tomato" with a new UUID, `bought` false, no category, no shop, and `classification` `PENDING`

#### Scenario: Blank name
- **WHEN** a client calls `addProduct(name: "  ")`
- **THEN** the response contains an error and no product is stored

### Requirement: Products persist
Stored products, with their bought flag, category and shop, SHALL survive an application restart.

#### Scenario: Restart
- **WHEN** a classified, bought product restricted to a shop is stored and the application restarts
- **THEN** `products` still returns it with the same category, bought flag and shop

## ADDED Requirements

### Requirement: Restrict a product to a shop
The GraphQL API SHALL provide a `setProductShop(id, shopId)` mutation that restricts the product to that shop, or clears the restriction when `shopId` is null, and returns the product. An unknown product or shop SHALL be rejected with a GraphQL error and the product left unchanged.

#### Scenario: Parmesan only at Lidl
- **WHEN** a client calls `setProductShop` with product "parmesan" and shop "Lidl"
- **THEN** the response and a following `products` query show "parmesan" with shop "Lidl"

#### Scenario: Buy anywhere again
- **WHEN** a client calls `setProductShop` with product "parmesan" and a null `shopId`
- **THEN** "parmesan" has a null shop

#### Scenario: Unknown shop
- **WHEN** a client calls `setProductShop` with an existing product and a shop id that does not exist
- **THEN** the response contains an error and the product keeps its previous shop

### Requirement: To buy hides products for other shops
The To-buy grid SHALL leave out products restricted to a shop other than the selected one. When any are left out, the screen SHALL show how many, e.g. "1 more for other shops". Products with no shop and products restricted to the selected shop SHALL show as usual. The Bought grid SHALL show every bought product whatever its shop.

#### Scenario: Other shop selected
- **WHEN** "parmesan" is restricted to "Lidl", "apple" has no shop, and the user selects "Coop"
- **THEN** To buy shows "apple" but not "parmesan", and the screen reads "1 more for other shops"

#### Scenario: Its shop selected
- **WHEN** the user then selects "Lidl"
- **THEN** To buy shows both "apple" and "parmesan" and no hidden count

#### Scenario: Bought grid
- **WHEN** "parmesan" is restricted to "Lidl", is bought, and "Coop" is selected
- **THEN** "parmesan" is shown in Bought

### Requirement: All shops view
The grocery screen's shop dropdown SHALL offer "All shops" as its first option. With it selected, To buy SHALL show every product still to buy, whatever its shop, sorted by name, with no "more for other shops" line. The screen SHALL still open on the first shop.

#### Scenario: See everything
- **WHEN** "parmesan" is restricted to "Lidl", "apple" has no shop, and the user selects "All shops"
- **THEN** To buy shows "apple" then "parmesan" and no hidden count

#### Scenario: Back to a shop
- **WHEN** the user then selects "Coop"
- **THEN** "parmesan" is hidden again and the screen reads "1 more for other shops"

### Requirement: Product popup
Long-pressing any tile, or opening its context menu (right click, menu key), SHALL open a popup showing the product's name and category state, with a shop dropdown listing "Any shop" then every shop. The dropdown SHALL show the product's shop, or "Any shop" when it has none. Changing it SHALL save with `setProductShop` at once. The long press SHALL NOT also mark the product bought or not bought. The popup SHALL close with a close button or Escape.

#### Scenario: Restrict from the popup
- **WHEN** the user long-presses "parmesan", picks "Lidl" in the dropdown, and closes the popup while "Coop" is selected
- **THEN** `setProductShop` is called with Lidl and "parmesan" leaves To buy

#### Scenario: Default is any shop
- **WHEN** the user long-presses a product that has no shop
- **THEN** the dropdown shows "Any shop"

#### Scenario: Long press does not buy
- **WHEN** the user long-presses a To-buy tile and releases
- **THEN** the product stays in To buy and the popup is open
