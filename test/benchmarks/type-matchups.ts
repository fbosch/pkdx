import { calculateDamageTaken } from "../../src/type-matchups";

const iterations = Number(Bun.env.POKEDEX_BENCH_ITERATIONS ?? 1_000_000);

const benchmarks = [
  {
    name: "single-electric",
    types: ["Electric"],
  },
  {
    name: "dual-water-flying",
    types: ["Water", "Flying"],
  },
  {
    name: "dual-fire-flying",
    types: ["Fire", "Flying"],
  },
  {
    name: "dual-ghost-steel",
    types: ["Ghost", "Steel"],
  },
] as const;

for (const benchmark of benchmarks) {
  for (let index = 0; index < 10_000; index += 1) {
    calculateDamageTaken(benchmark.types);
  }
}

const results = benchmarks.map((benchmark) => {
  let checksum = 0;
  const start = Bun.nanoseconds();

  for (let index = 0; index < iterations; index += 1) {
    const damageTaken = calculateDamageTaken(benchmark.types);
    checksum += damageTaken.weaknesses.length + damageTaken.resistances.length;
  }

  const durationNanoseconds = Bun.nanoseconds() - start;
  const durationMs = durationNanoseconds / 1_000_000;

  return {
    checksum,
    durationMs: Number(durationMs.toFixed(2)),
    iterations,
    name: benchmark.name,
    opsPerSecond: Math.round(iterations / (durationMs / 1000)),
  };
});

console.table(results);
