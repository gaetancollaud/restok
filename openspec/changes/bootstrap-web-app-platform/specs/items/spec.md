# Spec Delta

## Purpose

Provides a minimal list of named items, the first end-to-end slice through frontend, GraphQL, and database. It is a placeholder until real business entities are introduced.

## ADDED Requirements

### Requirement: List items
The GraphQL API SHALL provide an `items` query returning every stored item with its `id` and `name`, ordered by name.

#### Scenario: Items exist
- **WHEN** items "b" and "a" are stored and a client queries `items { id name }`
- **THEN** the response lists "a" then "b", each with its id

#### Scenario: No items
- **WHEN** no items are stored and a client queries `items`
- **THEN** the response is an empty list

### Requirement: Add an item
The GraphQL API SHALL provide an `addItem(name)` mutation that stores a new item and returns it with a generated id. Leading and trailing whitespace SHALL be trimmed; a blank name SHALL be rejected with a GraphQL error and nothing stored.

#### Scenario: Valid name
- **WHEN** a client calls `addItem(name: "  bolt ")`
- **THEN** the response contains an item named "bolt" with a new id, and a following `items` query includes it

#### Scenario: Blank name
- **WHEN** a client calls `addItem(name: "   ")`
- **THEN** the response contains an error and no item is stored

### Requirement: Items persist
Stored items SHALL survive an application restart.

#### Scenario: Restart
- **WHEN** an item is added and the application restarts
- **THEN** the `items` query still returns it

### Requirement: Items page in the SPA
The SPA SHALL show the item list and a form to add an item; a successfully added item SHALL appear in the list without a page reload.

#### Scenario: Add from the UI
- **WHEN** a user types a name in the form and submits
- **THEN** the new item appears in the list
