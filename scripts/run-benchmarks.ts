import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";

const benchmarkDirectory = join(import.meta.dir, "..", "test", "benchmarks");
const benchmarkFiles = (await readdir(benchmarkDirectory))
  .filter((file) => file.endsWith(".ts"))
  .toSorted();

for (const file of benchmarkFiles) {
  const benchmarkPath = join(benchmarkDirectory, file);
  console.log(`\n${basename(file, ".ts")}`);

  const child = Bun.spawn(["bun", "run", benchmarkPath], {
    env: Bun.env,
    stderr: "inherit",
    stdout: "inherit",
  });

  const exitCode = await child.exited;

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
