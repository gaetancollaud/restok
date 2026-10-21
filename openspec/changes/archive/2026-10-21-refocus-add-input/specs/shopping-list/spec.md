## ADDED Requirements

### Requirement: Add bar keeps focus after adding
After the user adds a product from the grocery screen's add bar, by the + button or by Enter, the add bar's text input SHALL be empty and focused, so the next name can be typed straight away.

#### Scenario: Add several items with the + button
- **WHEN** the user types "apple", clicks +, then types "bread" and clicks +
- **THEN** both "apple" and "bread" are added, and after each click the empty text input has focus

#### Scenario: Add with Enter
- **WHEN** the user types "apple" and presses Enter
- **THEN** "apple" is added and the empty text input still has focus
