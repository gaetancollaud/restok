## MODIFIED Requirements

### Requirement: Install button
The grocery screen header SHALL show an Install button next to the menu button while the browser offers an install prompt for the app. Tapping it SHALL open the browser's install prompt. The button SHALL disappear once the app is installed or the prompt has been used.

#### Scenario: Not installed
- **WHEN** the browser offers to install the app and no update is ready
- **THEN** the header shows the Install button next to the menu button

#### Scenario: Tap Install
- **WHEN** the user taps the Install button
- **THEN** the browser's install prompt opens, and the button is hidden afterwards whether the user accepts or dismisses it

#### Scenario: Already installed or unsupported
- **WHEN** the app runs installed, or in a browser that offers no install prompt
- **THEN** no Install button is shown
