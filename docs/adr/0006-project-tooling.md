# Use devenv, Bun, Biome, Fallow, Worktrunk, Lefthook, and release-please

The rebuild will use `devenv.sh` with Nix to provide the reproducible local toolchain, including Bun, Zig, Fallow, Worktrunk, and project support tools. Bun is the package/runtime/test baseline, Biome handles formatting and linting, Fallow provides deterministic JS/TS codebase intelligence for unused code, duplication, circular dependencies, complexity hotspots, architecture boundaries, and dependency hygiene, `tsc --noEmit` handles type checking, Worktrunk manages the project worktree workflow through checked-in project configuration, Lefthook runs local Git hooks, commitlint enforces Conventional Commits, and release-please manages GitHub Releases with compiled Linux binary artifacts.

This intentionally avoids the old npm/Travis/Snyk-protect workflow and avoids splitting formatting/linting across ESLint and Prettier unless future React/OpenTUI needs require that extra surface.
