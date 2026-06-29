#!/usr/bin/env node
import {
  chmodSync,
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

const rootPackage = JSON.parse(readFileSync("package.json", "utf8"));

const platformPackages = [
  {
    artifact: "pkdx-darwin-arm64",
    packageName: "@fbb.sh/pkdx-darwin-arm64",
    os: ["darwin"],
    cpu: ["arm64"],
    binary: "pkdx",
  },
  {
    artifact: "pkdx-darwin-x64",
    packageName: "@fbb.sh/pkdx-darwin-x64",
    os: ["darwin"],
    cpu: ["x64"],
    binary: "pkdx",
  },
  {
    artifact: "pkdx-linux-arm64",
    packageName: "@fbb.sh/pkdx-linux-arm64",
    os: ["linux"],
    cpu: ["arm64"],
    libc: ["glibc"],
    binary: "pkdx",
  },
  {
    artifact: "pkdx-linux-x64",
    packageName: "@fbb.sh/pkdx-linux-x64",
    os: ["linux"],
    cpu: ["x64"],
    libc: ["glibc"],
    binary: "pkdx",
  },
  {
    artifact: "pkdx-win32-x64.exe",
    packageName: "@fbb.sh/pkdx-win32-x64",
    os: ["win32"],
    cpu: ["x64"],
    binary: "pkdx.exe",
  },
];

const optionalDependencies = Object.fromEntries(
  platformPackages.map(({ packageName }) => [packageName, rootPackage.version]),
);

rootPackage.optionalDependencies = optionalDependencies;
writeFileSync("package.json", `${JSON.stringify(rootPackage, null, 2)}\n`);

rmSync("dist/npm", { force: true, recursive: true });

for (const platformPackage of platformPackages) {
  const packageRoot = join(
    "dist",
    "npm",
    platformPackage.packageName.replace("@", "").replace("/", "__"),
  );
  const binDir = join(packageRoot, "bin");
  const binaryPath = join(binDir, platformPackage.binary);

  mkdirSync(binDir, { recursive: true });
  cpSync(join("dist", platformPackage.artifact), binaryPath);
  chmodSync(binaryPath, 0o755);

  const packageJson = {
    name: platformPackage.packageName,
    version: rootPackage.version,
    license: rootPackage.license,
    repository: rootPackage.repository,
    os: platformPackage.os,
    cpu: platformPackage.cpu,
    files: ["bin"],
    publishConfig: rootPackage.publishConfig,
  };

  if (platformPackage.libc !== undefined) {
    packageJson.libc = platformPackage.libc;
  }

  writeFileSync(
    join(packageRoot, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
  writeFileSync(
    join(packageRoot, "README.md"),
    `# ${platformPackage.packageName}\n\nNative ${basename(platformPackage.artifact)} binary for @fbb.sh/pkdx.\n`,
  );
}

console.log(
  `Prepared ${platformPackages.length} platform packages for @fbb.sh/pkdx@${rootPackage.version}.`,
);
