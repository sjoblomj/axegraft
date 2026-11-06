# Spec Delta

## ADDED Requirements

### Requirement: Original buttons shown by version
When a set's original buttons differ between versions, the tab SHALL show the original list of each group of versions that share one, naming those versions. Where they don't differ, it SHALL show one list for all versions.

#### Scenario: Set that differs on the DOS versions
- **WHEN** a user selects Warcraft II's Goblin Zeppelin set
- **THEN** the tab shows its original for 2.00 and 2.02 and its original for 1.3, 1.33 and 1.5, each with its versions named

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
In a game whose catalog needs ascending positions, the tab SHALL offer to sort a set's buttons by position, as one undoable change. Buttons with the same position SHALL keep their order.

#### Scenario: Sorting
- **WHEN** a user sorts a set whose buttons are at positions 5, 1, 1 and 3
- **THEN** the buttons are at positions 1, 1, 3 and 5, the two at position 1 in their previous order
