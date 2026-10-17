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
The GraphQL API SHALL provide an `addCategory(name)` mutation that stores a new category with a generated UUID and returns it. The name SHALL be trimmed. The new category SHALL also be appended to the end of every existing shop's category order, including shops whose order is empty. When the name is rejected, no shop's order SHALL change.

#### Scenario: Valid name
- **WHEN** a client calls `addCategory(name: " Spices ")`
- **THEN** the response contains a category named "Spices" with a new UUID

#### Scenario: Appended to every shop
- **WHEN** shop "Coop" orders [Pain, Fruits], shop "Lidl" has an empty order, and a client calls `addCategory(name: "Épices")`
- **THEN** Coop's `categoryOrder` is [Pain, Fruits, Épices] and Lidl's is [Épices]

#### Scenario: Rejected name changes no order
- **WHEN** category "Fruits" exists and a client calls `addCategory(name: "fruits")`
- **THEN** the response contains an error and every shop's `categoryOrder` is unchanged

#### Scenario: Shops added later
- **WHEN** a category is added and a shop is added afterwards
- **THEN** the new shop's `categoryOrder` is empty

### Requirement: Rename a category
The GraphQL API SHALL provide a `renameCategory(id, name)` mutation that changes the category's name and returns it. The name SHALL be trimmed. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Rename
- **WHEN** a client renames "Pain" to "Boulangerie"
- **THEN** `categories` shows "Boulangerie" with the same id, and products and shop orders that used it still reference it

### Requirement: Category name rules
Category names SHALL be non-blank and unique, ignoring letter case. A blank or duplicate name SHALL be rejected with a GraphQL error and nothing stored or changed. This applies to both adding and renaming.

#### Scenario: Blank name
- **WHEN** a client calls `addCategory(name: "   ")`
- **THEN** the response contains an error and no category is stored

#### Scenario: Duplicate name
- **WHEN** category "Fruits" exists and a client calls `addCategory(name: "fruits")`
- **THEN** the response contains an error and no category is stored

### Requirement: Delete a category
The GraphQL API SHALL provide a `deleteCategory(id)` mutation that removes the category and returns the deleted id. Products in that category SHALL become uncategorized, and the category SHALL be removed from every shop's category order. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Delete a used category
- **WHEN** category "Fruits" is used by product "apple" and by a shop's order, and a client deletes "Fruits"
- **THEN** "apple" has no category and the shop's order no longer contains "Fruits"
