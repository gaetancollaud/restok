# shops Specification

## Purpose

Lets users record the shops they visit, with a name and GPS location, and give each shop its own order of product categories so the shopping list can follow that shop's layout.

## Requirements

### Requirement: List shops
The GraphQL API SHALL provide a `shops` query returning every shop with its UUID `id`, `name`, `latitude`, `longitude`, and `categoryOrder` (the shop's ordered categories), sorted by name.

#### Scenario: Shops exist
- **WHEN** shops "Migros" and "Coop" are stored and a client queries `shops { id name latitude longitude }`
- **THEN** the response lists "Coop" then "Migros", each with its UUID and coordinates

#### Scenario: No shops
- **WHEN** no shops are stored and a client queries `shops`
- **THEN** the response is an empty list

### Requirement: Add a shop
The GraphQL API SHALL provide an `addShop(name, latitude, longitude)` mutation that stores a new shop with a generated UUID and an empty category order, and returns it. The name SHALL be trimmed.

#### Scenario: Valid shop
- **WHEN** a client calls `addShop(name: " Coop ", latitude: 46.52, longitude: 6.63)`
- **THEN** the response contains a shop named "Coop" with a new UUID, the given coordinates, and an empty `categoryOrder`

### Requirement: Shop input validation
A blank shop name, a latitude outside -90 to 90, or a longitude outside -180 to 180 SHALL be rejected with a GraphQL error, and nothing SHALL be stored or changed. This applies to both adding and updating a shop.

#### Scenario: Blank name
- **WHEN** a client calls `addShop(name: "  ", latitude: 0, longitude: 0)`
- **THEN** the response contains an error and no shop is stored

#### Scenario: Latitude out of range
- **WHEN** a client calls `addShop(name: "Coop", latitude: 91, longitude: 0)`
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
The GraphQL API SHALL provide a `deleteShop(id)` mutation that removes the shop and its category order and returns the deleted id. Categories and products SHALL NOT be affected. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Delete
- **WHEN** a client deletes a shop that has a category order
- **THEN** the shop no longer appears in `shops` and all categories still exist

### Requirement: Set a shop's category order
The GraphQL API SHALL provide a `setShopCategoryOrder(shopId, categoryIds)` mutation that replaces the shop's whole category order with the given list and returns the shop. The list MAY be partial. Duplicate ids, unknown category ids, or an unknown shop SHALL be rejected with a GraphQL error and the previous order kept.

#### Scenario: Set order
- **WHEN** a client calls `setShopCategoryOrder` with categories [Pain, Fruits] on a shop
- **THEN** that shop's `categoryOrder` returns Pain then Fruits

#### Scenario: Orders are per shop
- **WHEN** shop A has order [Pain, Fruits] and shop B has order [Fruits, Pain]
- **THEN** each shop returns its own order

#### Scenario: Duplicate category
- **WHEN** a client calls `setShopCategoryOrder` with the same category twice
- **THEN** the response contains an error and the shop's order is unchanged

### Requirement: Shops persist
Stored shops and their category orders SHALL survive an application restart.

#### Scenario: Restart
- **WHEN** a shop with a category order is stored and the application restarts
- **THEN** `shops` still returns the shop with the same order

### Requirement: Shops page in the SPA
The SPA SHALL provide a shops page to list, add, edit, and delete shops, and to set a shop's category order by adding, removing, and moving categories up or down. Changes SHALL appear without a page reload.

#### Scenario: Reorder from the UI
- **WHEN** a user moves "Fruits" above "Pain" for a shop and the change is saved
- **THEN** the page shows the new order, and the shopping list sorted for that shop follows it
