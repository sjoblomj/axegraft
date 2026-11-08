# Spec Delta

## ADDED Requirements

### Requirement: Sets that match the original on only some versions
A defined set SHALL stay in the mod unless its buttons match the original on every version. This SHALL hold both when editing and when a file is opened and saved.

#### Scenario: Edited to 2.02's original
- **WHEN** a user edits the Goblin Zeppelin set so it matches 2.02's original but not 1.5's
- **THEN** the mod still defines the set

#### Scenario: File with the original of every version
- **WHEN** a file defines a set whose original is the same list on every version, with exactly that list, and the user opens and saves it
- **THEN** the saved file doesn't define that set

#### Scenario: File with one version's original
- **WHEN** a file defines the Goblin Zeppelin set with 2.02's original, and the user opens and saves it
- **THEN** the saved file still defines that set
