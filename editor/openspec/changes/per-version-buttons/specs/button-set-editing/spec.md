# Spec Delta

## ADDED Requirements

### Requirement: Original buttons shown by version
When a set's original buttons differ between versions, the tab SHALL show the original list of each group of versions that share one side by side, naming those versions, with the buttons lined up so the lists can be compared. A button missing from a group SHALL be marked red, a button that only some groups have green, and a button that differs between groups yellow. Where they don't differ, it SHALL show one list for all versions.

#### Scenario: Set that differs on the DOS versions
- **WHEN** a user selects Warcraft II's Goblin Zeppelin set
- **THEN** the tab shows its original for 1.3, 1.33 and 1.5 beside its original for 2.00 and 2.02, each with its versions named, with the Patrol button green in the 2.00 and 2.02 column and its empty place red in the DOS column

#### Scenario: Button that differs between versions
- **WHEN** a button at the same place in two groups' lists has another condition in one of them
- **THEN** both are on one row, marked yellow

#### Scenario: Set that never differs
- **WHEN** a user selects a set with one original list
- **THEN** the tab shows that list once, for all versions

### Requirement: Changes compared with every version's original
A set SHALL count as changed when its buttons differ from the original of any version, and the tab SHALL say on which versions they differ.

#### Scenario: Buttons that match only 2.02
- **WHEN** a mod defines the Goblin Zeppelin set with 2.02's original buttons
- **THEN** the set is shown as changed on 1.3, 1.33 and 1.5, and unchanged on 2.00 and 2.02

### Requirement: Reverting a set that differs by version
Reverting a set SHALL remove it from the mod, so each version keeps its own original.

#### Scenario: Reverting
- **WHEN** a user reverts a Warcraft II set whose original differs by version
- **THEN** the mod no longer defines the set, and every version uses its own original

### Requirement: Copying an original that differs by version
Copying the original buttons of a set whose original differs by version SHALL let the user choose which version's original to copy, starting with the default.

#### Scenario: Copying the DOS original
- **WHEN** a user copies the original of the Dwarven Demolition Squad set and chooses 1.5
- **THEN** the eight buttons of 1.5 are copied

### Requirement: Buttons out of position order
In a game whose catalog needs ascending positions, a set whose buttons aren't in ascending position order SHALL be an error, naming the set and the first button out of order.

#### Scenario: Out of order in Warcraft II
- **WHEN** a Warcraft II set has a button at position 5 followed by one at position 3
- **THEN** the set has an error, and the mod can't be saved until it's fixed

#### Scenario: Shared positions
- **WHEN** a Warcraft II set has three buttons at position 1 in a row, such as the shield icons for each level
- **THEN** there is no error

### Requirement: Sorting by position
In a game whose catalog needs ascending positions, the tab SHALL offer to sort a set's buttons by position, as one undoable change, when they're out of order. Every edit keeps the order, so only a mod opened that way can be. The offer and its help SHALL NOT be shown for a set in order. Buttons with the same position SHALL keep their order.

#### Scenario: Sorting
- **WHEN** a user sorts a set whose buttons are at positions 5, 1, 1 and 3
- **THEN** the buttons are at positions 1, 1, 3 and 5, the two at position 1 in their previous order

### Requirement: Keeping position order
In a game whose catalog needs ascending positions, a button whose position the user changes, whether in its form, in the list or in the preview, and a button the user adds SHALL be put in its place in the list: before the first other button at a higher position, so it's last of those sharing its position. No other button SHALL move in the list, and no other button's fields SHALL change, except where a push in the list or the preview moves them. The editor SHALL NOT sort a set the user didn't change, such as one in a mod it opens.

#### Scenario: Changing a position
- **WHEN** a set's buttons are at positions 0, 1 and 2, and a user changes the first button's position to 5
- **THEN** the buttons are at positions 1, 2 and 5, the changed button is last, and it's still selected

#### Scenario: Joining a position
- **WHEN** a set's buttons are at positions 1, 3, 3 and 5, and a user moves the first to position 3
- **THEN** it's the third button, after the two that were at position 3

#### Scenario: Adding a button
- **WHEN** a set's buttons are at positions 1, 2 and 5, and a user adds a button
- **THEN** the new button is at position 0 and first in the list
