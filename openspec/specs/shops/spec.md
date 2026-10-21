# shops Specification

## Purpose

Lets users record the shops they visit, with a name and GPS location, and give each shop its own order of product categories so the shopping list can follow that shop's layout.

## Requirements

### Requirement: List shops
The GraphQL API SHALL provide a `shops` query returning every shop with its UUID `id`, `name`, `latitude`, `longitude` (both null when the shop has no location), and `categoryOrder` (the shop's ordered categories), sorted by name.

#### Scenario: Shops exist
- **WHEN** shops "Migros" and "Coop" are stored and a client queries `shops { id name latitude longitude }`
- **THEN** the response lists "Coop" then "Migros", each with its UUID and coordinates

#### Scenario: No shops
- **WHEN** no shops are stored and a client queries `shops`
- **THEN** the response is an empty list

### Requirement: Add a shop
The GraphQL API SHALL provide an `addShop(name, latitude, longitude)` mutation that stores a new shop with a generated UUID and a category order holding every category sorted by name, and returns it. The name SHALL be trimmed. The coordinates are optional: both or neither.

#### Scenario: Valid shop
- **WHEN** categories Pain and Fruits exist and a client calls `addShop(name: " Coop ", latitude: 46.52, longitude: 6.63)`
- **THEN** the response contains a shop named "Coop" with a new UUID, the given coordinates, and `categoryOrder` [Fruits, Pain]

#### Scenario: Shop without location
- **WHEN** a client calls `addShop(name: "Lidl")`
- **THEN** the response contains a shop named "Lidl" with null `latitude` and `longitude`

### Requirement: Shop input validation
A blank shop name, only one of latitude and longitude, a latitude outside -90 to 90, or a longitude outside -180 to 180 SHALL be rejected with a GraphQL error, and nothing SHALL be stored or changed. This applies to both adding and updating a shop.

#### Scenario: Blank name
- **WHEN** a client calls `addShop(name: "  ", latitude: 0, longitude: 0)`
- **THEN** the response contains an error and no shop is stored

#### Scenario: Latitude out of range
- **WHEN** a client calls `addShop(name: "Coop", latitude: 91, longitude: 0)`
- **THEN** the response contains an error and no shop is stored

#### Scenario: Half a location
- **WHEN** a client calls `addShop(name: "Coop", latitude: 46.52)`
- **THEN** the response contains an error and no shop is stored

### Requirement: Update a shop
The GraphQL API SHALL provide an `updateShop(id, name, latitude, longitude)` mutation that replaces the shop's name and location and returns the updated shop. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Move a shop
- **WHEN** a client calls `updateShop` on an existing shop with new coordinates
- **THEN** the response and a following `shops` query show the new coordinates

#### Scenario: Unknown shop
- **WHEN** a client calls `updateShop` with an id that does not exist
- **THEN** the response contains an error

### Requirement: Delete a shop
The GraphQL API SHALL provide a `deleteShop(id)` mutation that removes the shop and its category order and returns the deleted id. Categories SHALL NOT be affected. Products restricted to that shop SHALL keep existing and become buyable at any shop. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Delete
- **WHEN** a client deletes a shop that has a category order
- **THEN** the shop no longer appears in `shops` and all categories still exist

#### Scenario: Restricted products survive
- **WHEN** "parmesan" is restricted to "Lidl" and a client deletes "Lidl"
- **THEN** `products` still returns "parmesan" with a null shop

### Requirement: Set a shop's category order
The GraphQL API SHALL provide a `setShopCategoryOrder(shopId, categoryIds)` mutation that replaces the shop's whole category order with the given list and returns the shop. The list SHALL contain every category exactly once. A missing category, duplicate ids, unknown category ids, or an unknown shop SHALL be rejected with a GraphQL error and the previous order kept.

#### Scenario: Set order
- **WHEN** only categories Pain and Fruits exist and a client calls `setShopCategoryOrder` with [Pain, Fruits] on a shop
- **THEN** that shop's `categoryOrder` returns Pain then Fruits

#### Scenario: Orders are per shop
- **WHEN** shop A has order [Pain, Fruits] and shop B has order [Fruits, Pain]
- **THEN** each shop returns its own order

#### Scenario: Duplicate category
- **WHEN** a client calls `setShopCategoryOrder` with the same category twice
- **THEN** the response contains an error and the shop's order is unchanged

#### Scenario: Partial order rejected
- **WHEN** categories Pain, Fruits, and Viande exist and a client calls `setShopCategoryOrder` with [Pain, Fruits]
- **THEN** the response contains an error and the shop's order is unchanged

### Requirement: Shops persist
Stored shops and their category orders SHALL survive an application restart.

#### Scenario: Restart
- **WHEN** a shop with a category order is stored and the application restarts
- **THEN** `shops` still returns the shop with the same order

### Requirement: Shops panel in the SPA
An edit button beside the shop dropdown SHALL open a Shops panel listing the shops, where the user can select a shop, rename it, add a shop named "New shop" with a copy of the selected shop's order, and delete a shop with a second tap while more than one exists. A back button SHALL return to the list on the selected shop. Changes SHALL be saved without a separate save step.

#### Scenario: Rename and go back
- **WHEN** the user opens Shops, renames "Coop" to "Coop Pronto" and goes back
- **THEN** the dropdown shows "Coop Pronto" selected, and `shops` returns the new name

#### Scenario: Delete needs a second tap
- **WHEN** the user taps Delete shop once on "Coop"
- **THEN** "Coop" still exists until the user taps the button again

### Requirement: Aisle order from the Shops panel
The Shops panel SHALL show the selected shop's category order. Dragging a row by its grip, or pressing up or down on a focused grip, SHALL move it, and the change SHALL be saved with `setShopCategoryOrder`. Adding a name SHALL create the category, which goes last in every shop; a name that already exists (ignoring case) SHALL be ignored. The list SHALL follow the saved order.

#### Scenario: Reorder with the keyboard
- **WHEN** "Coop" orders [Pain, Fruits] and the user focuses the Fruits grip and presses up
- **THEN** Coop's order becomes [Fruits, Pain] and the To-buy list shows Fruits products first

#### Scenario: Add a new category
- **WHEN** the user adds "Épices" from Coop's panel and no category has that name
- **THEN** a category "Épices" is created and is last in Coop's order and in every other shop's order

#### Scenario: Existing name ignored
- **WHEN** category "Fruits" exists and the user adds "fruits"
- **THEN** no category is created and no order changes

### Requirement: Category add bar keeps focus after adding
After the user adds a category from the Shops panel's add bar with the + button, the add bar's text input SHALL be empty and focused.

#### Scenario: Add two categories with the + button
- **WHEN** the user types "Fromage", clicks +, then types "Boissons" and clicks +
- **THEN** both categories are appended, and after each click the empty text input has focus

### Requirement: Delete a category from the Shops panel
Each row of the Shops panel's aisle order SHALL have a × button that deletes the category with `deleteCategory`, removing it from every shop and leaving its products uncategorized. The first tap SHALL only ask for confirmation; a second tap on the same × within 4 seconds SHALL delete.

#### Scenario: Delete needs a second tap
- **WHEN** the user taps × on "Fruits" once
- **THEN** "Fruits" still exists and its × asks for confirmation

#### Scenario: Deleted everywhere
- **WHEN** the user taps × twice on "Fruits" in Coop's panel and "apple" is in Fruits
- **THEN** "Fruits" is gone from `categories` and from every shop's order, and "apple" has no category

### Requirement: Rename a category from the Shops panel
The category name in each row of the Shops panel's aisle order SHALL be editable. The new name SHALL be saved with `updateCategory` when the field changes (blur or Enter), and SHALL show in every shop and on products. A rejected name (blank or duplicate) SHALL show the error and restore the saved name.

#### Scenario: Rename everywhere
- **WHEN** the user edits "Pain" to "Boulangerie" in Coop's panel and presses Enter
- **THEN** every shop's order and every product in that category show "Boulangerie"

#### Scenario: Duplicate name rejected
- **WHEN** categories "Pain" and "Fruits" exist and the user renames "Pain" to "fruits"
- **THEN** an error is shown and the row shows "Pain" again
