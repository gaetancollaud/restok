# Spec Delta

## MODIFIED Requirements

### Requirement: Product popup
Long-pressing any tile, or opening its context menu (right click, menu key), SHALL open a popup showing the product's name, a category dropdown, and a shop dropdown listing "Any shop" then every shop. The shop dropdown SHALL show the product's shop, or "Any shop" when it has none. Changing it SHALL save with `setProductShop` at once. The long press SHALL NOT also mark the product bought or not bought. The popup SHALL close with a close button or Escape.

#### Scenario: Restrict from the popup
- **WHEN** the user long-presses "parmesan", picks "Lidl" in the dropdown, and closes the popup while "Coop" is selected
- **THEN** `setProductShop` is called with Lidl and "parmesan" leaves To buy

#### Scenario: Default is any shop
- **WHEN** the user long-presses a product that has no shop
- **THEN** the dropdown shows "Any shop"

#### Scenario: Long press does not buy
- **WHEN** the user long-presses a To-buy tile and releases
- **THEN** the product stays in To buy and the popup is open

## ADDED Requirements

### Requirement: Category from the popup
The product popup's category dropdown SHALL list "No category" then every category by name, and SHALL show the product's category, or "No category" when it has none. While the product is `PENDING`, the popup SHALL also read "Sorting into a category…". Changing the dropdown SHALL save with `setProductCategory` at once, and "No category" SHALL clear the category.

#### Scenario: Correct a wrong category
- **WHEN** the AI put "tomato" in "Fruits", "Coop" orders [Légumes, Pain, Fruits], and the user long-presses "tomato" and picks "Légumes"
- **THEN** `setProductCategory` is called with Légumes, and without a reload the tile reads "Légumes" with the green dot and moves to the Légumes position in To buy

#### Scenario: Categorize an unclassified product
- **WHEN** "bougies" has no category and the user long-presses it
- **THEN** the category dropdown shows "No category", and picking "Ménage" saves it and the tile reads "Ménage"

#### Scenario: Clear a category
- **WHEN** the user picks "No category" for "tomato"
- **THEN** `setProductCategory` is called with a null category and the tile reads "No category" with the red dot

#### Scenario: Choose while the AI is sorting
- **WHEN** "gruyère" is still `PENDING`, the user picks "Fromage", and the AI answers later
- **THEN** the popup first read "Sorting into a category…", and "gruyère" keeps "Fromage"
