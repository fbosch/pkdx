## Context

The original archived CLI demonstrates the intended product shape: a terminal Pokédex for browsing Pokémon with search, detail data, sprites, navigation, stats, and Damage Taken. Its implementation should not be carried forward because it couples UI rendering to raw API responses, caches into the caller's current directory, swallows errors, uses stale dependencies, and has broken packaging metadata.

The rebuild is a TUI-first application with a tested non-interactive core. The domain language is defined in `CONTEXT.md`; durable choices are recorded in ADRs `0001` through `0006`.

## Goals / Non-Goals

**Goals:**

- Build a Terminal Pokédex App with Search and Detail states.
- Keep implementation slices vertical and verifiable after every task.
- Use OpenTUI React for the TUI, Bun for runtime/test/build, and a compiled Linux binary as the MVP release artifact.
- Use a static generated Pokémon Species index for Fuzzy Search.
- Fetch and cache PokeAPI Detail data, PokeAPI evolution chains, and PokeSprite resources in the user cache directory.
- Validate external API data at boundaries with Zod before building internal models.
- Keep renderers consuming internal models rather than raw external API responses.

**Non-Goals:**

- Preserve the old Blessed implementation, npm package behavior, `dex` command alias, or current package layout.
- Publish to npm in the MVP.
- Support non-interactive text or JSON output in the MVP.
- Make Search return individual Pokémon Forms; Search remains Pokémon Species oriented.
- Run live PokeAPI or PokeSprite network checks in normal CI.

## Decisions

### TUI And Runtime

The app uses OpenTUI React rather than Blessed, Ink, direct OpenTUI core, or Bubble Tea. OpenTUI React keeps the app in TypeScript while avoiding the old mutable Blessed node lifecycle model and preserving a declarative UI for Search and Detail.

The project is Bun-first, ESM-only, and targets a Linux compiled binary for MVP distribution. Bun aligns with OpenTUI's ecosystem and keeps runtime, package manager, test runner, and build tooling cohesive.

### Internal Boundaries

The rebuild uses focused modules rather than layer-only tasks:

- `cli`: command launch and argument interpretation.
- `app-state`: Search, Detail, loading, error, shiny, form selector, and navigation state.
- `search`: generated species index loading and Fuse.js ranking.
- `pokeapi`: cached PokeAPI resource fetches and Zod schemas.
- `pokesprite`: cached PokeSprite metadata and sprite asset resolution.
- `cache`: user cache directory, TTL handling, and resource storage.
- `pokemon-detail`: `PokemonDetail` model construction from validated resources.
- `type-matchups`: dependency-backed Damage Taken calculation.
- `ui`: OpenTUI React components consuming app state and internal models.

### Search And Detail Model

Search uses a generated static species index committed with the app. The generator rebuilds the index from PokeAPI species data and hand-maintained alias overrides. Runtime Search uses Fuse.js with weighted fields for English display name, slug, dex number variants, and aliases.

Detail data is loaded on demand. Raw PokeAPI resources are cached by canonical resource URL with a 30-day TTL. `PokemonDetail` is built from validated resources and is the only data shape consumed by Detail UI components.

Detail loads atomically: the UI shows a loading state for a target Pokémon Species/Form and swaps to the new `PokemonDetail` only when required resources are ready. Failures are recoverable in-app.

### Sprites And Forms

Sprites use PokeSprite resources fetched at runtime and cached under the user cache directory. The Sprite is terminal-rendered source artwork, not PokeAPI artwork and not a hard dependency on terminal pixel image protocols.

Detail is forms-aware. PokeAPI species varieties define Pokémon Form identity and form-specific data. PokeSprite metadata maps those forms to regular and shiny Sprite assets. Search remains species-only; selecting a species opens its Default Representative and Detail can switch forms via a selector.

Species navigation remains National Dex based. Form Carryover applies only when moving across a direct evolution relationship whose target species has the same regional or form-family variant. Direct evolution relationships come from cached PokeAPI evolution chains, not Dex adjacency.

### Tooling And Release

`devenv.sh` with Nix provides Bun, Zig, Fallow, Worktrunk, and support tools. `package.json` scripts remain the canonical project commands. Biome handles formatting/linting, TypeScript handles type checking, Bun test handles tests, Fallow provides deterministic codebase intelligence, Worktrunk manages the project worktree workflow through checked-in `.config/wt.toml`, Lefthook runs local Git hooks, commitlint enforces Conventional Commits, Dependabot groups dependency updates, and release-please creates GitHub Releases with Linux binary artifacts.

CI runs through `devenv shell` with frozen `bun.lock`, deterministic tests, generated-index freshness checks, and compiled-binary smoke checks. Normal CI does not depend on live external network services.

## Risks / Trade-offs

- OpenTUI React and Bun may have native/build constraints -> Pin Zig and use `devenv` locally and in CI.
- PokeAPI and PokeSprite slugs may not map one-to-one -> Keep explicit mapping logic, fixtures, and tests for known difficult forms.
- Generated species index can drift -> Require `verify:index` to fail when generated data is stale.
- Runtime external resources can fail -> Keep Search available offline, use cached Detail/Sprite resources when present, and show recoverable errors when missing.
- Form-aware Detail expands MVP scope -> Preserve vertical slices so default Detail works before form selection, sprite mapping, and carryover are added.
- Terminal layout and rendering tests can become brittle -> Put most tests around model/state/cache/search logic and keep renderer smoke tests minimal.
