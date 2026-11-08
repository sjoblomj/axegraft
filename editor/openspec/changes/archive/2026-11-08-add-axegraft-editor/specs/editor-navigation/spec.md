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

### Requirement: Item actions under the list
Under the item list, a tab MAY have a row of buttons acting on its items. The Button Sets tab SHALL have Add, Remove, Copy and Paste there, and the Units and Requirements tabs Copy and Paste. Add SHALL add a new set with no buttons, at the lowest unused new set ID, and select it. Remove SHALL remove the chosen set only if the mod adds it. A button that can't act SHALL be disabled, and its tooltip SHALL say why.

#### Scenario: Removing an original set
- **WHEN** an original set is chosen in the Button Sets tab
- **THEN** Remove is disabled, and its tooltip says only sets the mod adds can be removed

#### Scenario: Every new set ID in use
- **WHEN** a mod uses every new set ID
- **THEN** Add is disabled, and its tooltip says so

### Requirement: What the panel shows
Under each panel's title, the editor SHALL say what the item is and what the mod does to it:
- a table entry: "Unit", or that it's a table entry that isn't a unit, so it has only a button set;
- a button set: "Original set", "Original set, replaced by this mod" or "New set, added by this mod";
- a requirement record: "Original record", "No original record" or "This mod replaces the whole record";
- a constant: the name it's saved under in the mod file, as "Saved as" and that name.

#### Scenario: Replaced set
- **WHEN** a mod defines original set 0
- **THEN** its panel says "Original set, replaced by this mod"

#### Scenario: Constant's saved name
- **WHEN** a user selects the supply limit constant
- **THEN** its panel says "Saved as max_supply"

### Requirement: Item labels and order
The item list SHALL be a tree using the catalog's groups, which SHALL expand and collapse. An item with an ID SHALL have a label that starts with its ID, and items in a group SHALL be sorted numerically by ID. Constants have no ID, and SHALL stay in catalog order.

#### Scenario: Label
- **WHEN** unit 32, named Terran Firebat, is listed
- **THEN** its label is `32 Terran Firebat`

#### Scenario: Numeric order
- **WHEN** a group holds items 2, 10 and 32
- **THEN** they're listed as 2, 10, 32

### Requirement: Item names
The Units, Button Sets, Requirements and Constants tabs SHALL let the user rename the item a panel shows, changed by the mod or not, by clicking the panel's title, which becomes a text box with a Save button and a `?` button. The name SHALL be saved in the mod's `labels`, by kind of item: `units`, `button_sets`, `upgrades`, `techs` and `orders` by ID, and `constants` by the constant's name. The patcher ignores `labels`, so a name changes nothing in the game and the item isn't marked as changed. The editor SHALL show the name wherever it names that item. Saving empty text, or the catalog's name, SHALL remove the mod's name. A renamed item's title SHALL have a mark whose tooltip says it was relabelled inside the mod, how to give it back its original name, and what that name is.

A requirement record SHALL be named by its item, so renaming a unit's record renames the unit, and a tech's research and use records SHALL share the tech's one name. A set with no name, such as a new set the user hasn't named, SHALL be shown as `Set` and its ID. Removing a new set SHALL remove its name. Wrong `labels` in an opened file SHALL only be warnings.

#### Scenario: Renaming a set
- **WHEN** a user renames set 5, Siege Tank in the catalog, to Tanks
- **THEN** the mod has `"labels": {"button_sets": {"5": "Tanks"}}`, the title shows `5 Tanks` with the relabelled mark, and the Units tab's set picker shows `5 Tanks`

#### Scenario: Renaming a unit from its requirements
- **WHEN** a user renames the record of unit 0 to Rifleman
- **THEN** the mod has `"labels": {"units": {"0": "Rifleman"}}`, and the Units tab shows `0 Rifleman`

#### Scenario: One name per tech
- **WHEN** a user renames the research record of tech 5 to Siege
- **THEN** the mod has `"labels": {"techs": {"5": "Siege"}}`, and the use record of tech 5 is titled `Tech use 5 Siege`

#### Scenario: Unnamed new set
- **WHEN** a user adds set 250 and doesn't name it
- **THEN** the title and the item list show `Set 250`

#### Scenario: Relabelled mark
- **WHEN** a user hovers over the mark beside a renamed unit 7
- **THEN** a tooltip says the unit was relabelled inside the mod, that relabelling it to the empty string gives it back its original name, and that its original name is 'Terran SCV'

### Requirement: Item list toolbar
Above the item list SHALL be a row of small icon buttons, each named by its tooltip. On the left: `Tree view` and `List view`, of which exactly one is pressed; then the `Show only changes` toggle. On the right: `Search`. The list view SHALL show every item without its groups, in ID order (requirements by type, then ID). The chosen view SHALL be remembered in the browser. `Show only changes` SHALL work in either view, and SHALL be disabled, with the tooltip `There are no changes to show`, while the tab has no changes.

#### Scenario: Switching views
- **WHEN** a user presses `List view`
- **THEN** the items are listed without groups, and `Tree view` is no longer pressed

#### Scenario: Nothing changed
- **WHEN** the current tab has no changes
- **THEN** `Show only changes` is disabled and its tooltip says `There are no changes to show`

### Requirement: Copying between mods
What a user copies, in any tab, SHALL be kept by the editor, not on the system clipboard, for the rest of the session. It SHALL be kept per game, so it can be pasted into another mod of the same game, including one opened or created after copying, and SHALL NOT be offered for pasting into a mod of the other game.

#### Scenario: Pasting into another mod
- **WHEN** a user copies a unit's fields, opens another StarCraft mod and chooses a unit
- **THEN** Paste is enabled, and pastes the copied fields

#### Scenario: Other game
- **WHEN** a user copies a StarCraft unit's fields and opens a Warcraft II mod
- **THEN** Paste is disabled

### Requirement: Filtering the tree
The item list SHALL have a search box, hidden until the `Search` button is pressed, that shows only the items whose label contains the text, ignoring case, along with the groups that hold them. Those groups SHALL be shown expanded. Pressing `Search` again, or Escape in the box, SHALL clear and hide it. Typing while the item list has focus SHALL open the box with what was typed in it.

#### Scenario: Typing in the list
- **WHEN** the item list has focus and a user types `k`
- **THEN** the search box opens, holding `k`, and has focus

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
While the mod has errors or warnings, the item list's toolbar SHALL offer a toggle that shows only the items with errors, and one that shows only the items with warnings; at most one of them is pressed at a time. These SHALL combine with the search box and with `Show only changes`.

#### Scenario: Showing only warnings
- **WHEN** a mod has warnings on two items, and a user chooses to show only warnings
- **THEN** the tree holds only those two items

#### Scenario: No problems
- **WHEN** a mod has no errors or warnings
- **THEN** these filters aren't offered

### Requirement: Help for controls
Every control in the tab panels SHALL have a help text, shown by a `?` button beside it on hover and on keyboard focus. Help for what's specific to a game SHALL come from its catalog. The item list, its toolbar and the tabs explain themselves and SHALL NOT have `?` buttons. Neither SHALL buttons whose label or symbol says all there is to say: adding, removing, copying and pasting buttons of a set, and adding, moving and removing rows of a requirement record. Help text SHALL be shown within the window, and SHALL NOT be hidden by other parts of the editor.

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
- **THEN** its toolbar and tree have no `?` button, and neither do the tabs

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
