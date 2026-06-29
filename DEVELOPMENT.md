# Development

Development uses Bun as the runtime, package manager, test runner, and build driver.

## Setup

```bash
bun install
```

The repo also includes a `devenv.sh` environment with Bun, Git, Zig, Nix language support, and TypeScript language support:

```bash
devenv shell
bun install
```

## Run Locally

```bash
bun run dev
```

Start with an initial query:

```bash
bun run dev pikachu
```

Run the CLI entrypoint directly:

```bash
bun run src/cli.tsx charizard
```

## Build

Compile the app to `dist/pkdx`:

```bash
bun run build
```

Pass a Bun compile target when building for another platform:

```bash
bun build --compile --target=bun-linux-x64 --outfile=dist/pkdx src/cli.tsx
```

Smoke-test the compiled binary:

```bash
bun run smoke:binary
```

## Release Packaging

The npm wrapper package uses a Node launcher at `bin/pkdx.mjs` and lists platform binary packages as optional dependencies. Release builds create one npm package per binary under `dist/npm/platform/` and a sanitized wrapper package under `dist/npm/root/`, then publish the platform packages before publishing the wrapper package.

Keep local development builds at `dist/pkdx`; the wrapper package `files` allowlist excludes `dist/` so a host-only development binary is not published by accident.

Supported npm binaries are macOS arm64/x64, glibc Linux arm64/x64, and Windows x64. Alpine/musl Linux is not currently shipped.

Before publishing, verify package contents with:

```bash
bun run prepare:release-packages
bun run verify:release-package
```

## Validation

Main local quality gate:

```bash
bun run check
```

Other useful commands:

```bash
bun test
bun run typecheck
bun run typecheck:native
bun run format:check
bun run lint
bun run bench
bun run ci
```

For OpenSpec work on the active rebuild change:

```bash
bun run openspec validate rebuild-terminal-pokedex
```

For devenv changes:

```bash
devenv test
```

## Generated Data

Search uses generated species indexes in `src/search/`. Regenerate them when search source data or alias overrides change:

```bash
bun run generate:index
```

PokeAPI types are generated from the upstream OpenAPI document:

```bash
bun run generate:pokeapi-types
```

Do not manually edit `src/pokeapi/generated.ts`; regenerate it instead.

## Project Notes

- `src/cli.tsx` parses CLI options and starts the OpenTUI renderer.
- `src/ui/` contains the React/OpenTUI interface.
- `src/app-state.ts` owns search/detail state transitions and key handling.
- `src/search/` owns species index lookup and fuzzy search.
- `src/pokemon-detail.ts` and `src/pokeapi/` load and shape PokeAPI data.
- `src/pokesprite.ts`, `src/sprite-rendering.ts`, and `src/terminal-images.ts` resolve and render sprites.
- `docs/adr/` records accepted project decisions.
- `CONTEXT.md` defines the domain language used in the codebase.
