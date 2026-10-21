# product-categories Specification

## Purpose

Defines the grocery categories (fruit, bread, cheese, …) that products are classified into and that shops order. Users can manage them, and a fresh install starts with common defaults.

## Requirements

### Requirement: List categories
The GraphQL API SHALL provide a `categories` query returning every product category with its UUID `id` and `name`, sorted by name.

#### Scenario: Categories exist
- **WHEN** a client queries `categories { id name }`
- **THEN** the response lists every stored category sorted by name, each with its UUID

### Requirement: Default categories
A freshly migrated database SHALL contain a default set of grocery categories that includes at least Fruits, Légumes, Pain, Fromage, Produits laitiers, Viande, Poisson, Boissons, Surgelés, and Ménage.

#### Scenario: Fresh install
- **WHEN** the application starts against an empty database and a client queries `categories`
- **THEN** the response includes the default categories

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

### Requirement: Rename a category
The GraphQL API SHALL provide an `updateCategory(id, input)` mutation that returns the category. Every input field SHALL be optional: a missing or null `name` SHALL keep the name, and an empty input SHALL change nothing. A given name SHALL be trimmed. An unknown id SHALL be rejected with a GraphQL error. The `renameCategory` mutation SHALL NOT exist.

#### Scenario: Rename
- **WHEN** a client calls `updateCategory` on "Pain" with name "Boulangerie"
- **THEN** `categories` shows "Boulangerie" with the same id, and products and shop orders that used it still reference it

#### Scenario: Empty input
- **WHEN** a client calls `updateCategory` on "Pain" with an empty input
- **THEN** the response shows "Pain" unchanged

#### Scenario: Unknown category
- **WHEN** a client calls `updateCategory` with an id that does not exist
- **THEN** the response contains an error

#### Scenario: Old mutation gone
- **WHEN** a client calls `renameCategory`
- **THEN** the response contains a validation error

### Requirement: Category name rules
Category names SHALL be non-blank and unique, ignoring letter case. A blank or duplicate name SHALL be rejected with a GraphQL error and nothing stored or changed. This applies to both adding and renaming.

#### Scenario: Blank name
- **WHEN** a client calls `addCategory(name: "   ")`
- **THEN** the response contains an error and no category is stored

#### Scenario: Duplicate name
- **WHEN** category "Fruits" exists and a client calls `addCategory(name: "fruits")`
- **THEN** the response contains an error and no category is stored

### Requirement: Delete a category
The GraphQL API SHALL provide a `deleteCategory(id)` mutation that removes the category and returns the deleted id. Products in that category SHALL become uncategorized, with classification `UNCLASSIFIED`, and the category SHALL be removed from every shop's category order. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Delete a used category
- **WHEN** category "Fruits" is used by product "apple" and by a shop's order, and a client deletes "Fruits"
- **THEN** "apple" has no category, its classification is `UNCLASSIFIED`, and the shop's order no longer contains "Fruits"

### Requirement: Every shop orders every category
Every shop's `categoryOrder` SHALL contain every stored category exactly once, at all times: after adding, renaming, or deleting a category, after adding a shop, and after setting a shop's order.

#### Scenario: Orders cover all categories
- **WHEN** categories Pain, Fruits, and Fromage exist and shops "Coop" and "Lidl" exist
- **THEN** both shops' `categoryOrder` contain exactly Pain, Fruits, and Fromage, each once
