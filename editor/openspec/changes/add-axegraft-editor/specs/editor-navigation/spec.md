# Spec Delta

## Purpose

Defines how users move around AxeGraft Editor: the menu, the tabs, the item tree and its filters, help for controls, how changes and problems are marked, and the themes.

## ADDED Requirements

### Requirement: Main layout
The editor SHALL show a menu bar, an item list on the left, a tab for each mod part the game has on the right, and a status bar. The layout SHALL be recognisably similar to FireGraft's.

#### Scenario: StarCraft mod
- **WHEN** a StarCraft mod is open
- **THEN** the tabs are Units, Button Sets, Requirements and Constants

#### Scenario: Warcraft II mod
- **WHEN** a Warcraft II mod is open
- **THEN** the tabs are Units, Button Sets and Constants

### Requirement: Themes
The editor SHALL offer two themes: Dark, which is dark and bluish and is the default, and Classic, whose look is close to FireGraft's. The user SHALL choose the theme from the View menu, and the choice SHALL be remembered in that browser. Where the browser can't store it, the editor SHALL still work, using Dark.

#### Scenario: First start
- **WHEN** the editor starts in a browser where no theme has been chosen
- **THEN** it uses Dark

#### Scenario: Choosing Classic
- **WHEN** a user chooses Classic from the View menu
- **THEN** the editor uses it at once, and again at the next start in that browser

### Requirement: Menu bar
Once a menu is open, moving the pointer over another menu's title SHALL open that menu and close the first. A click outside the open menu, or Escape, SHALL close it.

#### Scenario: Moving between menus
- **WHEN** the File menu is open, and the user moves the pointer over Edit
- **THEN** Edit opens, and File closes

#### Scenario: Clicking elsewhere
- **WHEN** a menu is open, and the user clicks outside it
- **THEN** the menu closes

### Requirement: Item list per tab
The item list SHALL show what the current tab edits. Each tab SHALL keep its own selection. An ID SHALL NOT link items between tabs: a unit and a button set with the same ID are unrelated, and a unit's set is whichever one its `button_set` says.

#### Scenario: Switching tabs
- **WHEN** a unit is selected in Units, and the user switches to Button Sets
- **THEN** Button Sets shows the set last selected there

#### Scenario: Requirements list
- **WHEN** the Requirements tab is open
- **THEN** the list shows units, upgrades, tech research, tech use and orders, each in its own group

#### Scenario: Constants list
- **WHEN** the Constants tab is open
- **THEN** the list shows constants, grouped as the catalog says

### Requirement: Item labels and order
The item list SHALL be a tree using the catalog's groups, which SHALL expand and collapse. An item with an ID SHALL have a label that starts with its ID, and items in a group SHALL be sorted numerically by ID. Constants have no ID, and SHALL stay in catalog order.

#### Scenario: Label
- **WHEN** unit 32, named Terran Firebat, is listed
- **THEN** its label is `32 Terran Firebat`

#### Scenario: Numeric order
- **WHEN** a group holds items 2, 10 and 32
- **THEN** they're listed as 2, 10, 32

### Requirement: Filtering the tree
The item list SHALL have a search box that shows only the items whose label contains the text, ignoring case, along with the groups that hold them. Those groups SHALL be shown expanded.

#### Scenario: Search by name
- **WHEN** a user searches for `kerrigan`
- **THEN** the tree shows each item whose label contains that text

#### Scenario: Search by ID
- **WHEN** a user searches for `51`
- **THEN** the tree shows unit 51, along with every other item whose label contains `51`

#### Scenario: Clearing the search
- **WHEN** a user clears the search box
- **THEN** the whole tree is shown again, and the selected item is still selected

### Requirement: Marking changes
Each item the mod changes SHALL be marked in the item list, along with the groups that contain it and its tab. Each changed field SHALL be marked in the form. Hovering over or focusing a field's mark SHALL show `Value changed. Original: ` followed by the field's original value, or only `Value changed.` where the original isn't known. Unchanged fields SHALL NOT show their original value, since it's the value shown.

#### Scenario: Changed item in a collapsed group
- **WHEN** a mod changes an item inside a collapsed group
- **THEN** the group shows that something inside it has changed

#### Scenario: Original value of a changed field
- **WHEN** a mod changes Maximum supply from 400 to 600, and the user hovers over the field's mark
- **THEN** the editor shows `Value changed. Original: 400`

#### Scenario: Show only changes
- **WHEN** a user chooses to show only changed items
- **THEN** the list holds only what the mod changes

### Requirement: Marking problems
Each item with an error or a warning SHALL be marked in the item list, along with the groups that contain it and its tab. Errors, warnings and changes SHALL look different from each other.

#### Scenario: Item with an error
- **WHEN** an item has an error
- **THEN** the item and its tab show the error marker

### Requirement: Filtering by problem
While the mod has errors or warnings, the item list SHALL offer a filter that shows only the items with errors, and one that shows only the items with warnings. These SHALL combine with the search box.

#### Scenario: Showing only warnings
- **WHEN** a mod has warnings on two items, and a user chooses to show only warnings
- **THEN** the tree holds only those two items

#### Scenario: No problems
- **WHEN** a mod has no errors or warnings
- **THEN** these filters aren't offered

### Requirement: Help for controls
Every control in the tab panels SHALL have a help text, shown by a `?` button beside it on hover and on keyboard focus. Help for what's specific to a game SHALL come from its catalog. The search box, the filter, the item list and the tabs explain themselves and SHALL NOT have `?` buttons. Neither SHALL buttons whose label or symbol says all there is to say: adding and removing buttons of a set, and adding, moving and removing rows of a requirement record. Help text SHALL be shown within the window, and SHALL NOT be hidden by other parts of the editor.

#### Scenario: Reading help
- **WHEN** a user hovers over or focuses a control's `?` button
- **THEN** that control's help text is shown

#### Scenario: Help that depends on the game
- **WHEN** a user opens the help for a button field that only one game has
- **THEN** the text comes from that game's catalog

#### Scenario: Help near the edge of the window
- **WHEN** a user opens the help of a `?` button near the edge of the window, or inside a panel that scrolls
- **THEN** all of the text is shown, inside the window

#### Scenario: Item list
- **WHEN** the item list is shown
- **THEN** its search box, filter and tree have no `?` button, and neither do the tabs

### Requirement: Following references
Where a field refers to a unit, button set or requirement record, the editor SHALL offer a way to go to that item. A unit SHALL lead to its requirement record in a game with requirements, and to its entry in the Units tab in a game without them. A field whose item has no place in the game, such as an upgrade in a game without requirements, SHALL offer no way to go to it.

#### Scenario: Jump from a variable
- **WHEN** a button's action variable refers to a unit, and the user follows it
- **THEN** the editor shows that unit's requirement record

#### Scenario: Jump in a game without requirements
- **WHEN** a Warcraft II button's action variable refers to a unit, and the user follows it
- **THEN** the editor shows that unit in the Units tab, and a condition variable that refers to an upgrade offers no way to go to it

### Requirement: Keyboard use
Every feature SHALL be usable from the keyboard, and the item list SHALL support the usual arrow-key navigation. The item list SHALL show where its keyboard cursor is, including on a group.

#### Scenario: Tree navigation
- **WHEN** focus is on the tree and the user presses the arrow keys
- **THEN** the selection moves through visible items, and left and right collapse and expand groups

#### Scenario: Moving onto a group
- **WHEN** a unit is selected, and the user presses Up onto the group above it
- **THEN** the group is shown as where the cursor is, and the unit stays selected

### Requirement: Status bar
The status bar SHALL show the current file name, whether there are unsaved changes, the number of errors and warnings and the version compatibility summary.

#### Scenario: Unsaved mod
- **WHEN** a mod has unsaved changes
- **THEN** the status bar says so
