## ADDED Requirements

### Requirement: Profile link
The menu's user entry SHALL show the logged-in user's name, taken from the provider's username claim (`preferred_username`), and SHALL open the provider's account page (`<issuer>/account`) in a new browser tab.

#### Scenario: Open the profile
- **WHEN** user `alice` taps "alice" in the menu
- **THEN** a new tab opens on `<issuer>/account`

### Requirement: Logout
Logout SHALL revoke the stored refresh and access tokens at the provider, so the offline session ends, remove them from browser storage, end the provider's browser session, and return to the app, which then requires a new login. If revocation fails, the SPA SHALL still remove the tokens and end the provider session.

#### Scenario: Log out
- **WHEN** a logged-in user taps Logout
- **THEN** the browser goes through the provider's logout and back to the app, which redirects to the provider's login page

#### Scenario: No silent login after logout
- **WHEN** a user has logged out and reopens the app
- **THEN** the provider's login page is shown, not the shopping list

#### Scenario: Revocation unreachable
- **WHEN** the user taps Logout and the provider's revocation request fails
- **THEN** the stored tokens are still removed and the provider's logout still runs
