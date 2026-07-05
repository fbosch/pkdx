import { expect, spyOn, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyAppKey,
  createInitialAppState,
  detailAbilitiesLoaded,
  loadDetailSpecies,
  pokemonFormsMatch,
  type DetailState,
  type LoadedDetail,
} from "../src/app-state";
import {
  appVersion,
  appExitSignals,
  getInitialSearchQuery,
  main,
  parseCliOptions,
  searchScreenTitle,
} from "../src/cli";
import type { PokemonDetail, PokemonForm } from "../src/pokemon-detail";
import {
  createFileStorage,
  createQueryPersister,
  createSqliteQueryStorage,
  persistedQueryMaxAge,
  queryCacheBuster,
  queryCachePolicies,
  queryCacheDatabasePath,
  queryPersisterPrefix,
  queryPersisterStorageKey,
  runtimeQueryCachePolicies,
  shardForDexNumber,
} from "../src/query-cache";
import { findExactSpecies } from "../src/search";
import { pikachuPokemonEvolutionChain } from "./support/pokeapi-fixtures";

const pikachuDetail: PokemonDetail = {
  abilities: [
    {
      isHidden: false,
      name: "Static",
      url: "https://pokeapi.co/api/v2/ability/9/",
    },
  ],
  damageTaken: {
    resistances: [
      { multiplier: 0.5, type: "Electric" },
      { multiplier: 0.5, type: "Flying" },
      { multiplier: 0.5, type: "Steel" },
    ],
    weaknesses: [{ multiplier: 2, type: "Ground" }],
  },
  dexNumber: 25,
  eggGroups: ["Field", "Fairy"],
  captureRate: 190,
  evYield: [{ effort: 2, name: "Spe" }],
  evolutionChain: pikachuPokemonEvolutionChain,
  flavorText: "Mouse Pokemon.",
  flavorTexts: [
    { source: "Red", text: "Mouse Pokemon." },
    { source: "Yellow", text: "It keeps its tail raised." },
  ],
  form: {
    displayName: "Pikachu (Default)",
    isDefault: true,
    pokemonName: "pikachu",
    pokemonUrl: "https://pokeapi.co/api/v2/pokemon/25/",
    spriteFormKey: "$",
  },
  forms: [
    {
      displayName: "Pikachu (Default)",
      isDefault: true,
      pokemonName: "pikachu",
      pokemonUrl: "https://pokeapi.co/api/v2/pokemon/25/",
      spriteFormKey: "$",
    },
    {
      displayName: "Pikachu Rock Star",
      isDefault: false,
      pokemonName: "pikachu-rock-star",
      pokemonUrl: "https://pokeapi.co/api/v2/pokemon/pikachu-rock-star/",
      spriteFormKey: "rock-star",
    },
  ],
  genderRatio: { femalePercent: 50, kind: "gendered", malePercent: 50 },
  generation: "Generation I (Kanto)",
  growthRate: "Medium",
  heightMeters: 0.4,
  name: "Pikachu",
  species: "Mouse Pokemon",
  sprite: { kind: "placeholder", label: "pikachu sprite pending" },
  stats: [{ base: 35, name: "HP" }],
  types: ["Electric"],
  weightKilograms: 6,
};

test("launches into the Search state without arguments", () => {
  expect(createInitialAppState()).toEqual({
    screen: "search",
    query: "",
    selectedIndex: 0,
    shouldExit: false,
  });
  expect(searchScreenTitle).toBe("Search");
});

test("uses launch arguments as the initial Search query", () => {
  expect(getInitialSearchQuery(["mr", "mime"])).toBe("mr mime");
});

test("parses debug flag without treating it as Search input", () => {
  expect(parseCliOptions(["--debug", "mr", "mime"])).toEqual({
    debug: true,
    imageMode: "builtin",
    initialQuery: "mr mime",
    showVersion: false,
  });
  expect(parseCliOptions(["pikachu"])).toEqual({
    debug: false,
    imageMode: "builtin",
    initialQuery: "pikachu",
    showVersion: false,
  });
});

test("parses image mode flag without treating it as Search input", () => {
  expect(parseCliOptions(["--debug", "--images=ascii", "clefable"])).toEqual({
    debug: true,
    imageMode: "ascii",
    initialQuery: "clefable",
    showVersion: false,
  });
  expect(parseCliOptions(["--images=builtin", "clefable"])).toEqual({
    debug: false,
    imageMode: "builtin",
    initialQuery: "clefable",
    showVersion: false,
  });
});

test("parses version flag without treating it as Search input", () => {
  expect(parseCliOptions(["--version", "pikachu"])).toEqual({
    debug: false,
    imageMode: "builtin",
    initialQuery: "pikachu",
    showVersion: true,
  });
});

test("lets app state own Ctrl-C instead of OpenTUI signal cleanup", () => {
  expect(appExitSignals).not.toContain("SIGINT");
});

test("main smoke mode prints the launch screen", async () => {
  const originalSmokeExit = Bun.env.PKDX_SMOKE_EXIT;
  const writes: string[] = [];
  const write = spyOn(process.stdout, "write").mockImplementation((chunk) => {
    writes.push(chunk.toString());
    return true;
  });

  try {
    Bun.env.PKDX_SMOKE_EXIT = "1";

    await main(["pikachu"]);
    await main(["pika"]);

    expect(writes).toEqual(["Detail\n", "Search\n"]);
  } finally {
    write.mockRestore();
    if (originalSmokeExit === undefined) {
      delete Bun.env.PKDX_SMOKE_EXIT;
    } else {
      Bun.env.PKDX_SMOKE_EXIT = originalSmokeExit;
    }
  }
});

test("main prints version and exits before launching", async () => {
  const originalSmokeExit = Bun.env.PKDX_SMOKE_EXIT;
  const writes: string[] = [];
  const write = spyOn(process.stdout, "write").mockImplementation((chunk) => {
    writes.push(chunk.toString());
    return true;
  });

  try {
    Bun.env.PKDX_SMOKE_EXIT = "1";

    await main(["--version"]);

    expect(writes).toEqual([`pkdx ${appVersion}\n`]);
  } finally {
    write.mockRestore();
    if (originalSmokeExit === undefined) {
      delete Bun.env.PKDX_SMOKE_EXIT;
    } else {
      Bun.env.PKDX_SMOKE_EXIT = originalSmokeExit;
    }
  }
});

test("exact launch arguments open Detail", () => {
  expect(createInitialAppState("pikachu")).toMatchObject({
    screen: "detail",
    species: {
      slug: "pikachu",
    },
  });
});

test("ambiguous launch arguments open prefilled Search", () => {
  expect(createInitialAppState("pika")).toEqual({
    screen: "search",
    query: "pika",
    selectedIndex: 0,
    shouldExit: false,
  });
});

test("Search selection moves with Ctrl-J and Ctrl-K", () => {
  const selected = applyAppKey(createInitialAppState("nidoran"), {
    name: "j",
    ctrl: true,
  });
  const reset = applyAppKey(selected, { name: "k", ctrl: true });

  expect(selected).toMatchObject({
    screen: "search",
    selectedIndex: 1,
  });
  expect(reset).toMatchObject({
    screen: "search",
    query: "nidoran",
    selectedIndex: 0,
  });
});

test("Search maps terminal Ctrl-J and Ctrl-K events to arrow movement", () => {
  expectSearchMovementForKeys(
    {
      ctrl: true,
      name: "j",
    },
    {
      ctrl: true,
      name: "k",
    },
  );
});

test("Search maps Ctrl-Enter and Ctrl-Return events to arrow movement", () => {
  expectSearchMovementForKeys(
    {
      ctrl: true,
      name: "return",
    },
    {
      ctrl: true,
      name: "k",
    },
  );
  expectSearchMovementForKeys(
    {
      ctrl: true,
      name: "enter",
    },
    {
      ctrl: true,
      name: "k",
    },
  );
});

test("Search maps return line-feed Ctrl-J to arrow movement", () => {
  expectSearchMovementForKeys(
    {
      name: "return",
      sequence: "\n",
    },
    {
      name: "k",
      sequence: "\v",
    },
  );
});

test("Search maps raw Ctrl-J and Ctrl-K sequences to arrow movement", () => {
  expectSearchMovementForKeys(
    {
      name: "j",
      sequence: "\n",
    },
    {
      name: "k",
      sequence: "\v",
    },
  );
});

test("Search maps unnamed Ctrl-J and Ctrl-K sequences to arrow movement", () => {
  expectSearchMovementForKeys(
    {
      name: "",
      sequence: "\n",
    },
    {
      name: "",
      sequence: "\v",
    },
  );
});

function expectSearchMovementForKeys(
  downKey: Parameters<typeof applyAppKey>[1],
  upKey: Parameters<typeof applyAppKey>[1],
) {
  const selected = applyAppKey(createInitialAppState("nidoran"), downKey);
  const reset = applyAppKey(selected, upKey);

  expect(selected).toMatchObject({
    screen: "search",
    query: "nidoran",
    selectedIndex: 1,
  });
  expect(reset).toMatchObject({
    screen: "search",
    query: "nidoran",
    selectedIndex: 0,
  });
}

test("Search ignores raw control characters as text input", () => {
  const state = createInitialAppState("pika");
  const next = applyAppKey(state, { name: "x", sequence: "\n" });

  expect(next).toEqual(state);
});

test("Search selection moves for short query input", () => {
  const selected = applyAppKey(createInitialAppState("pi"), {
    ctrl: true,
    name: "j",
  });

  expect(selected).toMatchObject({
    screen: "search",
    query: "pi",
    selectedIndex: 1,
  });
});

test("shifted Vim keys remain Search input", () => {
  const next = applyAppKey(createInitialAppState(), {
    name: "j",
    sequence: "J",
    shift: true,
  });

  expect(next).toMatchObject({
    screen: "search",
    query: "J",
    selectedIndex: 0,
  });
});

test("Ctrl-U clears Search input", () => {
  const next = applyAppKey(createInitialAppState("pika"), {
    name: "u",
    ctrl: true,
  });

  expect(next).toEqual({
    screen: "search",
    query: "",
    selectedIndex: 0,
    shouldExit: false,
  });
});

test("lowercase Vim keys remain Search input", () => {
  const next = applyAppKey(createInitialAppState(), {
    name: "j",
    sequence: "j",
  });

  expect(next).toMatchObject({
    screen: "search",
    query: "j",
    selectedIndex: 0,
  });
});

test("s remains Search text input", () => {
  const next = applyAppKey(createInitialAppState(), {
    name: "s",
    sequence: "s",
  });

  expect(next).toMatchObject({
    screen: "search",
    query: "s",
    selectedIndex: 0,
  });
});

test("q remains Search text input", () => {
  const next = applyAppKey(createInitialAppState(), {
    name: "q",
    sequence: "q",
  });

  expect(next).toMatchObject({
    screen: "search",
    query: "q",
    selectedIndex: 0,
    shouldExit: false,
  });
});

test.each([
  { name: "c", ctrl: true },
  { name: "escape" },
])("exits cleanly on $name", (key) => {
  const next = applyAppKey(createInitialAppState(), key);

  expect(next.shouldExit).toBe(true);
});

test("Detail exits cleanly on q", () => {
  const next = applyAppKey(loadedPikachuDetailState(), { name: "q" });

  expect(next.shouldExit).toBe(true);
});

test("ignores non-exit keys in the Search state", () => {
  const state = createInitialAppState("pika");

  expect(applyAppKey(state, { name: "tab" })).toBe(state);
});

test("Search opens Detail on Enter", () => {
  const next = applyAppKey(createInitialAppState("pika"), { name: "enter" });

  expect(next).toMatchObject({
    screen: "detail",
    previousSelectedIndex: 0,
    species: {
      slug: "pikachu",
    },
  });
});

test("Search stores previous selection while opening Detail", () => {
  const selected = applyAppKey(createInitialAppState("nidoran"), {
    name: "j",
    ctrl: true,
  });
  const detail = applyAppKey(selected, { name: "enter" });

  expect(detail).toMatchObject({
    screen: "detail",
    previousQuery: "nidoran",
    previousSelectedIndex: 1,
  });
});

test("Detail starts in loading state before data is ready", () => {
  expect(createInitialAppState("pikachu")).toMatchObject({
    screen: "detail",
    retryToken: 0,
    shiny: false,
  });
});

test("Detail toggles shiny Sprite presentation without changing identity", () => {
  const state = loadedPikachuDetailState();
  const shiny = applyLoadedDetailKey(state, { name: "s" });
  const regular = applyLoadedDetailKey(shiny as DetailState, { name: "s" });

  expect(shiny).toMatchObject({
    screen: "detail",
    shiny: true,
    species: { slug: "pikachu" },
  });
  expect(regular).toMatchObject({
    screen: "detail",
    shiny: false,
    species: { slug: "pikachu" },
  });
});

test("Detail cycles descriptions with d and Shift-D", () => {
  const state = loadedPikachuDetailState();
  const next = applyLoadedDetailKey(state, { name: "d" });
  const previous = applyLoadedDetailKey(next as DetailState, {
    name: "d",
    shift: true,
  });

  expect(next).toMatchObject({
    screen: "detail",
    descriptionIndex: 1,
    species: { slug: "pikachu" },
  });
  expect(previous).toMatchObject({
    screen: "detail",
    descriptionIndex: 0,
    species: { slug: "pikachu" },
  });
});

test("Detail navigates previous and next species in National Dex order", () => {
  const state = loadedPikachuDetailState();
  const previous = applyLoadedDetailKey(state, { name: "h" });
  const next = applyLoadedDetailKey(previous as DetailState, { name: "right" });

  expect(previous).toMatchObject({
    screen: "detail",
    descriptionIndex: 0,
    form: undefined,
    species: { dexNumber: 24, slug: "arbok" },
  });
  expect(next).toMatchObject({
    screen: "detail",
    species: { dexNumber: 25, slug: "pikachu" },
  });
});

test("Detail National Dex navigation stops at boundaries", () => {
  const state = createInitialAppState("bulbasaur");

  expect(applyAppKey(state, { name: "left" })).toBe(state);
});

test("Detail retry increments the retry signal", () => {
  const state = createInitialAppState("pikachu") as DetailState;
  const retrying = applyAppKey(state, { name: "r" }, { detailStatus: "error" });

  expect(retrying).toMatchObject({
    retryToken: 1,
  });
});

test("Detail opens and closes ability viewer with a", () => {
  const state = loadedPikachuDetailState();
  const loading = applyLoadedDetailKey(state, { name: "a" });
  const opened = detailAbilitiesLoaded(loading as DetailState);
  const closed = applyLoadedDetailKey(opened, { name: "a" });

  expect(loading).toMatchObject({
    screen: "detail",
    detailOverlay: "abilities-loading",
  });
  expect(opened).toMatchObject({
    screen: "detail",
    detailOverlay: "abilities",
  });
  expect(closed).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    shouldExit: false,
  });
});

test("Detail ability viewer closes with Escape instead of exiting", () => {
  const state = loadedPikachuDetailState();
  const loading = applyLoadedDetailKey(state, { name: "a" });
  const opened = detailAbilitiesLoaded(loading as DetailState);
  const closed = applyLoadedDetailKey(opened, { name: "escape" });

  expect(closed).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    shouldExit: false,
  });
});

test("Detail opens and closes evolution viewer with e", () => {
  const state = loadedPikachuDetailState();
  const opened = applyLoadedDetailKey(state, { name: "e" });
  const closed = applyLoadedDetailKey(opened as DetailState, { name: "e" });

  expect(opened).toMatchObject({
    screen: "detail",
    detailOverlay: "evolutions",
  });
  expect(closed).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    shouldExit: false,
  });
});

test("Detail does not open evolution viewer without an evolution chain", () => {
  const state = createInitialAppState("pikachu") as DetailState;
  const detail = loadedDetail(
    findExactSpecies("pikachu") ?? throwMissingSpecies("pikachu"),
    {
      ...pikachuDetail,
      evolutionChain: {
        root: {
          evolvesTo: [],
          method: undefined,
          name: "Pikachu",
        },
      },
    },
  );

  expect(applyAppKey(state, { name: "e" }, { detail })).toBe(state);
});

test("Detail evolution viewer closes with Escape instead of exiting", () => {
  const state = loadedPikachuDetailState();
  const opened = applyLoadedDetailKey(state, { name: "e" });
  const closed = applyLoadedDetailKey(opened as DetailState, {
    name: "escape",
  });

  expect(closed).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    shouldExit: false,
  });
});

test("Detail evolution selection loads the selected species", () => {
  const state = loadedPikachuDetailState();
  const opened = applyLoadedDetailKey(state, { name: "e" });
  const raichu = findExactSpecies("Raichu") ?? throwMissingSpecies("raichu");
  const selected = loadDetailSpecies(
    opened as DetailState,
    raichu,
    loadedDetail(
      findExactSpecies("pikachu") ?? throwMissingSpecies("pikachu"),
      pikachuDetail,
    ),
  );

  expect(selected).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    species: { slug: "raichu" },
  });
});

test("Detail evolution viewer loads numbered shortcut species", () => {
  const state = loadedPikachuDetailState();
  const opened = applyLoadedDetailKey(state, { name: "e" });
  const selected = applyLoadedDetailKey(opened as DetailState, { name: "3" });

  expect(selected).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    species: { slug: "raichu" },
  });
});

test("Detail form selector opens, moves, and closes with Escape", () => {
  const state = loadedPikachuMultiFormDetailState();
  const detail = loadedPikachuMultiFormDetail();
  const opened = applyAppKey(state, { name: "f" }, { detail });
  const moved = applyAppKey(opened, { name: "j" }, { detail });
  const closed = applyAppKey(moved, { name: "escape" }, { detail });

  expect(opened).toMatchObject({
    screen: "detail",
    detailOverlay: { kind: "forms", selectedIndex: 0 },
  });
  expect(moved).toMatchObject({
    screen: "detail",
    detailOverlay: { kind: "forms", selectedIndex: 1 },
  });
  expect(closed).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    shouldExit: false,
  });
});

test("Detail form selector does not open without alternate forms", () => {
  const state = createInitialAppState("pikachu") as DetailState;
  const detail = loadedDetail(state.species, {
    ...pikachuDetail,
    forms: [pikachuDetail.form],
  });

  expect(applyAppKey(state, { name: "f" }, { detail })).toBe(state);
});

test("Detail form selector loads the selected form", () => {
  const state = loadedPikachuMultiFormDetailState();
  const detail = loadedPikachuMultiFormDetail();
  const opened = applyAppKey(state, { name: "f" }, { detail });
  const moved = applyAppKey(opened, { name: "down" }, { detail });
  const selected = applyAppKey(moved, { name: "enter" }, { detail });

  expect(selected).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    form: {
      pokemonName: "pikachu-rock-star",
      spriteFormKey: "rock-star",
    },
    species: { slug: "pikachu" },
  });
});

test("Detail form key toggles when there is one alternate form", () => {
  const state = loadedAlolanVulpixDetailState();
  const toggled = applyLoadedDetailKey(state, { name: "f" });

  expect(toggled).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    form: undefined,
    species: { slug: "vulpix" },
  });
});

test("Detail next navigation carries Alolan form to Ninetales", () => {
  const state = loadedAlolanVulpixDetailState();
  const next = applyLoadedDetailKey(state, { name: "right" });

  expect(next).toMatchObject({
    screen: "detail",
    species: { slug: "ninetales" },
  });
  if (next.screen !== "detail") {
    throw new Error("Expected Detail state");
  }
  expect(next.form).toEqual({ spriteFormKey: "alola" });
});

test("Detail next navigation carries Galarian form to Rapidash", () => {
  const state = loadedGalarianPonytaDetailState();
  const next = applyLoadedDetailKey(state, { name: "right" });

  expect(next).toMatchObject({
    screen: "detail",
    species: { slug: "rapidash" },
  });
  if (next.screen !== "detail") {
    throw new Error("Expected Detail state");
  }
  expect(next.form).toEqual({ spriteFormKey: "galar" });
});

test("Detail evolution selection carries Alolan form to Ninetales", () => {
  const state = loadedAlolanVulpixDetailState();
  const ninetales =
    findExactSpecies("ninetales") ?? throwMissingSpecies("ninetales");
  const next = loadDetailSpecies(state, ninetales, loadedDetailForState(state));

  expect(next).toMatchObject({
    screen: "detail",
    species: { slug: "ninetales" },
  });
  expect(next.form).toEqual({ spriteFormKey: "alola" });
});

test("Detail evolution selection accepts default when carried form is unavailable", () => {
  const state = loadedAlolanVulpixDetailState();
  const ninetales =
    findExactSpecies("ninetales") ?? throwMissingSpecies("ninetales");
  const next = loadDetailSpecies(state, ninetales, loadedDetailForState(state));

  expect(next).toMatchObject({
    screen: "detail",
    species: { slug: "ninetales" },
  });
  expect(next.form).toEqual({ spriteFormKey: "alola" });
});

test("Detail form target matching accepts resolved carryover and default fallback", () => {
  expect(
    pokemonFormsMatch({ spriteFormKey: "alola" }, alolanNinetalesForm, {
      allowDefaultFallback: true,
    }),
  ).toBe(true);
  expect(
    pokemonFormsMatch({ spriteFormKey: "alola" }, ninetalesDefaultForm, {
      allowDefaultFallback: true,
    }),
  ).toBe(true);
  expect(
    pokemonFormsMatch({ spriteFormKey: "alola" }, ninetalesDefaultForm, {
      allowDefaultFallback: false,
    }),
  ).toBe(false);
});

test("Detail exact selected forms do not accept default fallback", () => {
  expect(
    pokemonFormsMatch(pikachuLibreForm, ninetalesDefaultForm, {
      allowDefaultFallback: true,
    }),
  ).toBe(false);
});

test("Detail navigation does not carry cosmetic forms across evolutions", () => {
  const state = loadedPikachuLibreDetailState();
  const next = applyLoadedDetailKey(state, { name: "right" });

  expect(next).toMatchObject({
    screen: "detail",
    form: undefined,
    species: { slug: "raichu" },
  });
});

test("Detail dex navigation resets regional form outside evolution chain", () => {
  const state = loadedAlolanNinetalesDetailState();
  const next = applyLoadedDetailKey(state, { name: "right" });

  expect(next).toMatchObject({
    screen: "detail",
    form: undefined,
    species: { slug: "jigglypuff" },
  });
});

test("Detail returns to cleared Search on slash", () => {
  const detail = applyAppKey(createInitialAppState("pika"), { name: "enter" });
  const next = applyAppKey(detail, { name: "/" });

  expect(next).toEqual({
    screen: "search",
    query: "",
    selectedIndex: 0,
    shouldExit: false,
  });
});

test("Detail error can fall back to Search on slash", () => {
  const state = createInitialAppState("pikachu") as DetailState;
  const next = applyAppKey(state, { name: "/" }, { detailStatus: "error" });

  expect(next).toEqual({
    screen: "search",
    query: "",
    selectedIndex: 0,
    shouldExit: false,
  });
});

test("defines per-query cache policies", () => {
  expect(queryCacheBuster).toMatch(/^pkdx-query-cache-[a-f0-9]{6}$/);
  expect(queryPersisterPrefix).toBe("pkdx-query");
  expect(queryCachePolicies.pokeapiResource.gcTime).toBeGreaterThan(
    queryCachePolicies.pokemonDetail.gcTime,
  );
  expect(queryCachePolicies.pokespriteMetadata.gcTime).toBeGreaterThan(
    queryCachePolicies.pokeapiResource.gcTime,
  );
  expect(persistedQueryMaxAge).toBe(
    queryCachePolicies.pokespriteMetadata.gcTime,
  );
  expect(runtimeQueryCachePolicies.pokemonDetail.gcTime).toBe(
    queryCachePolicies.pokemonDetail.gcTime,
  );
  expect(runtimeQueryCachePolicies.pokeapiResource.gcTime).toBeLessThan(
    queryCachePolicies.pokeapiResource.gcTime,
  );
  expect(runtimeQueryCachePolicies.pokespriteMetadata.gcTime).toBeLessThan(
    queryCachePolicies.pokespriteMetadata.gcTime,
  );
});

test("maps National Dex numbers to generation cache shards", () => {
  expect(shardForDexNumber(1)).toBe("generation-1");
  expect(shardForDexNumber(151)).toBe("generation-1");
  expect(shardForDexNumber(152)).toBe("generation-2");
  expect(shardForDexNumber(251)).toBe("generation-2");
  expect(shardForDexNumber(906)).toBe("generation-9");
  expect(shardForDexNumber(1025)).toBe("generation-9");
  expect(shardForDexNumber(1026)).toBe("shared");
});

test("persists query cache state to filesystem storage", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "pokedex-query-cache-"));

  try {
    const storage = createFileStorage(cacheDirectory);

    await storage.setItem("query-client.json", "cached-state");
    expect(await storage.getItem("query-client.json")).toBe("cached-state");

    await storage.removeItem("query-client.json");
    expect(await storage.getItem("query-client.json")).toBeNull();
  } finally {
    await rm(cacheDirectory, { force: true, recursive: true });
  }
});

test("persists individual queries into generation-indexed sqlite storage", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "pokedex-query-cache-"));

  try {
    const storage = createSqliteQueryStorage(cacheDirectory);
    const persister = createQueryPersister(cacheDirectory);

    await storage.setItem(
      queryPersisterStorageKey("detail-pikachu"),
      JSON.stringify({
        buster: queryCacheBuster,
        queryHash: "detail-pikachu",
        queryKey: ["pokemon-detail", "pikachu", "$"],
        state: persistedQueryState("pikachu"),
      }),
    );

    const database = new Database(queryCacheDatabasePath(cacheDirectory), {
      readonly: true,
    });
    const row = database
      .query("SELECT shard FROM query_cache WHERE key = $key")
      .get({ $key: queryPersisterStorageKey("detail-pikachu") }) as {
      shard: string;
    } | null;
    database.close();
    expect(row?.shard).toBe("generation-1");

    expect(await persister.retrieveQuery<string>("detail-pikachu")).toBe(
      "pikachu",
    );
  } finally {
    await rm(cacheDirectory, { force: true, recursive: true });
  }
});

test("removes malformed individual persisted queries", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "pokedex-query-cache-"));

  try {
    const storage = createSqliteQueryStorage(cacheDirectory);
    const persister = createQueryPersister(cacheDirectory);

    await storage.setItem(
      queryPersisterStorageKey("detail-pikachu"),
      JSON.stringify({
        buster: "old-version",
        queryHash: "detail-pikachu",
        queryKey: ["pokemon-detail", "pikachu", "$"],
        state: persistedQueryState("pikachu"),
      }),
    );

    expect(
      await persister.retrieveQuery<string>("detail-pikachu"),
    ).toBeUndefined();
    expect(
      await storage.getItem(queryPersisterStorageKey("detail-pikachu")),
    ).toBeNull();
  } finally {
    await rm(cacheDirectory, { force: true, recursive: true });
  }
});

function persistedQueryState(data: string) {
  return {
    data,
    dataUpdateCount: 1,
    dataUpdatedAt: Date.now(),
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchMeta: null,
    fetchStatus: "idle" as const,
    isInvalidated: false,
    status: "success" as const,
  };
}

function throwMissingSpecies(slug: string): never {
  throw new Error(`Missing test species: ${slug}`);
}

function loadedPikachuDetailState(): DetailState {
  return createInitialAppState("pikachu") as DetailState;
}

function loadedPikachuMultiFormDetailState(): DetailState {
  return createInitialAppState("pikachu") as DetailState;
}

function loadedPikachuMultiFormDetail(): LoadedDetail {
  return loadedDetail(
    findExactSpecies("pikachu") ?? throwMissingSpecies("pikachu"),
    {
      ...pikachuDetail,
      forms: [...pikachuDetail.forms, pikachuLibreForm],
    },
  );
}

function loadedPikachuLibreDetailState(): DetailState {
  return {
    ...loadedPikachuDetailState(),
    form: pikachuLibreForm,
  };
}

const vulpixDefaultForm = pokemonForm("Vulpix (Default)", true, "vulpix", "$");
const pikachuLibreForm = pokemonForm(
  "Pikachu Libre",
  false,
  "pikachu-libre",
  "libre",
);
const alolanVulpixForm = pokemonForm(
  "Vulpix Alola",
  false,
  "vulpix-alola",
  "alola",
);
const ninetalesDefaultForm = pokemonForm(
  "Ninetales (Default)",
  true,
  "ninetales",
  "$",
);
const alolanNinetalesForm = pokemonForm(
  "Ninetales Alola",
  false,
  "ninetales-alola",
  "alola",
);
const ponytaDefaultForm = pokemonForm("Ponyta (Default)", true, "ponyta", "$");
const galarianPonytaForm = pokemonForm(
  "Ponyta Galar",
  false,
  "ponyta-galar",
  "galar",
);
const vulpixEvolutionChain = {
  root: {
    evolvesTo: [
      {
        evolvesTo: [],
        method: "use item, ice stone",
        name: "Ninetales Alola",
        speciesName: "Ninetales",
      },
    ],
    method: undefined,
    name: "Vulpix Alola",
    speciesName: "Vulpix",
  },
};
const ponytaEvolutionChain = {
  root: {
    evolvesTo: [
      {
        evolvesTo: [],
        method: "level 40",
        name: "Rapidash Galar",
        speciesName: "Rapidash",
      },
    ],
    method: undefined,
    name: "Ponyta Galar",
    speciesName: "Ponyta",
  },
};
const alolanVulpixDetail = pokemonDetailWithForms(
  "Vulpix Alola",
  [vulpixDefaultForm, alolanVulpixForm],
  alolanVulpixForm,
);
const alolanNinetalesDetail = pokemonDetailWithForms(
  "Ninetales Alola",
  [ninetalesDefaultForm, alolanNinetalesForm],
  alolanNinetalesForm,
);
const galarianPonytaDetail = pokemonDetailWithForms(
  "Ponyta Galar",
  [ponytaDefaultForm, galarianPonytaForm],
  galarianPonytaForm,
  ponytaEvolutionChain,
);

function loadedAlolanVulpixDetailState(): DetailState {
  return {
    ...(createInitialAppState("vulpix") as DetailState),
    form: alolanVulpixForm,
  };
}

function loadedAlolanNinetalesDetailState(): DetailState {
  return {
    ...(createInitialAppState("ninetales") as DetailState),
    form: alolanNinetalesForm,
  };
}

function loadedGalarianPonytaDetailState(): DetailState {
  return {
    ...(createInitialAppState("ponyta") as DetailState),
    form: galarianPonytaForm,
  };
}

function applyLoadedDetailKey(
  state: DetailState,
  key: Parameters<typeof applyAppKey>[1],
) {
  return applyAppKey(state, key, { detail: loadedDetailForState(state) });
}

function loadedDetailForState(state: DetailState): LoadedDetail {
  if (state.species.slug === "vulpix") {
    return loadedDetail(state.species, alolanVulpixDetail);
  }

  if (state.species.slug === "ninetales") {
    return loadedDetail(state.species, alolanNinetalesDetail);
  }

  if (state.species.slug === "ponyta") {
    return loadedDetail(state.species, galarianPonytaDetail);
  }

  if (state.form?.spriteFormKey === "libre") {
    return loadedDetail(
      state.species,
      pokemonDetailWithForms(
        "Pikachu Libre",
        [pikachuDetail.form, pikachuLibreForm],
        pikachuLibreForm,
        pikachuDetail.evolutionChain,
      ),
    );
  }

  return loadedDetail(state.species, pikachuDetail);
}

function loadedDetail(
  species: LoadedDetail["species"],
  detail: PokemonDetail,
): LoadedDetail {
  return {
    detail,
    form: detail.form,
    species,
  };
}

function pokemonForm(
  displayName: string,
  isDefault: boolean,
  pokemonName: string,
  spriteFormKey: string,
): PokemonForm {
  return {
    displayName,
    isDefault,
    pokemonName,
    pokemonUrl: `pokemon/${pokemonName}`,
    spriteFormKey,
  };
}

function pokemonDetailWithForms(
  name: string,
  forms: PokemonForm[],
  form: PokemonForm,
  evolutionChain: PokemonDetail["evolutionChain"] = vulpixEvolutionChain,
): PokemonDetail {
  return {
    ...pikachuDetail,
    evolutionChain,
    form,
    forms,
    name,
  };
}
