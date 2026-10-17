# Spec Delta

## REMOVED Requirements

### Requirement: List items
**Reason**: The placeholder item entity is replaced by the shopping domain.
**Migration**: Use the `products` query (see `shopping-list`).

### Requirement: Add an item
**Reason**: The placeholder item entity is replaced by the shopping domain.
**Migration**: Use the `addProduct` mutation (see `shopping-list`).

### Requirement: Items persist
**Reason**: The `item` table no longer exists. It was never deployed, so there is no data to migrate.
**Migration**: None. Products persist instead (see `shopping-list`).

### Requirement: Items page in the SPA
**Reason**: Replaced by the shopping list page.
**Migration**: Use the shopping list page (see `shopping-list`).
