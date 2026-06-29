import { isAbsolute, relative } from "node:path";

const stagedPaths = Bun.argv
  .slice(2)
  .map((path) => (isAbsolute(path) ? relative(process.cwd(), path) : path));

if (stagedPaths.length === 0) {
  process.exit(0);
}

const shouldUpdateCoverageBadge = stagedPaths.some((path) =>
  matchesAny(path, [
    "bunfig.coverage.toml",
    "package.json",
    "scripts/generate-coverage-badge.ts",
    "src/",
    "test/",
  ]),
);
const shouldUpdateFallowBadge = stagedPaths.some((path) =>
  matchesAny(path, [
    ".fallowrc.json",
    ".fallowrc.jsonc",
    "fallow.toml",
    ".fallow.toml",
    "package.json",
    "scripts/generate-fallow-badge.ts",
    "src/",
    "test/",
  ]),
);

if (shouldUpdateCoverageBadge) {
  await run(["bun", "run", "coverage:badge"]);
}

if (shouldUpdateFallowBadge) {
  await run(["bun", "run", "fallow:badge"]);
}

if (shouldUpdateCoverageBadge || shouldUpdateFallowBadge) {
  await run(["git", "add", "docs/coverage.svg", "docs/fallow.svg"]);
}

function matchesAny(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) =>
    pattern.endsWith("/") ? path.startsWith(pattern) : path === pattern,
  );
}

async function run(command: readonly string[]): Promise<void> {
  const proc = Bun.spawn([...command], {
    stderr: "inherit",
    stdout: "inherit",
  });
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
