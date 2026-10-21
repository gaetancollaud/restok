## MODIFIED Requirements

### Requirement: Rename a category from the Shops panel
The category name in each row of the Shops panel's aisle order SHALL be editable. The new name SHALL be saved with `updateCategory` when the field changes (blur or Enter), and SHALL show in every shop and on products. A rejected name (blank or duplicate) SHALL show the error and restore the saved name.

#### Scenario: Rename everywhere
- **WHEN** the user edits "Pain" to "Boulangerie" in Coop's panel and presses Enter
- **THEN** every shop's order and every product in that category show "Boulangerie"

#### Scenario: Duplicate name rejected
- **WHEN** categories "Pain" and "Fruits" exist and the user renames "Pain" to "fruits"
- **THEN** an error is shown and the row shows "Pain" again
