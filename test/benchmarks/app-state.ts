import {
  applyAppKey,
  createInitialAppState,
  loadDetailSpecies,
  type DetailState,
  type LoadedDetail,
} from "../../src/app-state";
import {
  buildPokemonDetail,
  buildPokemonForms,
} from "../../src/pokemon-detail";
import { findExactSpecies } from "../../src/search";
import { benchmarkResult } from "../support/benchmark";
import {
  pikachuEvolutionChain,
  pikachuPokemon,
  pikachuSpecies,
} from "../support/pokeapi-fixtures";

const iterations = Number(Bun.env.PKDX_BENCH_ITERATIONS ?? 500_000);
const pikachu = findExactSpecies("pikachu") ?? throwMissingSpecies("pikachu");
const raichu = findExactSpecies("raichu") ?? throwMissingSpecies("raichu");
const pikachuForms = buildPokemonForms(pikachu, pikachuSpecies);
const pikachuDefault =
  pikachuForms.find((form) => form.isDefault) ?? throwMissingForm("pikachu");
const detail = buildPokemonDetail(
  pikachu,
  pikachuSpecies,
  pikachuPokemon,
  pikachuEvolutionChain,
  pikachuForms,
  pikachuDefault,
);
const loadedPikachu = createInitialAppState("pikachu") as DetailState;
const loadedPikachuDetail: LoadedDetail = {
  detail,
  form: detail.form,
  species: pikachu,
};

const benchmarks = [
  {
    name: "search-text-input",
    run: () =>
      applyAppKey(createInitialAppState(), { name: "p", sequence: "p" }),
  },
  {
    name: "search-selection-down",
    run: () =>
      applyAppKey(createInitialAppState("nidoran"), { ctrl: true, name: "j" }),
  },
  {
    name: "detail-toggle-shiny",
    run: () =>
      applyAppKey(
        loadedPikachu,
        { name: "s" },
        { detail: loadedPikachuDetail },
      ),
  },
  {
    name: "detail-cycle-description",
    run: () =>
      applyAppKey(
        loadedPikachu,
        { name: "d" },
        { detail: loadedPikachuDetail },
      ),
  },
  {
    name: "detail-load-species-transition",
    run: () => loadDetailSpecies(loadedPikachu, raichu, loadedPikachuDetail),
  },
] as const;

for (const benchmark of benchmarks) {
  for (let index = 0; index < 1_000; index += 1) {
    benchmark.run();
  }
}

const results = benchmarks.map((benchmark) => {
  let checksum = 0;
  const start = Bun.nanoseconds();

  for (let index = 0; index < iterations; index += 1) {
    const state = benchmark.run();
    checksum +=
      state.screen === "detail" ? state.retryToken : state.query.length;
  }

  return benchmarkResult(benchmark.name, iterations, start, checksum);
});

console.table(results);

function throwMissingSpecies(slug: string): never {
  throw new Error(`Missing benchmark species: ${slug}`);
}

function throwMissingForm(name: string): never {
  throw new Error(`Missing benchmark form: ${name}`);
}
