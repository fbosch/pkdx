import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyAppKey,
  createInitialAppState,
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
  abilities: [{ isHidden: false, name: "Static" }],
  dexNumber: 25,
  flavorText: "Mouse Pokemon.",
  heightMeters: 0.4,
  name: "Pikachu",
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

test("Search selection moves with Shift-J and Shift-K", () => {
  const selected = applyAppKey(createInitialAppState("nidoran"), {
    name: "j",
    shift: true,
  });
  const reset = applyAppKey(selected, { name: "k", shift: true });

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

test("Search selection waits for enough query input", () => {
  const selected = applyAppKey(createInitialAppState("pi"), {
    name: "j",
    shift: true,
  });

  expect(selected).toMatchObject({
    screen: "search",
    query: "pi",
    selectedIndex: 0,
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
    status: "loading",
    species: {
      slug: "pikachu",
    },
  });
});

test("Detail starts in loading state before data is ready", () => {
  expect(createInitialAppState("pikachu")).toMatchObject({
    screen: "detail",
    detail: undefined,
    retryToken: 0,
    status: "loading",
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
