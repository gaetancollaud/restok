# Spec Delta

## Purpose

Gives the SPA one menu, opened from the header, that moves between its pages and holds the account actions.

## ADDED Requirements

### Requirement: Menu button
The header of the shopping list and of the Shops panel SHALL show a menu button (three horizontal stripes) at its right end, labelled "Menu" for assistive technology. Tapping it SHALL open the menu as a modal panel along the right edge of the screen.

#### Scenario: Open the menu
- **WHEN** the user taps the menu button on the shopping list
- **THEN** the menu opens on the right side of the screen

#### Scenario: Menu on the Shops panel
- **WHEN** the Shops panel is shown
- **THEN** its header shows the menu button too

### Requirement: Menu layout
The menu SHALL list, from the top: Products, then Shops. At its bottom it SHALL list the logged-in user's name, then Logout. The entry of the page being shown SHALL be marked as current.

#### Scenario: Entries in order
- **WHEN** user `alice` opens the menu
- **THEN** it shows Products and Shops at the top, and "alice" and Logout at the bottom

#### Scenario: Current page marked
- **WHEN** the user opens the menu from the Shops panel
- **THEN** Shops is marked as the current page and Products is not

### Requirement: Menu navigation
Choosing Products SHALL show the shopping list, and choosing Shops SHALL show the Shops panel, keeping the selected shop. Choosing any entry SHALL close the menu. Escape or a tap outside the menu SHALL close it without navigating.

#### Scenario: Go to Shops and back
- **WHEN** the user opens the menu, chooses Shops, then opens the menu again and chooses Products
- **THEN** the Shops panel is shown, then the shopping list, and the menu is closed after each choice

#### Scenario: Dismiss
- **WHEN** the menu is open and the user taps outside it
- **THEN** the menu closes and the same page is still shown
