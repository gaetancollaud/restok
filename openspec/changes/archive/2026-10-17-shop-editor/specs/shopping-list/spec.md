# Spec Delta

## MODIFIED Requirements

### Requirement: Buy and add again from the screen
Tapping a To-buy product twice within a short time SHALL mark it bought and show it first in the Bought grid, which lists products most recently bought first; a single tap SHALL do nothing. Tapping a Bought product once SHALL mark it not bought and return it to To buy.

#### Scenario: Buy and add again
- **WHEN** the user double-taps "apple" in To buy, then taps "apple" in Bought
- **THEN** "apple" first moves to the top of Bought, then returns to To buy

#### Scenario: Stray tap
- **WHEN** the user taps "apple" in To buy once
- **THEN** "apple" stays in To buy
