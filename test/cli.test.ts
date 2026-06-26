import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyAppKey,
  createInitialAppState,
  detailAbilitiesLoaded,
  detailLoadFailed,
  detailLoadSucceeded,
  loadDetailSpecies,
  type DetailState,
} from "../src/app-state";
import { getInitialSearchQuery, searchScreenTitle } from "../src/cli";
import type { PokemonDetail } from "../src/pokemon-detail";
import {
  createFileStorage,
  persistedQueryMaxAge,
  queryCachePolicies,
} from "../src/query-cache";
import { findExactSpecies } from "../src/search";

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
  evolutionChain: {
    root: {
      evolvesTo: [
        {
          evolvesTo: [
            {
              evolvesTo: [],
              method: "use item, Thunder Stone",
              name: "Raichu",
              url: "https://pokeapi.co/api/v2/pokemon-species/26/",
            },
          ],
          method: "level up, happiness 220",
          name: "Pikachu",
          url: "https://pokeapi.co/api/v2/pokemon-species/25/",
        },
      ],
      method: undefined,
      name: "Pichu",
      url: "https://pokeapi.co/api/v2/pokemon-species/172/",
    },
  },
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

test.each([
  { key: { name: "q" }, label: "q" },
  { key: { name: "escape" }, label: "Escape" },
  { key: { name: "c", ctrl: true }, label: "Ctrl-C" },
])("exits cleanly on $label", ({ key }) => {
  const next = applyAppKey(createInitialAppState(), key);

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
    status: "loading",
    species: {
      slug: "pikachu",
    },
  });
});

test("Search preserves selection while opening Detail", () => {
  const selected = applyAppKey(createInitialAppState("nidoran"), {
    name: "j",
    ctrl: true,
  });
  const detail = applyAppKey(selected, { name: "enter" });
  const search = applyAppKey(detail, { name: "/" });

  expect(detail).toMatchObject({
    screen: "detail",
    previousQuery: "nidoran",
    previousSelectedIndex: 1,
  });
  expect(search).toMatchObject({
    screen: "search",
    query: "nidoran",
    selectedIndex: 1,
  });
});

test("Detail starts in loading state before data is ready", () => {
  expect(createInitialAppState("pikachu")).toMatchObject({
    screen: "detail",
    detail: undefined,
    retryToken: 0,
    shiny: false,
    status: "loading",
  });
});

test("Detail toggles shiny Sprite presentation without changing identity", () => {
  const state = loadedPikachuDetailState();
  const shiny = applyAppKey(state, { name: "s" });
  const regular = applyAppKey(shiny, { name: "s" });

  expect(shiny).toMatchObject({
    screen: "detail",
    detail: {
      detail: pikachuDetail,
      species: { slug: "pikachu" },
    },
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
  const next = applyAppKey(state, { name: "d" });
  const previous = applyAppKey(next, { name: "d", shift: true });

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

test("Detail load success swaps the completed model atomically", () => {
  const state = createInitialAppState("pikachu") as DetailState;
  const next = detailLoadSucceeded(state, state.species, pikachuDetail);

  expect(next).toMatchObject({
    screen: "detail",
    detail: {
      detail: pikachuDetail,
      species: { slug: "pikachu" },
    },
    status: "ready",
  });
});

test("Detail keeps current model while loading a new species", () => {
  const state = detailLoadSucceeded(
    createInitialAppState("pikachu") as DetailState,
    findExactSpecies("pikachu") ?? throwMissingSpecies("pikachu"),
    pikachuDetail,
  );
  const bulbasaur =
    findExactSpecies("bulbasaur") ?? throwMissingSpecies("bulbasaur");

  const next = loadDetailSpecies(state, bulbasaur);

  expect(next).toMatchObject({
    detail: {
      detail: pikachuDetail,
      species: { slug: "pikachu" },
    },
    species: { slug: "bulbasaur" },
    status: "loading",
  });
});

test("Detail navigates previous and next species in National Dex order", () => {
  const state = loadedPikachuDetailState();
  const previous = applyAppKey(state, { name: "h" });
  const next = applyAppKey(previous, { name: "right" });

  expect(previous).toMatchObject({
    screen: "detail",
    descriptionIndex: 0,
    form: undefined,
    species: { dexNumber: 24, slug: "arbok" },
    status: "loading",
  });
  expect(next).toMatchObject({
    screen: "detail",
    species: { dexNumber: 25, slug: "pikachu" },
    status: "loading",
  });
});

test("Detail National Dex navigation stops at boundaries", () => {
  const state = createInitialAppState("bulbasaur");

  expect(applyAppKey(state, { name: "left" })).toBe(state);
});

test("Detail retry returns a recoverable error to loading", () => {
  const state = createInitialAppState("pikachu") as DetailState;
  const failed = detailLoadFailed(state, state.species, new Error("offline"));
  const retrying = applyAppKey(failed, { name: "r" });

  expect(failed).toMatchObject({
    errorMessage: "offline",
    status: "error",
  });
  expect(retrying).toMatchObject({
    errorMessage: undefined,
    retryToken: 1,
    status: "loading",
  });
});

test("Detail opens and closes ability viewer with a", () => {
  const state = loadedPikachuDetailState();
  const loading = applyAppKey(state, { name: "a" });
  const opened = detailAbilitiesLoaded(loading as DetailState);
  const closed = applyAppKey(opened, { name: "a" });

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
  const loading = applyAppKey(state, { name: "a" });
  const opened = detailAbilitiesLoaded(loading as DetailState);
  const closed = applyAppKey(opened, { name: "escape" });

  expect(closed).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    shouldExit: false,
  });
});

test("Detail opens and closes evolution viewer with e", () => {
  const state = loadedPikachuDetailState();
  const opened = applyAppKey(state, { name: "e" });
  const closed = applyAppKey(opened, { name: "e" });

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

test("Detail evolution viewer closes with Escape instead of exiting", () => {
  const state = loadedPikachuDetailState();
  const opened = applyAppKey(state, { name: "e" });
  const closed = applyAppKey(opened, { name: "escape" });

  expect(closed).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    shouldExit: false,
  });
});

test("Detail form selector opens, moves, and closes with Escape", () => {
  const state = loadedPikachuDetailState();
  const opened = applyAppKey(state, { name: "f" });
  const moved = applyAppKey(opened, { name: "j" });
  const closed = applyAppKey(moved, { name: "escape" });

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
  const state = detailLoadSucceeded(
    createInitialAppState("pikachu") as DetailState,
    findExactSpecies("pikachu") ?? throwMissingSpecies("pikachu"),
    {
      ...pikachuDetail,
      forms: [pikachuDetail.form],
    },
  );

  expect(applyAppKey(state, { name: "f" })).toBe(state);
});

test("Detail form selector loads the selected form", () => {
  const state = loadedPikachuDetailState();
  const opened = applyAppKey(state, { name: "f" });
  const moved = applyAppKey(opened, { name: "down" });
  const selected = applyAppKey(moved, { name: "enter" });

  expect(selected).toMatchObject({
    screen: "detail",
    detailOverlay: undefined,
    form: {
      pokemonName: "pikachu-rock-star",
      spriteFormKey: "rock-star",
    },
    species: { slug: "pikachu" },
    status: "loading",
  });
});

test("Detail returns to Search on slash", () => {
  const detail = applyAppKey(createInitialAppState("pika"), { name: "enter" });
  const next = applyAppKey(detail, { name: "/" });

  expect(next).toEqual({
    screen: "search",
    query: "pika",
    selectedIndex: 0,
    shouldExit: false,
  });
});

test("Detail error can fall back to Search on slash", () => {
  const state = createInitialAppState("pikachu") as DetailState;
  const failed = detailLoadFailed(state, state.species, new Error("offline"));
  const next = applyAppKey(failed, { name: "/" });

  expect(next).toEqual({
    screen: "search",
    query: "",
    selectedIndex: 0,
    shouldExit: false,
  });
});

test("defines per-query cache policies", () => {
  expect(queryCachePolicies.pokeapiResource.gcTime).toBeGreaterThan(
    queryCachePolicies.pokemonDetail.gcTime,
  );
  expect(queryCachePolicies.pokespriteMetadata.gcTime).toBeGreaterThan(
    queryCachePolicies.pokeapiResource.gcTime,
  );
  expect(persistedQueryMaxAge).toBe(
    queryCachePolicies.pokespriteMetadata.gcTime,
  );
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

function throwMissingSpecies(slug: string): never {
  throw new Error(`Missing test species: ${slug}`);
}

function loadedPikachuDetailState(): DetailState {
  return detailLoadSucceeded(
    createInitialAppState("pikachu") as DetailState,
    findExactSpecies("pikachu") ?? throwMissingSpecies("pikachu"),
    pikachuDetail,
  );
}
