## ADDED Requirements

### Requirement: TUI app launch
The system SHALL expose a `pkdx` executable that launches the Terminal Pokédex App as an interactive TUI.

#### Scenario: Launch without arguments opens Search
- **WHEN** the user runs `pkdx` without arguments
- **THEN** the app opens the Search state

#### Scenario: Exit keys close the app
- **WHEN** the user presses `q`, Escape, or Ctrl-C in a top-level app state
- **THEN** the app exits cleanly

### Requirement: Argument launch behavior
The system SHALL interpret a launch argument as a Pokémon Species query and route to Detail only when it resolves to one exact species.

#### Scenario: Exact argument opens Detail
- **WHEN** the user runs `pkdx pikachu`
- **THEN** the app opens Detail for Pikachu after required Detail data loads

#### Scenario: Ambiguous argument opens Search
- **WHEN** the user runs `pkdx pika` and the query is not an exact species identity
- **THEN** the app opens Search with `pika` as the active query and ranked results visible

### Requirement: Search and Detail state navigation
The system SHALL provide Search and Detail as the primary app states with keyboard-first navigation.

#### Scenario: Search result opens Detail
- **WHEN** the user selects a Search result and presses Enter
- **THEN** the app loads Detail for the selected Pokémon Species

#### Scenario: Detail returns to Search
- **WHEN** the user presses `/` in Detail
- **THEN** the app returns to Search

#### Scenario: Detail navigates National Dex order
- **WHEN** the user presses `h` or the left arrow in Detail
- **THEN** the app loads the previous Pokémon Species by National Dex order

#### Scenario: Detail navigates forward National Dex order
- **WHEN** the user presses `l` or the right arrow in Detail
- **THEN** the app loads the next Pokémon Species by National Dex order

### Requirement: Recoverable loading and error states
The system SHALL keep the app alive during loading and normal data failures.

#### Scenario: Detail loads atomically
- **WHEN** the user selects a Pokémon Species whose Detail data is not yet ready
- **THEN** the app shows a loading state until a complete Detail model is ready

#### Scenario: Detail failure stays recoverable
- **WHEN** Detail loading fails because required data is unavailable
- **THEN** the app shows an inline recoverable error with a path to retry or return to Search
