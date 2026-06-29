import { mkdir } from "node:fs/promises";

const proc = Bun.spawn(
  [
    "bunx",
    "fallow",
    "health",
    "--coverage-gaps",
    "--format",
    "badge",
    "--quiet",
  ],
  {
    stderr: "pipe",
    stdout: "pipe",
  },
);

const [stdout, stderr, exitCode] = await Promise.all([
  new Response(proc.stdout).text(),
  new Response(proc.stderr).text(),
  proc.exited,
]);

process.stderr.write(stderr);

if (exitCode > 1) {
  process.stdout.write(stdout);
  process.exit(exitCode);
}

if (!stdout.trimStart().startsWith("<svg")) {
  process.stdout.write(stdout);
  process.stderr.write("Could not read Fallow badge SVG from output.\n");
  process.exit(1);
}

await mkdir("docs", { recursive: true });
await Bun.write("docs/fallow.svg", stdout);
process.stdout.write("Wrote docs/fallow.svg.\n");
