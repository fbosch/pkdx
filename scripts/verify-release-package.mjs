#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const expectedBinaries = [
  "pkdx-darwin-arm64",
  "pkdx-darwin-x64",
  "pkdx-linux-arm64",
  "pkdx-linux-x64",
  "pkdx-win32-x64.exe",
];

const requiredPackageFiles = [
  "bin/pkdx.mjs",
  ...expectedBinaries.map((binary) => `dist/${binary}`),
];

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

const distEntries = readdirSync("dist")
  .filter((entry) => entry.startsWith("pkdx-"))
  .sort();

assertSameSet(distEntries, expectedBinaries, "Release binaries");

for (const binary of expectedBinaries) {
  const mode = statSync(join("dist", binary)).mode;
  if ((mode & 0o111) === 0) {
    fail(`Release binary is not executable: dist/${binary}`);
  }
}

const launcherMode = statSync("bin/pkdx.mjs").mode;
if ((launcherMode & 0o111) === 0) {
  fail("Launcher is not executable: bin/pkdx.mjs");
}

const pack = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8",
});

if (pack.status !== 0) {
  process.stderr.write(pack.stderr);
  fail("npm pack --dry-run failed.");
}

const parsedPack = JSON.parse(pack.stdout);
const packageFiles = parsedPack[0].files.map((file) => file.path).sort();

for (const file of requiredPackageFiles) {
  if (!packageFiles.includes(file)) {
    fail(`npm package is missing ${file}.`);
  }
}

const packedDistFiles = packageFiles.filter((file) => file.startsWith("dist/"));
assertSameSet(
  packedDistFiles,
  expectedBinaries.map((binary) => `dist/${binary}`),
  "Packed dist files",
);

console.log("Release package contents verified.");
