#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const expectedPackages = [
  ["@fbb.sh/pkdx-darwin-arm64", "pkdx-darwin-arm64", "pkdx"],
  ["@fbb.sh/pkdx-darwin-x64", "pkdx-darwin-x64", "pkdx"],
  ["@fbb.sh/pkdx-linux-arm64", "pkdx-linux-arm64", "pkdx"],
  ["@fbb.sh/pkdx-linux-x64", "pkdx-linux-x64", "pkdx"],
  ["@fbb.sh/pkdx-win32-x64", "pkdx-win32-x64.exe", "pkdx.exe"],
];

const rootPackage = JSON.parse(readFileSync("package.json", "utf8"));
const expectedPackageNames = expectedPackages
  .map(([packageName]) => packageName)
  .sort();

function fail(message) {
  console.error(message);
  process.exit(1);
}

function difference(left, right) {
  return left.filter((entry) => !right.includes(entry));
}

function assertNoEntries(entries, message) {
  if (entries.length > 0) fail(`${message}: ${entries.join(", ")}.`);
}

function assertSameSet(actual, expected, label) {
  assertNoEntries(difference(expected, actual), `${label} missing entries`);
  assertNoEntries(difference(actual, expected), `${label} extra entries`);
}

function packageDirectory(packageName) {
  return join(
    "dist",
    "npm",
    "platform",
    packageName.replace("@", "").replace("/", "__"),
  );
}

function npmPackFiles(cwd) {
  const pack = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd,
    encoding: "utf8",
  });

  if (pack.status !== 0) {
    process.stderr.write(pack.stderr);
    fail(`npm pack --dry-run failed in ${cwd}.`);
  }

  return JSON.parse(pack.stdout)[0]
    .files.map((file) => file.path)
    .sort();
}

const distEntries = readdirSync("dist")
  .filter((entry) => entry.startsWith("pkdx-"))
  .sort();
const expectedArtifacts = expectedPackages
  .map(([, artifact]) => artifact)
  .sort();

assertSameSet(distEntries, expectedArtifacts, "Release binaries");

for (const [, artifact] of expectedPackages) {
  const mode = statSync(join("dist", artifact)).mode;
  if ((mode & 0o111) === 0) {
    fail(`Release binary is not executable: dist/${artifact}`);
  }
}

const launcherMode = statSync("bin/pkdx.mjs").mode;
if ((launcherMode & 0o111) === 0) {
  fail("Launcher is not executable: bin/pkdx.mjs");
}

const wrapperRoot = join("dist", "npm", "root");

if (!existsSync(wrapperRoot)) {
  fail(`Wrapper package directory is missing: ${wrapperRoot}.`);
}

const wrapperPackage = JSON.parse(
  readFileSync(join(wrapperRoot, "package.json"), "utf8"),
);

if (wrapperPackage.name !== rootPackage.name)
  fail("Wrapper package has wrong name.");
if (wrapperPackage.version !== rootPackage.version)
  fail("Wrapper package has wrong version.");

assertSameSet(
  Object.keys(wrapperPackage.optionalDependencies ?? {}).sort(),
  expectedPackageNames,
  "Optional dependency names",
);

for (const packageName of expectedPackageNames) {
  const version = wrapperPackage.optionalDependencies[packageName];
  if (version !== wrapperPackage.version) {
    fail(
      `${packageName} version ${version} does not match ${wrapperPackage.version}.`,
    );
  }
}

const rootPackageFiles = npmPackFiles(wrapperRoot);

assertNoEntries(
  rootPackageFiles.filter((file) => file.startsWith("dist/")),
  "Wrapper package includes dist files",
);

assertNoEntries(
  rootPackageFiles.filter((file) => file.startsWith("scripts/")),
  "Wrapper package includes scripts",
);

if (!rootPackageFiles.includes("package.json")) {
  fail("Wrapper package is missing package.json.");
}

if ("scripts" in wrapperPackage) fail("Wrapper package includes scripts.");
if ("devDependencies" in wrapperPackage)
  fail("Wrapper package includes devDependencies.");
if ("trustedDependencies" in wrapperPackage)
  fail("Wrapper package includes trustedDependencies.");
if ("imports" in wrapperPackage) fail("Wrapper package includes imports.");

if (!rootPackageFiles.includes("bin/pkdx.mjs")) {
  fail("Wrapper package is missing bin/pkdx.mjs.");
}

for (const [packageName, , binary] of expectedPackages) {
  const packageRoot = packageDirectory(packageName);

  if (!existsSync(packageRoot)) {
    fail(`Platform package directory is missing: ${packageRoot}.`);
  }

  const packageJson = JSON.parse(
    readFileSync(join(packageRoot, "package.json"), "utf8"),
  );
  if (packageJson.name !== packageName)
    fail(`Unexpected package name in ${packageRoot}.`);
  if (packageJson.version !== rootPackage.version)
    fail(`${packageName} has wrong version.`);

  const binaryPath = join(packageRoot, "bin", binary);
  const mode = statSync(binaryPath).mode;
  if ((mode & 0o111) === 0) fail(`${packageName} binary is not executable.`);

  assertSameSet(
    npmPackFiles(packageRoot),
    ["LICENSE", "README.md", `bin/${binary}`, "package.json"],
    packageName,
  );
}

console.log("Release package contents verified.");
