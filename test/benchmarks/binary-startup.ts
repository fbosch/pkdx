import { benchmarkResult } from "../support/benchmark";

const iterations = Number(Bun.env.PKDX_BINARY_STARTUP_BENCH_ITERATIONS ?? 25);
const binaryPath = process.platform === "win32" ? "dist/pkdx.exe" : "dist/pkdx";
const binaryExists = await Bun.file(binaryPath).exists();

type BinaryStartupBenchmark = {
  args: readonly string[];
  command?: string;
  expectedStdout: string;
  name: string;
};

const benchmarks = [
  ...(binaryExists
    ? [
        {
          args: ["pikachu"],
          expectedStdout: "Detail\n",
          name: "compiled-smoke-detail",
        },
        {
          args: ["pika"],
          expectedStdout: "Search\n",
          name: "compiled-smoke-search",
        },
      ]
    : []),
  {
    args: ["run", "src/cli.tsx", "pikachu"],
    command: "bun",
    expectedStdout: "Detail\n",
    name: "bun-smoke-detail",
  },
  {
    args: ["run", "src/cli.tsx", "pika"],
    command: "bun",
    expectedStdout: "Search\n",
    name: "bun-smoke-search",
  },
] satisfies readonly BinaryStartupBenchmark[];

const results = benchmarks.map((benchmark) => {
  let checksum = 0;
  const start = Bun.nanoseconds();

  for (let index = 0; index < iterations; index += 1) {
    const child = Bun.spawnSync(
      [benchmark.command ?? binaryPath, ...benchmark.args],
      {
        env: {
          ...Bun.env,
          PKDX_SMOKE_EXIT: "1",
        },
        stderr: "pipe",
        stdout: "pipe",
      },
    );
    const stdout = child.stdout.toString();

    if (child.exitCode !== 0) {
      throw new Error(`${benchmark.name} failed: ${child.stderr.toString()}`);
    }

    if (stdout !== benchmark.expectedStdout) {
      throw new Error(
        `${benchmark.name} printed ${JSON.stringify(stdout)}, expected ${JSON.stringify(benchmark.expectedStdout)}`,
      );
    }

    checksum += child.exitCode + child.stdout.byteLength;
  }

  return benchmarkResult(benchmark.name, iterations, start, checksum);
});

console.table(results);
