# Tasks

## 1. Add bar refocus

- [x] 1.1 In `src/main/webui/src/app/basket/add-bar/add-bar.ts` `submit()`, call `field.focus()` after clearing the field (only when a name was emitted); verify by reading the diff that blank input still does nothing
- [x] 1.2 Add `src/main/webui/src/app/basket/add-bar/add-bar.spec.ts`: type a name, click the + button, assert `add` emitted the trimmed name, the input is empty and `document.activeElement` is the input; repeat for a second name; verify with `npm test` in `src/main/webui`

## 2. Integration check

- [x] 2.1 Run the app, add three items in a row on the grocery screen using only the keyboard and the + button (no click back into the input), and do the same for categories in the Shops panel; verify each item is added and the cursor stays in the input
