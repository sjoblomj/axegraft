# Spec Delta

## Purpose

Defines how AxeGraft Editor starts and what it may depend on, so that it can still be run and changed in 20 years using only a web browser.

## ADDED Requirements

### Requirement: Runs from local files
The editor SHALL run fully when `index.html` is opened directly from disk in a current browser, with no server, install or build step.

#### Scenario: Opening the editor
- **WHEN** a user opens `index.html` from a fresh copy of the source tree
- **THEN** the editor starts and all its features work

#### Scenario: Served over HTTP
- **WHEN** the same files are served by any static web server
- **THEN** the editor behaves the same way

### Requirement: No third-party dependencies
The editor SHALL contain no third-party library, framework, font or tool, and running it SHALL NOT need any package manager or compiler. What runs in the browser SHALL be the same files that are in the source tree.

#### Scenario: Reviewing the source tree
- **WHEN** the source tree is inspected
- **THEN** it has no package manifest, lockfile, vendored library or generated application code

### Requirement: Works offline
The editor SHALL make no network requests.

#### Scenario: No network
- **WHEN** the editor is used on a machine with no network
- **THEN** every feature works

#### Scenario: Privacy of user files
- **WHEN** a user opens a mod or imports game files
- **THEN** none of their contents leave the machine

### Requirement: Current browsers only
The editor SHALL target current versions of Firefox, Chromium-based browsers and Safari, and SHALL use only standard web features for anything it needs in order to work. It MAY use a feature some of these lack only as an optional improvement.

#### Scenario: Optional feature unavailable
- **WHEN** a browser lacks saving directly to the opened file
- **THEN** saving still works, by downloading the file

### Requirement: Continues without browser storage
The editor SHALL remain usable when browser storage is unavailable or has been cleared.

#### Scenario: Storage blocked
- **WHEN** browser storage can't be used
- **THEN** the editor works for that session, and tells the user that drafts and imported assets won't be remembered

### Requirement: Runnable tests without dependencies
All automated tests SHALL be runnable by opening a page in a browser, without installing anything.

#### Scenario: Running tests in a browser
- **WHEN** a developer opens the test page
- **THEN** every test runs, and the page lists passes and failures

#### Scenario: Tests needing game files
- **WHEN** a test needs real game files and they aren't available
- **THEN** the test is reported as not checked, not as passed
