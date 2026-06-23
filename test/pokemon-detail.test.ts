import { expect, test } from "bun:test";
import { HttpResponse, http } from "msw";
import {
  buildPokemonAbilityDetail,
  buildDefaultPokemonDetail,
  pokemonAbilityDetailsQueryOptions,
  pokemonDetailQueryKey,
  pokemonDetailQueryOptions,
} from "../src/pokemon-detail";
import { createAppQueryClient, queryCachePolicies } from "../src/query-cache";
import type { SpeciesIndexEntry } from "../src/search";
import {
  pikachuPokemon,
  pikachuSpecies,
  staticAbility,
} from "./support/pokeapi-fixtures";
import { createMockServer, executeQuery } from "./support/query-test";

const server = createMockServer();

const pikachuIndexEntry: SpeciesIndexEntry = {
  aliases: ["pika", "025", "25"],
  dexNumber: 25,
  dexNumbers: ["25", "025"],
  name: "Pikachu",
  slug: "pikachu",
};

test("builds Default Representative PokemonDetail from validated PokeAPI resources", () => {
  const detail = buildDefaultPokemonDetail(
    pikachuIndexEntry,
    pikachuSpecies,
    pikachuPokemon,
  );

  expect(detail).toEqual({
    abilities: [
      {
        isHidden: false,
        name: "Static",
        url: "https://pokeapi.co/api/v2/ability/9/",
      },
      {
        isHidden: true,
        name: "Lightning Rod",
        url: "https://pokeapi.co/api/v2/ability/31/",
      },
    ],
    dexNumber: 25,
    flavorText:
      "When several of these POKéMON gather, their electricity can build and cause lightning storms.",
    heightMeters: 0.4,
    name: "Pikachu",
    sprite: {
      kind: "placeholder",
      label: "pikachu sprite pending",
    },
    stats: [
      { base: 35, name: "HP" },
      { base: 55, name: "Attack" },
      { base: 40, name: "Defense" },
      { base: 50, name: "Sp. Attack" },
      { base: 50, name: "Sp. Defense" },
      { base: 90, name: "Speed" },
    ],
    types: ["Electric"],
    weightKilograms: 6,
  });
});

test("builds PokemonAbilityDetail from validated PokeAPI Ability resources", () => {
  expect(buildPokemonAbilityDetail(staticAbility)).toEqual({
    effect: "This Pokémon has a chance of paralyzing attackers on contact.",
    name: "Static",
    shortEffect: "May paralyze attackers on contact.",
  });
});

test("loads ability descriptions for cached Detail abilities without resource URLs", async () => {
  server.use(
    http.get("https://pokeapi.co/api/v2/ability/static/", () => {
      return HttpResponse.json(staticAbility);
    }),
  );
  const queryClient = {
    fetchQuery: <TData>(resourceOptions: { queryFn?: unknown }) => {
      return executeQuery<TData>(resourceOptions);
    },
  };
  const options = pokemonAbilityDetailsQueryOptions(
    [{ isHidden: false, name: "Static" }],
    queryClient,
  );

  await expect(executeQuery(options)).resolves.toEqual([
    {
      effect: "This Pokémon has a chance of paralyzing attackers on contact.",
      name: "Static",
      shortEffect: "May paralyze attackers on contact.",
    },
  ]);
});

test("loads Default Representative PokemonDetail through mocked PokeAPI queries", async () => {
  server.use(
    http.get("https://pokeapi.co/api/v2/pokemon-species/25/", () => {
      return HttpResponse.json(pikachuSpecies);
    }),
    http.get("https://pokeapi.co/api/v2/pokemon/25/", () => {
      return HttpResponse.json(pikachuPokemon);
    }),
  );
  const queryClient = {
    fetchQuery: <TData>(resourceOptions: { queryFn?: unknown }) => {
      return executeQuery<TData>(resourceOptions);
    },
  };
  const options = pokemonDetailQueryOptions(pikachuIndexEntry, queryClient);

  await expect(executeQuery(options)).resolves.toMatchObject({
    dexNumber: 25,
    name: "Pikachu",
    types: ["Electric"],
  });
  expect(options.staleTime).toBe(queryCachePolicies.pokemonDetail.staleTime);
  expect(options.gcTime).toBe(queryCachePolicies.pokemonDetail.gcTime);
});

test("loads cached PokemonDetail without network access", async () => {
  const queryClient = createAppQueryClient();
  const cachedDetail = buildDefaultPokemonDetail(
    pikachuIndexEntry,
    pikachuSpecies,
    pikachuPokemon,
  );
  queryClient.setQueryDefaults(pokemonDetailQueryKey(pikachuIndexEntry), {
    gcTime: Infinity,
  });
  queryClient.setQueryData(
    pokemonDetailQueryKey(pikachuIndexEntry),
    cachedDetail,
  );

  await expect(
    queryClient.fetchQuery(
      pokemonDetailQueryOptions(pikachuIndexEntry, queryClient),
    ),
  ).resolves.toEqual(cachedDetail);
});

test("fails recoverably when uncached PokemonDetail is offline", async () => {
  const queryClient = {
    fetchQuery: () => Promise.reject(new Error("offline")),
  };

  await expect(
    executeQuery(pokemonDetailQueryOptions(pikachuIndexEntry, queryClient)),
  ).rejects.toThrow();
});
