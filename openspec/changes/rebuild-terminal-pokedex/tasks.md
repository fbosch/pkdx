## 1. Tooling Baseline

- [x] 1.1 Replace the placeholder package metadata with Bun-first ESM scripts for `dev`, `build`, `test`, `test:related`, `typecheck`, `format`, `format:check`, `lint`, `fallow`, `fallow:audit`, `check`, `generate:index`, `verify:index`, `ci`, and `openspec`.
- [x] 1.2 Add TypeScript strict configuration with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` enabled.
- [x] 1.3 Add devenv files that provide Bun, Zig, Fallow, and project support tools, plus `.envrc` for direnv activation.
- [x] 1.4 Add Biome configuration and scripts for formatting and linting.
- [x] 1.5 Add Fallow configuration or documented zero-config invocation and include it in `check` or `ci` as the project quality gate.
- [x] 1.6 Add Worktrunk project configuration in `.config/wt.toml` for shared worktree workflow behavior without duplicating Lefthook Git hook responsibilities.
- [x] 1.7 Add minimal test/build placeholders so the standard script contract can run before product code exists.
- [x] 1.8 Verify the slice with `devenv test`, host-provided `wt list`, and `bun run check`.

## 2. Bootable App Skeleton

- [x] 2.1 Add OpenTUI React app entrypoint and `pkdx` executable wiring that launches a minimal Search screen.
- [x] 2.2 Add app-state handling for top-level Search state and clean exit on `q`, Escape, and Ctrl-C.
- [x] 2.3 Add first smoke tests for launch state and exit-state transitions.
- [x] 2.4 Verify the slice with `bun run check` and a compiled binary smoke run that starts and exits cleanly.

## 3. Static Species Search

- [x] 3.1 Add species index source fixtures, alias overrides, and a generator that writes the runtime static Pokémon Species index.
- [x] 3.2 Add `verify:index` so CI can fail when the committed static index is stale.
- [x] 3.3 Add Fuse.js search over English name, slug, National Dex number variants, and aliases using weighted ranking.
- [x] 3.4 Render Search query input and ranked Pokémon Species results in the TUI with `j/k` and arrow selection.
- [x] 3.5 Open placeholder Detail from Search on Enter while keeping Search species-only.
- [x] 3.6 Support exact launch arguments opening placeholder Detail and ambiguous launch arguments opening prefilled Search.
- [x] 3.7 Verify the slice with search ranking tests for `pikachu`, `pika`, `001`, `nidoran female`, and `mr mime`, plus a manual TUI smoke run.

## 4. Default Detail From PokeAPI

- [x] 4.1 Add persisted TanStack Query cache configuration with injectable test path and per-query cache policies.
- [x] 4.2 Add PokeAPI resource query functions keyed by canonical URL without exposing raw responses outside the PokeAPI module.
- [x] 4.3 Add Zod schemas for consumed Pokémon, species, varieties, and evolution-chain fields.
- [x] 4.4 Add `PokemonDetail` model construction for a species Default Representative with name, National Dex number, types, abilities, height, weight, stats, deterministic flavor text, and Sprite reference placeholder.
- [x] 4.5 Render real Detail fields from `PokemonDetail` instead of placeholder Detail.
- [x] 4.6 Verify the slice with mocked PokeAPI tests, Zod boundary tests, cache TTL tests, `PokemonDetail` mapping tests, and exact-argument Detail smoke.

## 5. Loading, Error, And Offline Behavior

- [x] 5.1 Add atomic Detail loading state so the UI swaps to a new `PokemonDetail` only after required resources are ready.
- [x] 5.2 Add inline recoverable Detail errors with retry and return-to-Search behavior.
- [x] 5.3 Add offline behavior where Search works from the static index, cached Detail loads offline, and uncached Detail fails recoverably.
- [x] 5.4 Add app-state tests for loading, successful load, retry, Search fallback, cached-offline Detail, and not-cached offline errors.
- [x] 5.5 Verify the slice with `bun test` and manual smoke using mocked or disabled network paths.

## 6. Damage Taken Panel

- [x] 6.1 Add the selected type-matchup dependency and wrap it behind a focused `type-matchups` module.
- [x] 6.2 Compute Damage Taken as all non-neutral attacking-type multipliers for the current Pokémon types.
- [x] 6.3 Render the Damage Taken panel in Detail with both weaknesses and resistances while excluding neutral `1x` entries.
- [x] 6.4 Verify the slice with representative single-type and dual-type matchup tests and a Detail render smoke test.

## 7. PokeSprite Runtime Sprite

- [x] 7.1 Add persisted PokeSprite metadata querying and parsing for sprite slug and asset resolution.
- [x] 7.2 Add PokeSprite PNG asset file caching by resolved Sprite URL.
- [x] 7.3 Add terminal-rendered Sprite rendering in Detail from cached PokeSprite-style source artwork.
- [x] 7.4 Keep Detail recoverable when Sprite resources fail, while surfacing the Sprite-specific error in the Detail UI.
- [x] 7.5 Verify the slice with PokeSprite metadata fixtures, sprite cache tests, known slug mapping tests, and Detail Sprite smoke.

## 8. Shiny Sprite Toggle

- [ ] 8.1 Add Detail state for regular versus Shiny Sprite presentation.
- [ ] 8.2 Add `s` key handling in Detail only to toggle Shiny Sprite presentation.
- [ ] 8.3 Resolve and cache the shiny PokeSprite asset for the current Pokémon Form without changing species or form identity.
- [ ] 8.4 Verify the slice with state transition tests, regular/shiny cache-key tests, and Detail keymap tests.

## 9. Forms-Aware Detail

- [ ] 9.1 Add PokeAPI species varieties loading and form identity normalization for Pokémon Forms.
- [ ] 9.2 Add PokeSprite metadata mapping from Pokémon Forms to available regular and shiny Sprite assets.
- [ ] 9.3 Add `f` key handling in Detail to open a form selector with `j/k`, arrows, Enter, and Escape behavior.
- [ ] 9.4 Load form-specific `PokemonDetail` data and Sprite when a form is selected.
- [ ] 9.5 Verify the slice with form list tests, Charizard and Pikachu form mapping fixtures, form selector state tests, and form-specific Detail mapping tests.

## 10. Form Carryover

- [ ] 10.1 Add cached PokeAPI evolution-chain loading for species involved in Detail navigation.
- [ ] 10.2 Compute direct evolution relationships from evolution-chain resources without using Dex adjacency as the relationship source.
- [ ] 10.3 Apply Form Carryover during National Dex `h/l` navigation only for matching regional or form-family variants across direct evolution relationships.
- [ ] 10.4 Reset to the target species Default Representative for non-matching, cosmetic, gender, temporary, or battle-only forms.
- [ ] 10.5 Verify the slice with Galarian and Alolan carryover examples, non-carry examples, and `h/l` app-state tests.

## 11. CI And Release Workflow

- [x] 11.1 Add Lefthook configuration for lint-staged pre-commit format/lint/related-test, pre-push typecheck plus changed-scope Fallow audit, and commit-msg commitlint.
- [x] 11.2 Add commitlint conventional configuration.
- [ ] 11.3 Add grouped Dependabot configuration for package and GitHub Actions updates.
- [x] 11.4 Add GitHub Actions CI that runs through `devenv shell`, uses frozen `bun.lock`, runs deterministic checks, verifies generated index freshness, and smoke-tests the Linux compiled binary without live PokeAPI or PokeSprite dependencies.
- [ ] 11.5 Add release-please configuration and release workflow that publishes GitHub Releases with Linux compiled binary artifacts.
- [ ] 11.6 Verify the slice with `bun run ci`, hook dry-runs where supported, workflow validation, and a local release build smoke.
