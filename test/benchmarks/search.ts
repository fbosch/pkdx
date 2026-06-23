import { findExactSpecies, searchSpecies } from "../../src/search";

const iterations = Number(Bun.env.PKDX_SEARCH_BENCH_ITERATIONS ?? 100);

const fuzzyBenchmarks = [
  { name: "name-pikachu", query: "pikachu" },
  { name: "alias-pika", query: "pika" },
  { name: "dex-001", query: "001" },
  { name: "symbol-nidoran", query: "nidoran female" },
  { name: "punctuation-mr-mime", query: "mr mime" },
  { name: "late-dex-pecharunt", query: "pecharunt" },
] as const;

const exactBenchmarks = [
  { name: "exact-name", query: "pikachu" },
  { name: "exact-dex", query: "1025" },
  { name: "exact-miss", query: "pika" },
] as const;

for (const benchmark of fuzzyBenchmarks) {
  for (let index = 0; index < 10; index += 1) {
    searchSpecies(benchmark.query);
  }
}

for (const benchmark of exactBenchmarks) {
  for (let index = 0; index < 100; index += 1) {
    findExactSpecies(benchmark.query);
  }
}

const fuzzyResults = fuzzyBenchmarks.map((benchmark) => {
  let checksum = 0;
  const start = Bun.nanoseconds();

  for (let index = 0; index < iterations; index += 1) {
    checksum += searchSpecies(benchmark.query).length;
  }

  return benchmarkResult(benchmark.name, iterations, start, checksum);
});

const exactResults = exactBenchmarks.map((benchmark) => {
  let checksum = 0;
  const start = Bun.nanoseconds();

  for (let index = 0; index < iterations; index += 1) {
    checksum += findExactSpecies(benchmark.query)?.dexNumber ?? 0;
  }

  return benchmarkResult(benchmark.name, iterations, start, checksum);
});

console.table([...fuzzyResults, ...exactResults]);

function benchmarkResult(
  name: string,
  iterations: number,
  startNanoseconds: number,
  checksum: number,
) {
  const durationNanoseconds = Bun.nanoseconds() - startNanoseconds;
  const durationMs = durationNanoseconds / 1_000_000;

  return {
    checksum,
    durationMs: Number(durationMs.toFixed(2)),
    iterations,
    name,
    opsPerSecond: Math.round(iterations / (durationMs / 1000)),
  };
}
