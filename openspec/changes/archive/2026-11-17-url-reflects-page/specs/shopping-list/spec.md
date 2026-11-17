## MODIFIED Requirements

### Requirement: All shops view
The grocery screen's shop dropdown SHALL offer "All shops" as its first option. With it selected, To buy SHALL show every product still to buy, whatever its shop, sorted by name, with no "more for other shops" line. The screen SHALL open on "All shops" unless the URL names a shop.

#### Scenario: See everything
- **WHEN** "parmesan" is restricted to "Lidl", "apple" has no shop, and the user selects "All shops"
- **THEN** To buy shows "apple" then "parmesan" and no hidden count

#### Scenario: Back to a shop
- **WHEN** the user then selects "Coop"
- **THEN** "parmesan" is hidden again and the screen reads "1 more for other shops"

#### Scenario: Opens on All shops
- **WHEN** shops "Coop" and "Lidl" exist and the user opens the app at `/` away from every shop
- **THEN** the dropdown shows "All shops" and To buy shows every product still to buy

#### Scenario: Opens on the shop in the URL
- **WHEN** the user opens `/list/{id}` with the id of "Lidl"
- **THEN** the dropdown shows "Lidl"

### Requirement: Nearby shop selected on open
When the app opens at `/`, the SPA SHALL ask the device for its position once. If one or more shops with a location are within 200 m of it, the grocery screen SHALL select the nearest of them. Without a position (permission denied, unavailable, or no answer within 10 s), or with no shop within 200 m, the screen SHALL stay on "All shops" and show no error. Shops without a location SHALL be ignored. When the app opens on a URL that names a shop, that shop SHALL be kept and the position SHALL NOT change the selection.

#### Scenario: In a shop
- **WHEN** "Coop" is 50 m from the device and the user opens the app
- **THEN** the dropdown shows "Coop" and To buy follows Coop's order

#### Scenario: Two shops close by
- **WHEN** "Coop" is 150 m and "Migros" 80 m from the device and the user opens the app
- **THEN** the dropdown shows "Migros"

#### Scenario: Too far
- **WHEN** the nearest shop is 250 m from the device and the user opens the app
- **THEN** the dropdown stays on "All shops"

#### Scenario: Location refused
- **WHEN** the user denies the location permission
- **THEN** the dropdown stays on "All shops" and no error is shown

#### Scenario: URL names a shop
- **WHEN** the user opens `/list/{id}` with the id of "Lidl" while "Coop" is 50 m away
- **THEN** the dropdown keeps "Lidl"
