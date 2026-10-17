# Spec Delta

## MODIFIED Requirements

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
