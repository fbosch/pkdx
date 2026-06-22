# AGENTS

Terminal Pokédex App rebuild workspace.

## Working Model

- Treat `CONTEXT.md` as the source of truth for domain language.
- Treat `docs/adr/` as the source of truth for accepted architecture and tooling decisions.
- When implementing planned work, follow `openspec/changes/rebuild-terminal-pokedex/tasks.md` in vertical slices.

## Tooling

- Use Bun scripts from `package.json` for project validation; `bun run check` is the main local quality gate.
- Use `devenv test` for validating the Nix/devenv environment after changing `devenv.*` files.
- Worktrunk is host-provided. Keep `.config/wt.toml` checked in, but do not add Worktrunk to `devenv.nix`.

## Validation

- For tooling-slice changes, verify with `devenv test`, host `wt list`, and `bun run check`.
- For OpenSpec changes, run `bun run openspec validate rebuild-terminal-pokedex`.
