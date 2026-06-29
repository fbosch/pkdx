#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const binaryByPlatform = new Map([
  ["darwin:arm64", "pkdx-darwin-arm64"],
  ["darwin:x64", "pkdx-darwin-x64"],
  ["linux:arm64", "pkdx-linux-arm64"],
  ["linux:x64", "pkdx-linux-x64"],
  ["win32:x64", "pkdx-win32-x64.exe"],
]);

const platformKey = `${process.platform}:${process.arch}`;
const binaryName = binaryByPlatform.get(platformKey);

if (binaryName === undefined) {
  console.error(`pkdx does not ship a binary for ${platformKey}.`);
  process.exit(1);
}

const binaryPath = join(packageRoot, "dist", binaryName);

if (!existsSync(binaryPath)) {
  console.error(
    `pkdx package is missing ${binaryName}. Reinstall @fbb.sh/pkdx and try again.`,
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
