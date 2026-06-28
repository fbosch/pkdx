# Pokedex CLI

This context defines the domain language for a terminal Pokédex application rebuilt from the original archived CLI.

## Language

**Terminal Pokédex App**:
A terminal application for looking up and browsing Pokémon information in an interactive Pokédex-style interface.
_Avoid_: Plain CLI, data library, one-shot lookup tool

**Fuzzy Search**:
A searchable app state where a partial or imperfect query presents ranked Pokémon results for selection.
_Avoid_: Exact lookup, command argument parsing

**Search**:
The app state where the user enters a query and chooses from ranked Pokémon Species results.
_Avoid_: Catalog, command input

**Detail**:
The app state where the user views one Pokémon Species through its Default Representative.
_Avoid_: Profile, page, raw API view

**Sprite**:
A terminal-rendered visual representation of a Pokémon in the Detail state, using PokeSprite-style source artwork rather than PokeAPI artwork or terminal pixel image protocols.
_Avoid_: Pixel image requirement, decorative icon

**Shiny Sprite**:
The alternate shiny visual for a Pokémon shown as Detail presentation state, not as a separate Pokémon Species in MVP.
_Avoid_: Shiny species, variant identity

**Pokémon Species**:
The canonical National Dex entry for a Pokémon that groups its forms and variants under one searchable identity.
_Avoid_: Raw Pokémon entry

**Default Representative**:
The initial Pokémon Form shown when opening Detail for a Pokémon Species that has multiple forms or variants.
_Avoid_: Only detail, species identity

**Pokémon Form**:
A distinct form or variant of a Pokémon Species that can have its own Detail data and Sprite.
_Avoid_: Separate species, decorative sprite option

**Form Carryover**:
Keeping a regional or form-family variant selected when navigating across a direct evolution relationship whose target species has the same form family.
_Avoid_: Carrying cosmetic, gender, temporary, or battle-only forms across species navigation

**Pokémon Form Intent**:
The unresolved request to use a Pokémon Form, either by exact form identity for the current Pokémon Species or by form-family key during Form Carryover until Detail resolves it for the target Pokémon Species.
_Avoid_: Treating a carried source form as the target Pokémon Form

**Damage Taken**:
The non-neutral type damage multipliers a Pokémon receives from attacking types, including both weaknesses and resistances.
_Avoid_: Weaknesses-only, full type chart
