## MODIFIED Requirements

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
