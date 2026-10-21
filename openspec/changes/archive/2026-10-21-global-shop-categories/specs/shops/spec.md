# Spec Delta

## MODIFIED Requirements

### Requirement: Add a shop
The GraphQL API SHALL provide an `addShop(name, latitude, longitude)` mutation that stores a new shop with a generated UUID and a category order holding every category sorted by name, and returns it. The name SHALL be trimmed. The coordinates are optional: both or neither.

#### Scenario: Valid shop
- **WHEN** categories Pain and Fruits exist and a client calls `addShop(name: " Coop ", latitude: 46.52, longitude: 6.63)`
- **THEN** the response contains a shop named "Coop" with a new UUID, the given coordinates, and `categoryOrder` [Fruits, Pain]

#### Scenario: Shop without location
- **WHEN** a client calls `addShop(name: "Lidl")`
- **THEN** the response contains a shop named "Lidl" with null `latitude` and `longitude`

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

## ADDED Requirements

### Requirement: Delete a category from the Shops panel
Each row of the Shops panel's aisle order SHALL have a × button that deletes the category with `deleteCategory`, removing it from every shop and leaving its products uncategorized. The first tap SHALL only ask for confirmation; a second tap on the same × within 4 seconds SHALL delete.

#### Scenario: Delete needs a second tap
- **WHEN** the user taps × on "Fruits" once
- **THEN** "Fruits" still exists and its × asks for confirmation

#### Scenario: Deleted everywhere
- **WHEN** the user taps × twice on "Fruits" in Coop's panel and "apple" is in Fruits
- **THEN** "Fruits" is gone from `categories` and from every shop's order, and "apple" has no category

### Requirement: Rename a category from the Shops panel
The category name in each row of the Shops panel's aisle order SHALL be editable. The new name SHALL be saved with `renameCategory` when the field changes (blur or Enter), and SHALL show in every shop and on products. A rejected name (blank or duplicate) SHALL show the error and restore the saved name.

#### Scenario: Rename everywhere
- **WHEN** the user edits "Pain" to "Boulangerie" in Coop's panel and presses Enter
- **THEN** every shop's order and every product in that category show "Boulangerie"

#### Scenario: Duplicate name rejected
- **WHEN** categories "Pain" and "Fruits" exist and the user renames "Pain" to "fruits"
- **THEN** an error is shown and the row shows "Pain" again
