## MODIFIED Requirements

### Requirement: Shops panel in the SPA
The menu's Shops entry SHALL open a Shops panel listing the shops, where the user can select a shop, rename it, add a shop named "New shop" with a copy of the selected shop's order, and delete a shop with a second tap while more than one exists. A back button, or the menu's Products entry, SHALL return to the list on the selected shop. Changes SHALL be saved without a separate save step.

#### Scenario: Rename and go back
- **WHEN** the user opens Shops, renames "Coop" to "Coop Pronto" and goes back
- **THEN** the dropdown shows "Coop Pronto" selected, and `shops` returns the new name

#### Scenario: Delete needs a second tap
- **WHEN** the user taps Delete shop once on "Coop"
- **THEN** "Coop" still exists until the user taps the button again
