#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const packageByPlatform = new Map([
  ["darwin:arm64", ["@fbb.sh/pkdx-darwin-arm64", "pkdx"]],
  ["darwin:x64", ["@fbb.sh/pkdx-darwin-x64", "pkdx"]],
  ["linux:arm64", ["@fbb.sh/pkdx-linux-arm64", "pkdx"]],
  ["linux:x64", ["@fbb.sh/pkdx-linux-x64", "pkdx"]],
  ["win32:x64", ["@fbb.sh/pkdx-win32-x64", "pkdx.exe"]],
]);

const platformKey = `${process.platform}:${process.arch}`;
const platformPackage = packageByPlatform.get(platformKey);

if (platformPackage === undefined) {
  console.error(`pkdx does not ship a binary for ${platformKey}.`);
  process.exit(1);
}

const [packageName, binaryName] = platformPackage;
let binaryPath;

try {
  const packageJsonPath = require.resolve(`${packageName}/package.json`);
  binaryPath = join(dirname(packageJsonPath), "bin", binaryName);
} catch {
  console.error(
    `pkdx package is missing ${packageName}. Reinstall @fbb.sh/pkdx without omitting optional dependencies.`,
  );
  process.exit(1);
}

const child = spawn(binaryPath, process.argv.slice(2), {
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("error", (error) => {
  console.error(`Failed to start pkdx: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
