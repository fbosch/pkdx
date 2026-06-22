## ADDED Requirements

### Requirement: Reproducible development environment
The project SHALL use `devenv.sh` with Nix to provide the local and CI toolchain.

#### Scenario: Local environment provides required tools
- **WHEN** a developer enters the devenv environment
- **THEN** Bun, Zig, Fallow, and project support tools are available

#### Scenario: CI uses devenv shell
- **WHEN** GitHub Actions runs project checks
- **THEN** checks execute through the devenv-provided environment

### Requirement: Quality command contract
The project SHALL expose standard package scripts for development, validation, generation, and build workflows.

#### Scenario: Check script validates project
- **WHEN** the developer runs `bun run check`
- **THEN** formatting, linting, type checking, tests, generated index freshness, Fallow checks, and build-relevant validation run according to the project script contract

#### Scenario: Typecheck is separate from Bun build
- **WHEN** validation runs
- **THEN** TypeScript type checking is performed with `tsc --noEmit` rather than relying on Bun build

### Requirement: Worktrunk project workflow
The project SHALL include checked-in Worktrunk project configuration for shared worktree workflow behavior.

Worktrunk SHALL be provided by the host machine rather than built through the project devenv environment.

#### Scenario: Worktrunk project config exists
- **WHEN** the repository tooling baseline is installed
- **THEN** `.config/wt.toml` defines project-level Worktrunk behavior for this repository

#### Scenario: Worktrunk does not replace Git hooks
- **WHEN** local commit or push validation is configured
- **THEN** Lefthook remains responsible for Git hook checks while Worktrunk remains responsible for worktree workflow behavior

### Requirement: Local hooks
The project SHALL use Lefthook for local Git hooks.

#### Scenario: Pre-commit runs fast checks
- **WHEN** a commit is created
- **THEN** Lefthook runs format check, lint, and the related-test script

#### Scenario: Pre-push runs typecheck
- **WHEN** a push is attempted
- **THEN** Lefthook runs the typecheck script

#### Scenario: Pre-push runs changed-scope Fallow audit
- **WHEN** a push is attempted with relevant JavaScript, TypeScript, or project tooling changes
- **THEN** Lefthook runs the Fallow audit script against the changed scope
- **AND** the full-project Fallow summary remains part of the `check` script

#### Scenario: Commit message is conventional
- **WHEN** a commit message is created
- **THEN** commitlint validates it against Conventional Commits

### Requirement: Deterministic CI
The project SHALL run deterministic Linux CI without live PokeAPI or PokeSprite dependencies.

#### Scenario: CI installs reproducibly
- **WHEN** CI installs dependencies
- **THEN** it uses the committed `bun.lock` with frozen lockfile behavior

#### Scenario: CI validates compiled binary
- **WHEN** CI runs on Linux
- **THEN** it builds and smoke-tests the compiled binary artifact

### Requirement: Release automation
The project SHALL use release-please to create GitHub Releases with Linux compiled binary artifacts.

#### Scenario: Release PR updates release metadata
- **WHEN** Conventional Commit history contains releasable changes
- **THEN** release-please opens or updates a release PR

#### Scenario: GitHub Release includes binary
- **WHEN** release-please creates a GitHub Release
- **THEN** the release workflow attaches the Linux compiled binary artifact

### Requirement: Dependency automation
The project SHALL use grouped Dependabot updates for package and GitHub Actions dependencies.

#### Scenario: Dependabot groups dependency updates
- **WHEN** dependency updates are available
- **THEN** Dependabot opens grouped update PRs according to the repository configuration
