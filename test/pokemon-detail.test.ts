import { expect, test } from "bun:test";
import { HttpResponse, http } from "msw";
import {
  buildPokemonForms,
  buildPokemonAbilityDetail,
  buildDefaultPokemonDetail,
  buildPokemonDetail,
  pokemonAbilityDetailsQueryOptions,
  pokemonDetailQueryKey,
  pokemonDetailQueryOptions,
} from "../src/pokemon-detail";
import { createAppQueryClient, queryCachePolicies } from "../src/query-cache";
import type { SpeciesIndexEntry } from "../src/search";
import {
  charizardMegaXPokemon,
  charizardSpecies,
  pikachuEvolutionChain,
  pikachuPokemon,
  pikachuRockStarPokemon,
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

const charizardIndexEntry: SpeciesIndexEntry = {
  aliases: ["006", "6"],
  dexNumber: 6,
  dexNumbers: ["6", "006"],
  name: "Charizard",
  slug: "charizard",
};

const eeveeIndexEntry: SpeciesIndexEntry = {
  aliases: ["133"],
  dexNumber: 133,
  dexNumbers: ["133"],
  name: "Eevee",
  slug: "eevee",
};

test("builds Default Representative PokemonDetail from validated PokeAPI resources", () => {
  const forms = buildPokemonForms(pikachuIndexEntry, pikachuSpecies);
  const defaultForm = forms[0];

  if (defaultForm === undefined) {
    throw new Error("Missing Pikachu default form fixture");
  }

  const detail = buildDefaultPokemonDetail(
    pikachuIndexEntry,
    pikachuSpecies,
    pikachuPokemon,
    pikachuEvolutionChain,
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
    flavorText:
      "When several of these POKéMON gather, their electricity can build and cause lightning storms.",
    flavorTexts: [
      {
        source: "Red",
        text: "When several of these POKéMON gather, their electricity can build and cause lightning storms.",
      },
    ],
    form: defaultForm,
    forms,
    genderRatio: { femalePercent: 50, kind: "gendered", malePercent: 50 },
    heightMeters: 0.4,
    name: "Pikachu",
    species: "Mouse Pokémon",
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

test("normalizes PokeAPI varieties into Pokemon Forms", () => {
  expect(buildPokemonForms(charizardIndexEntry, charizardSpecies)).toEqual([
    {
      displayName: "Charizard (Default)",
      isDefault: true,
      pokemonName: "charizard",
      pokemonUrl: "https://pokeapi.co/api/v2/pokemon/6/",
      spriteFormKey: "$",
    },
    {
      displayName: "Charizard Mega X",
      isDefault: false,
      pokemonName: "charizard-mega-x",
      pokemonUrl: "https://pokeapi.co/api/v2/pokemon/charizard-mega-x/",
      spriteFormKey: "mega-x",
    },
    {
      displayName: "Charizard Mega Y",
      isDefault: false,
      pokemonName: "charizard-mega-y",
      pokemonUrl: "https://pokeapi.co/api/v2/pokemon/charizard-mega-y/",
      spriteFormKey: "mega-y",
    },
  ]);

  expect(buildPokemonForms(pikachuIndexEntry, pikachuSpecies)).toContainEqual({
    displayName: "Pikachu Rock Star",
    isDefault: false,
    pokemonName: "pikachu-rock-star",
    pokemonUrl: "https://pokeapi.co/api/v2/pokemon/pikachu-rock-star/",
    spriteFormKey: "rock-star",
  });
});

test("excludes unsupported Gmax varieties from selectable Pokemon Forms", () => {
  expect(
    buildPokemonForms(eeveeIndexEntry, {
      ...pikachuSpecies,
      id: 133,
      name: "eevee",
      names: [
        {
          language: {
            name: "en",
            url: "https://pokeapi.co/api/v2/language/9/",
          },
          name: "Eevee",
        },
      ],
      varieties: [
        {
          is_default: true,
          pokemon: {
            name: "eevee",
            url: "https://pokeapi.co/api/v2/pokemon/133/",
          },
        },
        {
          is_default: false,
          pokemon: {
            name: "eevee-starter",
            url: "https://pokeapi.co/api/v2/pokemon/eevee-starter/",
          },
        },
        {
          is_default: false,
          pokemon: {
            name: "eevee-gmax",
            url: "https://pokeapi.co/api/v2/pokemon/eevee-gmax/",
          },
        },
      ],
    }),
  ).toEqual([
    {
      displayName: "Eevee (Default)",
      isDefault: true,
      pokemonName: "eevee",
      pokemonUrl: "https://pokeapi.co/api/v2/pokemon/133/",
      spriteFormKey: "$",
    },
    {
      displayName: "Eevee Starter",
      isDefault: false,
      pokemonName: "eevee-starter",
      pokemonUrl: "https://pokeapi.co/api/v2/pokemon/eevee-starter/",
      spriteFormKey: "starter",
    },
  ]);
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
    http.get("https://pokeapi.co/api/v2/evolution-chain/10/", () => {
      return HttpResponse.json(pikachuEvolutionChain);
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

test("loads form-specific PokemonDetail through mocked PokeAPI queries", async () => {
  server.use(
    http.get("https://pokeapi.co/api/v2/pokemon-species/25/", () => {
      return HttpResponse.json(pikachuSpecies);
    }),
    http.get("https://pokeapi.co/api/v2/pokemon/pikachu-rock-star/", () => {
      return HttpResponse.json(pikachuRockStarPokemon);
    }),
    http.get("https://pokeapi.co/api/v2/evolution-chain/10/", () => {
      return HttpResponse.json(pikachuEvolutionChain);
    }),
  );
  const queryClient = {
    fetchQuery: <TData>(resourceOptions: { queryFn?: unknown }) => {
      return executeQuery<TData>(resourceOptions);
    },
  };
  const rockStarForm = buildPokemonForms(
    pikachuIndexEntry,
    pikachuSpecies,
  ).find((form) => form.pokemonName === "pikachu-rock-star");

  if (rockStarForm === undefined) {
    throw new Error("Missing Pikachu Rock Star form fixture");
  }

  const options = pokemonDetailQueryOptions(
    pikachuIndexEntry,
    queryClient,
    rockStarForm,
  );

  await expect(executeQuery(options)).resolves.toMatchObject({
    form: {
      pokemonName: "pikachu-rock-star",
      spriteFormKey: "rock-star",
    },
    name: "Pikachu Rock Star",
    types: ["Electric"],
  });
  expect(pokemonDetailQueryKey(pikachuIndexEntry, rockStarForm)).toEqual([
    "pokemon-detail",
    "pikachu",
    "pikachu-rock-star",
  ]);
});

test("builds form-specific PokemonDetail mapping", () => {
  const forms = buildPokemonForms(charizardIndexEntry, charizardSpecies);
  const megaX = forms.find((form) => form.pokemonName === "charizard-mega-x");

  if (megaX === undefined) {
    throw new Error("Missing Charizard Mega X form fixture");
  }

  expect(
    buildPokemonDetail(
      charizardIndexEntry,
      charizardSpecies,
      charizardMegaXPokemon,
      pikachuEvolutionChain,
      forms,
      megaX,
    ),
  ).toMatchObject({
    form: {
      displayName: "Charizard Mega X",
      spriteFormKey: "mega-x",
    },
    heightMeters: 1.7,
    name: "Charizard Mega X",
    types: ["Fire", "Dragon"],
    weightKilograms: 110.5,
  });
});

test("loads cached PokemonDetail without network access", async () => {
  const queryClient = createAppQueryClient();
  const cachedDetail = buildDefaultPokemonDetail(
    pikachuIndexEntry,
    pikachuSpecies,
    pikachuPokemon,
    pikachuEvolutionChain,
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
