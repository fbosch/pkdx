export {};

const binaryPath = process.platform === "win32" ? "dist/pkdx.exe" : "dist/pkdx";

const proc = Bun.spawn([binaryPath, "pikachu"], {
  env: {
    ...Bun.env,
    PKDX_SMOKE_EXIT: "1",
  },
  stderr: "inherit",
  stdout: "inherit",
});

const exitCode = await proc.exited;

if (exitCode !== 0) {
  process.exit(exitCode);
}
