# Spec Delta

## Purpose

Defines how users move around AxeGraft Editor: the menu, the tabs, the item tree, sorting and searching, and how changed items are marked.

## ADDED Requirements

### Requirement: Main layout
The editor SHALL show a menu bar, an item list on the left, a tab for each mod part the game has on the right, and a status bar. The layout SHALL be recognisably similar to FireGraft's.

#### Scenario: StarCraft mod
- **WHEN** a StarCraft mod is open
- **THEN** the tabs are Units, Button Sets, Requirements and Constants

#### Scenario: Warcraft II mod
- **WHEN** a Warcraft II mod is open
- **THEN** the tabs are Units, Button Sets and Constants

### Requirement: Item list per tab
The item list SHALL show what the current tab edits. Units and Button Sets SHALL share a selection where the same ID exists in both, so switching between them stays on the same item.

#### Scenario: From a unit to its buttons
- **WHEN** unit 51 is selected in Units, and the user switches to Button Sets
- **THEN** button set 51 is selected

#### Scenario: Requirements list
- **WHEN** the Requirements tab is open
- **THEN** the list shows units, upgrades, tech research, tech use and orders, each in its own group

#### Scenario: Constants list
- **WHEN** the Constants tab is open
- **THEN** the list shows constants, grouped as the catalog says

### Requirement: Sorting
The item list SHALL offer tree, ID and alphabetical views. Tree view SHALL use the catalog's groups, and groups SHALL expand and collapse.

#### Scenario: Changing view
- **WHEN** a user switches from tree view to ID view
- **THEN** the items are listed by ID, and the selected item stays selected and visible

### Requirement: Jumping and searching
The item list SHALL let the user jump to an ID and search by name.

#### Scenario: Jump to an ID
- **WHEN** a user enters an ID and jumps
- **THEN** that item is selected, or the editor says it doesn't exist

#### Scenario: Search by name
- **WHEN** a user searches for `kerrigan`
- **THEN** the list shows each item whose name contains that text, ignoring case

### Requirement: Marking changes
Each item the mod changes SHALL be marked in the item list, along with the groups that contain it and its tab. Each changed field SHALL be marked in the form.

#### Scenario: Changed item in a collapsed group
- **WHEN** a mod changes an item inside a collapsed group
- **THEN** the group shows that something inside it has changed

#### Scenario: Show only changes
- **WHEN** a user chooses to show only changed items
- **THEN** the list holds only what the mod changes

### Requirement: Marking problems
Each item with a problem SHALL be marked in the item list and its tab, differently from a change.

#### Scenario: Invalid item
- **WHEN** an item has a validation problem
- **THEN** the item and its tab show the problem marker

### Requirement: Following references
Where a field refers to a unit, button set or requirement record, the editor SHALL offer a way to go to that item.

#### Scenario: Jump from a variable
- **WHEN** a button's action variable refers to a unit, and the user follows it
- **THEN** the editor shows that unit's requirement record

### Requirement: Keyboard use
Every feature SHALL be usable from the keyboard, and the item list SHALL support the usual arrow-key navigation.

#### Scenario: Tree navigation
- **WHEN** focus is on the tree and the user presses the arrow keys
- **THEN** the selection moves through visible items, and left and right collapse and expand groups

### Requirement: Status bar
The status bar SHALL show the current file name, whether there are unsaved changes, the number of problems and the build compatibility summary.

#### Scenario: Unsaved mod
- **WHEN** a mod has unsaved changes
- **THEN** the status bar says so
