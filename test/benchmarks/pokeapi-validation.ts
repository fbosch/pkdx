import {
  evolutionChainResourceSchema,
  pokemonResourceSchema,
  pokemonSpeciesResourceSchema,
} from "../../src/pokeapi/schema";
import { pikachuPokemon, pikachuSpecies } from "../support/pokeapi-fixtures";

const iterations = Number(Bun.env.POKEDEX_BENCH_ITERATIONS ?? 100_000);

const pikachuEvolutionChain = {
  id: 10,
  chain: {
    evolves_to: [
      {
        evolves_to: [],
        species: {
          name: "raichu",
          url: "https://pokeapi.co/api/v2/pokemon-species/26/",
        },
      },
    ],
    species: {
      name: "pikachu",
      url: "https://pokeapi.co/api/v2/pokemon-species/25/",
    },
  },
};

const benchmarks = [
  {
    name: "pokemon",
    parse: () => pokemonResourceSchema.parse(pikachuPokemon).stats.length,
  },
  {
    name: "species",
    parse: () =>
      pokemonSpeciesResourceSchema.parse(pikachuSpecies).varieties.length,
  },
  {
    name: "evolutionChain",
    parse: () =>
      evolutionChainResourceSchema.parse(pikachuEvolutionChain).chain.evolves_to
        .length,
  },
] as const;

for (const benchmark of benchmarks) {
  for (let index = 0; index < 1_000; index += 1) {
    benchmark.parse();
  }
}

const results = benchmarks.map((benchmark) => {
  let checksum = 0;
  const start = Bun.nanoseconds();

  for (let index = 0; index < iterations; index += 1) {
    checksum += benchmark.parse();
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
