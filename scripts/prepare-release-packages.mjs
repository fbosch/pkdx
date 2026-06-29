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

rmSync("dist/npm", { force: true, recursive: true });

const wrapperRoot = join("dist", "npm", "root");
mkdirSync(join(wrapperRoot, "bin"), { recursive: true });
cpSync("bin/pkdx.mjs", join(wrapperRoot, "bin", "pkdx.mjs"));
cpSync("README.md", join(wrapperRoot, "README.md"));
cpSync("LICENSE", join(wrapperRoot, "LICENSE"));

const wrapperPackageJson = {
  name: rootPackage.name,
  version: rootPackage.version,
  description: rootPackage.description,
  license: rootPackage.license,
  keywords: rootPackage.keywords,
  type: rootPackage.type,
  repository: rootPackage.repository,
  files: rootPackage.files,
  engines: rootPackage.engines,
  bin: rootPackage.bin,
  publishConfig: rootPackage.publishConfig,
  optionalDependencies,
};

writeFileSync(
  join(wrapperRoot, "package.json"),
  `${JSON.stringify(wrapperPackageJson, null, 2)}\n`,
);

for (const platformPackage of platformPackages) {
  const packageRoot = join(
    "dist",
    "npm",
    "platform",
    platformPackage.packageName.replace("@", "").replace("/", "__"),
  );
  const binDir = join(packageRoot, "bin");
  const binaryPath = join(binDir, platformPackage.binary);

  mkdirSync(binDir, { recursive: true });
  cpSync(join("dist", platformPackage.artifact), binaryPath);
  cpSync("LICENSE", join(packageRoot, "LICENSE"));
  chmodSync(binaryPath, 0o755);

  const packageJson = {
    name: platformPackage.packageName,
    version: rootPackage.version,
    description: `Native ${basename(platformPackage.artifact)} binary for pkdx.`,
    license: rootPackage.license,
    repository: rootPackage.repository,
    os: platformPackage.os,
    cpu: platformPackage.cpu,
    files: ["bin", "LICENSE", "README.md"],
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
    `# ${platformPackage.packageName}\n\nThis package contains the native ${basename(platformPackage.artifact)} binary used by [@fbb.sh/pkdx](https://www.npmjs.com/package/@fbb.sh/pkdx).\n\nIt is installed automatically as an optional dependency of the main \`@fbb.sh/pkdx\` package on supported ${platformPackage.os.join("/")} ${platformPackage.cpu.join("/")} systems. You normally should not install this package directly.\n\nSource code, release automation, and build instructions are available at https://github.com/fbosch/pkdx.\n\n## License\n\nMIT. See [LICENSE](LICENSE).\n`,
  );
}

console.log(
  `Prepared wrapper package and ${platformPackages.length} platform packages for @fbb.sh/pkdx@${rootPackage.version}.`,
);
