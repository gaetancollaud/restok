# Proposal

## Why

Clicking the + button moves focus to the button, so adding several items in a row means clicking back into the text input each time (and on a phone, the keyboard closes after every item). Pressing Enter already keeps focus; the + button should behave the same.

## What Changes

- After an item is added with the + button, focus returns to the add bar's text input, ready for the next name.
- The add bar is shared, so the category add bar in the Shops panel gets the same behavior.
- Blank input (button disabled) is unchanged: nothing is added and focus is not moved.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `shopping-list`: the grocery screen's add bar keeps the text input focused after adding with +.
- `shops`: the Shops panel's category add bar keeps the text input focused after adding with +.

## Impact

- Frontend only: `src/main/webui/src/app/basket/add-bar/` (component + new spec test).
- No API, backend, or data changes.
