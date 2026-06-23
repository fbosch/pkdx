# AGENTS

Terminal Pokédex App rebuild workspace for the `pkdx` executable.

## Working Model

- Treat `CONTEXT.md` as the source of truth for domain language.
- Treat `docs/adr/` as the source of truth for accepted architecture and tooling decisions.
- When implementing planned work, follow `openspec/changes/rebuild-terminal-pokedex/tasks.md` in vertical slices; do not rename the active OpenSpec change ID because the executable is now `pkdx`.

## Naming Boundaries

- Use `pkdx` for the package name, executable name, app-owned env vars, compiled binary, and cache directory.
- Keep `Pokédex`/`pokedex` when it is domain language, UI naming, or generated PokeAPI naming.
- Keep app-owned env vars under the `PKDX_` prefix and the compiled binary at `dist/pkdx` (`dist/pkdx.exe` on Windows).

## Generated Data

- Do not manually edit `src/pokeapi/generated.ts`; regenerate it with `bun run generate:pokeapi-types`.
- If search source data or alias overrides change, regenerate `src/search/species-index.json` with `bun run generate:index`.

## Tooling

- Use Bun scripts from `package.json` for project validation; `bun run check` is the main local quality gate.
- Use `bun run ci` when binary smoke coverage matters in addition to `bun run check`.
- Use `devenv test` for validating the Nix/devenv environment after changing `devenv.*` files.
- Worktrunk is host-provided. Keep `.config/wt.toml` checked in, but do not add Worktrunk to `devenv.nix`.

## Validation

- For tooling-slice changes, verify with `devenv test`, host `wt list`, and `bun run check`.
- For OpenSpec changes, run `bun run openspec validate rebuild-terminal-pokedex`.
- For release or build-path changes, run `bun run smoke:binary` or `bun run ci`.
