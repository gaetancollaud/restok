# shopping-list Specification

## Purpose

Manages the products to buy: each has a name, a bought flag, and an optional category set by AI or by hand. The list can be sorted to follow a chosen shop's category order.

## Requirements

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

### Requirement: Products sorted for a shop
With a `shopId` argument, `products` SHALL sort products by their category's position in that shop's category order, then by name. Products whose category is not in the shop's order, and uncategorized products, SHALL come after all ordered ones, sorted by name. An unknown shop SHALL be rejected with a GraphQL error.

#### Scenario: Shop order applied
- **WHEN** shop "Coop" orders [Pain, Fruits], products are "apple" (Fruits), "baguette" (Pain), "feta" (Fromage), and "foo" (none), and a client queries `products(shopId: <Coop>)`
- **THEN** the response lists "baguette", "apple", "feta", "foo"

#### Scenario: Different shop, different order
- **WHEN** shop "Migros" orders [Fruits, Pain] with the same products
- **THEN** `products(shopId: <Migros>)` lists "apple", "baguette", "feta", "foo"

### Requirement: Add a product
The GraphQL API SHALL provide an `addProduct(name)` mutation that stores a product with a generated UUID, `bought` false, no category, no shop, and `classification` `PENDING`, and returns it without waiting for classification. The name SHALL be trimmed. A blank name SHALL be rejected with a GraphQL error and nothing stored.

#### Scenario: Valid name
- **WHEN** a client calls `addProduct(name: " tomato ")`
- **THEN** the response contains a product named "tomato" with a new UUID, `bought` false, no category, no shop, and `classification` `PENDING`

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
Stored products, with their bought flag, category and shop, SHALL survive an application restart.

#### Scenario: Restart
- **WHEN** a classified, bought product restricted to a shop is stored and the application restarts
- **THEN** `products` still returns it with the same category, bought flag and shop

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
The grocery screen's shop dropdown SHALL offer "All shops" as its first option. With it selected, To buy SHALL show every product still to buy, whatever its shop, sorted by name, with no "more for other shops" line. The screen SHALL open on "All shops".

#### Scenario: See everything
- **WHEN** "parmesan" is restricted to "Lidl", "apple" has no shop, and the user selects "All shops"
- **THEN** To buy shows "apple" then "parmesan" and no hidden count

#### Scenario: Back to a shop
- **WHEN** the user then selects "Coop"
- **THEN** "parmesan" is hidden again and the screen reads "1 more for other shops"

#### Scenario: Opens on All shops
- **WHEN** shops "Coop" and "Lidl" exist and the user opens the app away from every shop
- **THEN** the dropdown shows "All shops" and To buy shows every product still to buy

### Requirement: Nearby shop selected on open
When the app opens, the SPA SHALL ask the device for its position once. If one or more shops with a location are within 200 m of it, the grocery screen SHALL select the nearest of them. Without a position (permission denied, unavailable, or no answer within 10 s), or with no shop within 200 m, the screen SHALL stay on "All shops" and show no error. Shops without a location SHALL be ignored.

#### Scenario: In a shop
- **WHEN** "Coop" is 50 m from the device and the user opens the app
- **THEN** the dropdown shows "Coop" and To buy follows Coop's order

#### Scenario: Two shops close by
- **WHEN** "Coop" is 150 m and "Migros" 80 m from the device and the user opens the app
- **THEN** the dropdown shows "Migros"

#### Scenario: Too far
- **WHEN** the nearest shop is 250 m from the device and the user opens the app
- **THEN** the dropdown stays on "All shops"

#### Scenario: Location refused
- **WHEN** the user denies the location permission
- **THEN** the dropdown stays on "All shops" and no error is shown

### Requirement: Hand-picked shop wins over the position
A shop chosen by hand in the dropdown or the Shops panel before the position arrives SHALL be kept; the position SHALL NOT change the selection afterwards.

#### Scenario: Picked before the position
- **WHEN** the user selects "Lidl" while the position is still pending, and the position then shows "Coop" 50 m away
- **THEN** the dropdown keeps "Lidl"

### Requirement: Product popup
Long-pressing any tile, or opening its context menu (right click, menu key), SHALL open a popup showing the product's name, a category dropdown, and a shop dropdown listing "Any shop" then every shop. The shop dropdown SHALL show the product's shop, or "Any shop" when it has none. Changing it SHALL save with `setProductShop` at once. The long press SHALL NOT also mark the product bought or not bought. The popup SHALL close with a close button or Escape.

#### Scenario: Restrict from the popup
- **WHEN** the user long-presses "parmesan", picks "Lidl" in the dropdown, and closes the popup while "Coop" is selected
- **THEN** `setProductShop` is called with Lidl and "parmesan" leaves To buy

#### Scenario: Default is any shop
- **WHEN** the user long-presses a product that has no shop
- **THEN** the dropdown shows "Any shop"

#### Scenario: Long press does not buy
- **WHEN** the user long-presses a To-buy tile and releases
- **THEN** the product stays in To buy and the popup is open

### Requirement: Category from the popup
The product popup's category dropdown SHALL list "No category" then every category by name, and SHALL show the product's category, or "No category" when it has none. While the product is `PENDING`, the popup SHALL also read "Sorting into a category…". Changing the dropdown SHALL save with `setProductCategory` at once, and "No category" SHALL clear the category.

#### Scenario: Correct a wrong category
- **WHEN** the AI put "tomato" in "Fruits", "Coop" orders [Légumes, Pain, Fruits], and the user long-presses "tomato" and picks "Légumes"
- **THEN** `setProductCategory` is called with Légumes, and without a reload the tile reads "Légumes" with the green dot and moves to the Légumes position in To buy

#### Scenario: Categorize an unclassified product
- **WHEN** "bougies" has no category and the user long-presses it
- **THEN** the category dropdown shows "No category", and picking "Ménage" saves it and the tile reads "Ménage"

#### Scenario: Clear a category
- **WHEN** the user picks "No category" for "tomato"
- **THEN** `setProductCategory` is called with a null category and the tile reads "No category" with the red dot

#### Scenario: Choose while the AI is sorting
- **WHEN** "gruyère" is still `PENDING`, the user picks "Fromage", and the AI answers later
- **THEN** the popup first read "Sorting into a category…", and "gruyère" keeps "Fromage"
