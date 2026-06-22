## Why

The archived Pokédex CLI is useful as product reference, but its implementation is stale: packaging is broken, dependencies and CI are obsolete, errors are swallowed, cache behavior is tied to the current directory, and the UI is coupled directly to raw external API responses. Rebuilding from scratch lets us preserve the intended Terminal Pokédex App experience while designing verifiable vertical slices, explicit domain boundaries, and a reproducible toolchain.

## What Changes

- **BREAKING**: Replace the archived Node/Blessed CLI implementation with a Bun-first OpenTUI React Terminal Pokédex App.
- Add a TUI-first app with Search and Detail states, Vim-style keyboard controls, and exact-argument Detail launch when possible.
- Add Fuzzy Search over a generated static Pokémon Species index using Fuse.js with weighted English names, slugs, National Dex numbers, and practical aliases.
- Add cached PokeAPI-backed Detail data with Zod validation, deterministic flavor text, stats, types, abilities, dimensions, and Damage Taken.
- Add runtime PokeSprite fetch/cache for terminal-rendered Sprites, including Shiny Sprite toggling.
- Add forms-aware Detail using PokeAPI varieties for Pokémon Form identity and PokeSprite metadata for Sprite mapping.
- Add Form Carryover for regional/form-family variants across direct evolution relationships sourced from cached PokeAPI evolution chains.
- Add reproducible project tooling with devenv, Bun, Zig, Biome, Fallow, Worktrunk, TypeScript, Lefthook, commitlint, Dependabot, GitHub Actions, and release-please.
- Target Linux compiled binary releases through GitHub Releases rather than npm publication for the MVP.

## Capabilities

### New Capabilities

- `terminal-pokedex-app`: TUI app shell, app states, keyboard model, launch behavior, loading and recoverable error behavior.
- `species-search`: Static Pokémon Species index generation and Fuse.js Fuzzy Search behavior.
- `pokemon-detail`: PokeAPI-backed Detail data, `PokemonDetail` model, cache behavior, validation, deterministic flavor text, stats, and Damage Taken.
- `sprite-rendering`: Runtime PokeSprite metadata/asset loading, cache behavior, terminal-rendered Sprites, and Shiny Sprite toggling.
- `forms-aware-detail`: Pokémon Form selection, form-specific Detail loading, PokeSprite form mapping, and Form Carryover.
- `project-tooling-release`: Reproducible development environment, quality gates, hooks, CI, dependency automation, and release workflow.

### Modified Capabilities

None.

## Impact

- Replaces the existing archived implementation model rather than refactoring it in place.
- Adds a Bun/TypeScript/OpenTUI React application structure and generated data workflow.
- Adds external runtime integrations with PokeAPI and PokeSprite, both mediated by user-cache storage.
- Adds development and release tooling: devenv/Nix, Bun lockfile, Biome, TypeScript, Fallow, Worktrunk, Lefthook, commitlint, GitHub Actions, Dependabot, and release-please.
- Produces Linux compiled binary release artifacts for MVP distribution.
