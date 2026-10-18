# Spec Delta

## ADDED Requirements

### Requirement: Delete from the popup
The product popup SHALL show a "Delete product" button for a saved product. A first tap SHALL change it to "Tap again to delete <name>" without deleting; a second tap within 4 s SHALL close the popup, remove the product from both grids at once, and delete it with `deleteProduct`. Without the second tap the button SHALL return to "Delete product" after 4 s. A product not saved yet SHALL have no delete button.

#### Scenario: Delete a product
- **WHEN** the user long-presses "tomatoe", taps "Delete product", then taps "Tap again to delete tomatoe"
- **THEN** the popup closes, "tomatoe" is gone from the screen, `deleteProduct` is called with its id, and it is not back after a reload

#### Scenario: Delete a bought product
- **WHEN** the user long-presses "bougies" in Bought and taps "Delete product" twice
- **THEN** "bougies" is gone from Bought

#### Scenario: Single tap does not delete
- **WHEN** the user taps "Delete product" once and waits 4 s
- **THEN** the product is still listed and the button reads "Delete product" again

#### Scenario: Closing cancels
- **WHEN** the user taps "Delete product" once and closes the popup
- **THEN** the product is still listed

#### Scenario: Delete fails
- **WHEN** the user deletes a product and `deleteProduct` returns an error
- **THEN** the screen shows the error, and the product is listed again after the next refresh
