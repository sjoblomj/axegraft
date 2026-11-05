# Spec Delta

## Purpose

Defines how AxeGraft Editor edits the buttons of a button set, and previews them as the game's command panel would show them.

## ADDED Requirements

### Requirement: Button list
The Button Sets tab SHALL list the selected set's buttons, and SHALL let the user add, remove and reorder them, and clear the set.

#### Scenario: Clearing a set
- **WHEN** a user clears a set
- **THEN** the set has no buttons, and the mod defines it with an empty `buttons` array

#### Scenario: Adding a button
- **WHEN** a user adds a button
- **THEN** it starts with valid default values that the user can change

#### Scenario: Order of buttons
- **WHEN** a user reorders a set's buttons
- **THEN** the saved `buttons` array is in the new order

### Requirement: Button fields
The form SHALL show every button field the catalog lists for the game, including position, icon, strings, condition and its variable, and action and its variable.

#### Scenario: Warcraft II button
- **WHEN** a Warcraft II button is selected
- **THEN** the form also shows the highlighted order field

### Requirement: Fields with a name and an ID
Icon and string fields SHALL accept a typed ID or a selection by name, and SHALL accept any ID within the field's limit, even one with no known name.

#### Scenario: Icon beyond the original data
- **WHEN** a user types an icon ID the catalog doesn't name, within the field's limit
- **THEN** the ID is accepted, and the preview shows a placeholder if no image is available

### Requirement: Variables follow their function
Choosing a condition or action SHALL change its variable field to suit that function's type: unit, tech, upgrade, number, button set or none.

#### Scenario: Action reading a tech
- **WHEN** a user chooses an action that reads a tech
- **THEN** the variable field lists techs

#### Scenario: Function that reads no variable
- **WHEN** a user chooses a function that reads no variable
- **THEN** the field stays editable, within the game's limit, and is shown as unused by the function

#### Scenario: Type changes
- **WHEN** a user changes to a function reading a different type, and the old value isn't valid for it
- **THEN** the field shows a problem until a valid value is chosen

### Requirement: Variable omitted when unset
A variable on a function that doesn't read one SHALL be left out of the saved button when it's 0, unless the opened file stated it.

#### Scenario: Default variable
- **WHEN** a button's action reads no variable, and the variable is 0
- **THEN** the saved button has no `action_variable`

### Requirement: Panel preview
The preview SHALL show a grid with the game's panel layout, with each button at its position.

#### Scenario: Selecting from the preview
- **WHEN** a user clicks a filled position in the preview
- **THEN** that position's button is selected in the list and form

#### Scenario: Creating from the preview
- **WHEN** a user double-clicks an empty position in the preview
- **THEN** a new button is created at that position

#### Scenario: Several buttons at one position
- **WHEN** several buttons of a set use one position
- **THEN** the preview shows that they share it, and each is reachable from the list

### Requirement: Icon choice
The icon field SHALL offer a visual picker when game assets are imported, and a list of names and IDs otherwise.

#### Scenario: Without game assets
- **WHEN** no game assets are imported
- **THEN** the preview and icon field show names and IDs, and all editing works

### Requirement: String preview
The form SHALL show the enabled and disabled text of the selected button when game assets are imported, with a choice of which to preview. Text formatting codes SHALL NOT appear as raw bytes.

#### Scenario: String with a hotkey
- **WHEN** a button's string has a hotkey and colour codes
- **THEN** the preview shows the readable text, with the hotkey highlighted

### Requirement: Showing who uses a set
The tab SHALL list the units the mod assigns to this set, and the sets that share this one's original buttons in the game.

#### Scenario: Unit assigned in the mod
- **WHEN** a mod assigns set 5 to unit 0
- **THEN** set 5's list includes unit 0

#### Scenario: Sets sharing original buttons
- **WHEN** a set shares its original buttons with others
- **THEN** the tab lists those sets, and says that editing changes only this set

### Requirement: Copying buttons
The tab SHALL let the user copy the current buttons of this set to chosen other sets, including the sets that share its original buttons.

#### Scenario: Keeping shared sets in step
- **WHEN** a user edits a set and copies it to the sets that originally shared its buttons
- **THEN** each of those sets is defined in the mod with the same buttons

#### Scenario: Copying from another set
- **WHEN** a user copies from a set in the mod or the original game into the current set
- **THEN** the current set holds those buttons, and the source is unchanged
