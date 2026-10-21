# Spec Delta

## ADDED Requirements

### Requirement: Every shop orders every category
Every shop's `categoryOrder` SHALL contain every stored category exactly once, at all times: after adding, renaming, or deleting a category, after adding a shop, and after setting a shop's order.

#### Scenario: Orders cover all categories
- **WHEN** categories Pain, Fruits, and Fromage exist and shops "Coop" and "Lidl" exist
- **THEN** both shops' `categoryOrder` contain exactly Pain, Fruits, and Fromage, each once

## MODIFIED Requirements

### Requirement: Add a category
The GraphQL API SHALL provide an `addCategory(name)` mutation that stores a new category with a generated UUID and returns it. The name SHALL be trimmed. The new category SHALL also be appended to the end of every existing shop's category order. When the name is rejected, no shop's order SHALL change.

#### Scenario: Valid name
- **WHEN** a client calls `addCategory(name: " Spices ")`
- **THEN** the response contains a category named "Spices" with a new UUID

#### Scenario: Appended to every shop
- **WHEN** shop "Coop" orders [Pain, Fruits], shop "Lidl" orders [Fruits, Pain], and a client calls `addCategory(name: "Épices")`
- **THEN** Coop's `categoryOrder` is [Pain, Fruits, Épices] and Lidl's is [Fruits, Pain, Épices]

#### Scenario: Rejected name changes no order
- **WHEN** category "Fruits" exists and a client calls `addCategory(name: "fruits")`
- **THEN** the response contains an error and every shop's `categoryOrder` is unchanged

#### Scenario: Shops added later
- **WHEN** a category is added and a shop is added afterwards
- **THEN** the new shop's `categoryOrder` contains that category

### Requirement: Delete a category
The GraphQL API SHALL provide a `deleteCategory(id)` mutation that removes the category and returns the deleted id. Products in that category SHALL become uncategorized, with classification `UNCLASSIFIED`, and the category SHALL be removed from every shop's category order. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Delete a used category
- **WHEN** category "Fruits" is used by product "apple" and by a shop's order, and a client deletes "Fruits"
- **THEN** "apple" has no category, its classification is `UNCLASSIFIED`, and the shop's order no longer contains "Fruits"
