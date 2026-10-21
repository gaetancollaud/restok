## ADDED Requirements

### Requirement: Category add bar keeps focus after adding
After the user adds a category from the Shops panel's add bar with the + button, the add bar's text input SHALL be empty and focused.

#### Scenario: Add two categories with the + button
- **WHEN** the user types "Fromage", clicks +, then types "Boissons" and clicks +
- **THEN** both categories are appended, and after each click the empty text input has focus
