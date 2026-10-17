# Spec Delta

## MODIFIED Requirements

### Requirement: Delete a shop
The GraphQL API SHALL provide a `deleteShop(id)` mutation that removes the shop and its category order and returns the deleted id. Categories SHALL NOT be affected. Products restricted to that shop SHALL keep existing and become buyable at any shop. An unknown id SHALL be rejected with a GraphQL error.

#### Scenario: Delete
- **WHEN** a client deletes a shop that has a category order
- **THEN** the shop no longer appears in `shops` and all categories still exist

#### Scenario: Restricted products survive
- **WHEN** "parmesan" is restricted to "Lidl" and a client deletes "Lidl"
- **THEN** `products` still returns "parmesan" with a null shop
