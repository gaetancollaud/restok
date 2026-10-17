# Spec Delta

## MODIFIED Requirements

### Requirement: List shops
The GraphQL API SHALL provide a `shops` query returning every shop with its UUID `id`, `name`, `latitude`, `longitude` (both null when the shop has no location), and `categoryOrder` (the shop's ordered categories), sorted by name.

#### Scenario: Shops exist
- **WHEN** shops "Migros" and "Coop" are stored and a client queries `shops { id name latitude longitude }`
- **THEN** the response lists "Coop" then "Migros", each with its UUID and coordinates

#### Scenario: No shops
- **WHEN** no shops are stored and a client queries `shops`
- **THEN** the response is an empty list

### Requirement: Add a shop
The GraphQL API SHALL provide an `addShop(name, latitude, longitude)` mutation that stores a new shop with a generated UUID and an empty category order, and returns it. The name SHALL be trimmed. The coordinates are optional: both or neither.

#### Scenario: Valid shop
- **WHEN** a client calls `addShop(name: " Coop ", latitude: 46.52, longitude: 6.63)`
- **THEN** the response contains a shop named "Coop" with a new UUID, the given coordinates, and an empty `categoryOrder`

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

## ADDED Requirements

### Requirement: Shops panel in the SPA
An edit button beside the shop dropdown SHALL open a Shops panel listing the shops, where the user can select a shop, rename it, add a shop named "New shop" with a copy of the selected shop's order, and delete a shop with a second tap while more than one exists. A back button SHALL return to the list on the selected shop. Changes SHALL be saved without a separate save step.

#### Scenario: Rename and go back
- **WHEN** the user opens Shops, renames "Coop" to "Coop Pronto" and goes back
- **THEN** the dropdown shows "Coop Pronto" selected, and `shops` returns the new name

#### Scenario: Delete needs a second tap
- **WHEN** the user taps Delete shop once on "Coop"
- **THEN** "Coop" still exists until the user taps the button again

### Requirement: Aisle order from the Shops panel
The Shops panel SHALL show the selected shop's category order. Dragging a row by its grip, or pressing up or down on a focused grip, SHALL move it; × SHALL remove it from that shop's order only; adding a name SHALL append it, creating the category when no category has that name (ignoring case). Each change SHALL be saved with `setShopCategoryOrder`, and the list SHALL follow the new order.

#### Scenario: Reorder with the keyboard
- **WHEN** "Coop" orders [Pain, Fruits] and the user focuses the Fruits grip and presses up
- **THEN** Coop's order becomes [Fruits, Pain] and the To-buy list shows Fruits products first

#### Scenario: Add a new category
- **WHEN** the user adds "Épices" to Coop's order and no category has that name
- **THEN** a category "Épices" is created and is last in Coop's order
