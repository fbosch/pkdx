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
import type { PokemonDetail } from "../src/pokemon-detail";
import { createAppQueryClient, queryCachePolicies } from "../src/query-cache";
import type { SpeciesIndexEntry } from "../src/search";
import {
  charizardMegaXPokemon,
  charizardSpecies,
  pikachuEvolutionChain,
  pikachuPokemon,
  pikachuPokemonEvolutionChain,
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
const ninetalesIndexEntry: SpeciesIndexEntry = {
  aliases: ["038", "38"],
  dexNumber: 38,
  dexNumbers: ["38", "038"],
  name: "Ninetales",
  slug: "ninetales",
};
const carriedVulpixAlolaForm = {
  displayName: "Vulpix Alola",
  isDefault: false,
  pokemonName: "vulpix-alola",
  pokemonUrl: "https://pokeapi.co/api/v2/pokemon/vulpix-alola/",
  spriteFormKey: "alola",
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
    evolutionChain: pikachuPokemonEvolutionChain,
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

test("includes every PokeAPI variety as selectable Pokemon Forms", () => {
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
      displayName: "Eevee Gmax",
      isDefault: false,
      pokemonName: "eevee-gmax",
      pokemonUrl: "https://pokeapi.co/api/v2/pokemon/eevee-gmax/",
      spriteFormKey: "gmax",
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

test("includes Galarian legendary bird varieties", () => {
  expect(
    buildPokemonForms(
      {
        aliases: ["146"],
        dexNumber: 146,
        dexNumbers: ["146"],
        name: "Moltres",
        slug: "moltres",
      },
      {
        ...pikachuSpecies,
        id: 146,
        name: "moltres",
        names: [{ language: { name: "en", url: "" }, name: "Moltres" }],
        varieties: [
          {
            is_default: true,
            pokemon: {
              name: "moltres",
              url: "https://pokeapi.co/api/v2/pokemon/146/",
            },
          },
          {
            is_default: false,
            pokemon: {
              name: "moltres-galar",
              url: "https://pokeapi.co/api/v2/pokemon/10171/",
            },
          },
        ],
      },
    ),
  ).toContainEqual({
    displayName: "Moltres Galar",
    isDefault: false,
    pokemonName: "moltres-galar",
    pokemonUrl: "https://pokeapi.co/api/v2/pokemon/10171/",
    spriteFormKey: "galar",
  });
});

test("loads carried regional form by sprite form key", async () => {
  setupNinetalesDetailResources({
    includeAlola: true,
    includeFormDescription: true,
  });
  const detail = await loadNinetalesWithCarriedAlolaForm();

  expect(detail.form).toMatchObject({
    pokemonName: "ninetales-alola",
    spriteFormKey: "alola",
  });
  expect(detail.name).toBe("Ninetales Alola");
  expect(detail.flavorText).toBe("This form lives on snowy mountains.");
});

test("prefers selected form version group flavor text", async () => {
  setupNinetalesDetailResources({
    includeAlola: true,
    includeFormDescription: true,
    includeVersionGroupFlavor: true,
  });
  const detail = await loadNinetalesWithCarriedAlolaForm();

  expect(detail.form).toMatchObject({
    pokemonName: "ninetales-alola",
    spriteFormKey: "alola",
  });
  expect(detail.flavorText).toBe("Alolan Ninetales protects snowy peaks.");
  expect(detail.flavorTexts[0]).toEqual({
    source: "Moon",
    text: "Alolan Ninetales protects snowy peaks.",
  });
});

test("omits alternate form version group flavor text from default form", async () => {
  setupNinetalesDetailResources({
    includeAlola: true,
    includeVersionGroupFlavor: true,
  });
  const detail = await loadDefaultNinetales();

  expect(detail.form).toMatchObject({
    isDefault: true,
    pokemonName: "ninetales",
    spriteFormKey: "$",
  });
  expect(detail.flavorText).toContain("electricity can build");
  expect(detail.flavorTexts).not.toContainEqual({
    source: "Moon",
    text: "Alolan Ninetales protects snowy peaks.",
  });
});

test("falls back to species flavor text when selected form has no description", async () => {
  setupNinetalesDetailResources({
    includeAlola: true,
    includeFormDescription: false,
  });
  const detail = await loadNinetalesWithCarriedAlolaForm();

  expect(detail.form).toMatchObject({
    pokemonName: "ninetales-alola",
    spriteFormKey: "alola",
  });
  expect(detail.flavorTexts.length).toBeGreaterThan(0);
  expect(detail.flavorText).toContain("electricity can build");
});

test("falls back to default form when carried evolution form is unavailable", async () => {
  setupNinetalesDetailResources({ includeAlola: false });
  const detail = await loadNinetalesWithCarriedAlolaForm();

  expect(detail.form).toMatchObject({
    isDefault: true,
    pokemonName: "ninetales",
    spriteFormKey: "$",
  });
  expect(detail.name).toBe("Ninetales");
});

test("does not carry unrelated alternate form keys to another species", async () => {
  const forms = buildPokemonForms(charizardIndexEntry, charizardSpecies);
  const megaX = forms.find((form) => form.pokemonName === "charizard-mega-x");

  if (megaX === undefined) {
    throw new Error("Missing Charizard Mega X form fixture");
  }

  setupRaichuDetailResources();
  const detail = (await executeQuery(
    pokemonDetailQueryOptions(
      {
        aliases: ["026", "26"],
        dexNumber: 26,
        dexNumbers: ["26", "026"],
        name: "Raichu",
        slug: "raichu",
      },
      createResourceQueryClient(),
      megaX,
    ),
  )) as PokemonDetail;

  expect(detail.form).toMatchObject({
    isDefault: true,
    pokemonName: "raichu",
    spriteFormKey: "$",
  });
  expect(detail.name).toBe("Raichu");
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
  const queryClient = createResourceQueryClient();
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
    http.get(
      "https://pokeapi.co/api/v2/pokemon-form/pikachu-rock-star/",
      () => {
        return HttpResponse.json({
          name: "pikachu-rock-star",
          version_group: {
            name: "omega-ruby-alpha-sapphire",
            url: "https://pokeapi.co/api/v2/version-group/16/",
          },
        });
      },
    ),
    http.get("https://pokeapi.co/api/v2/version-group/16/", () => {
      return HttpResponse.json({
        name: "omega-ruby-alpha-sapphire",
        versions: [
          {
            name: "omega-ruby",
            url: "https://pokeapi.co/api/v2/version/15/",
          },
        ],
      });
    }),
    http.get("https://pokeapi.co/api/v2/evolution-chain/10/", () => {
      return HttpResponse.json(pikachuEvolutionChain);
    }),
  );
  const queryClient = createResourceQueryClient();
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
    http.get(
      "https://pokeapi.co/api/v2/pokemon-form/pikachu-rock-star/",
      () => {
        return HttpResponse.json({
          name: "pikachu-rock-star",
          version_group: {
            name: "omega-ruby-alpha-sapphire",
            url: "https://pokeapi.co/api/v2/version-group/16/",
          },
        });
      },
    ),
    http.get("https://pokeapi.co/api/v2/version-group/16/", () => {
      return HttpResponse.json({
        name: "omega-ruby-alpha-sapphire",
        versions: [
          {
            name: "omega-ruby",
            url: "https://pokeapi.co/api/v2/version/15/",
          },
        ],
      });
    }),
    http.get("https://pokeapi.co/api/v2/evolution-chain/10/", () => {
      return HttpResponse.json(pikachuEvolutionChain);
    }),
  );
  const queryClient = createResourceQueryClient();
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

function createResourceQueryClient() {
  return {
    fetchQuery: <TData>(resourceOptions: { queryFn?: unknown }) => {
      return executeQuery<TData>(resourceOptions);
    },
  };
}

function setupNinetalesDetailResources({
  includeAlola,
  includeFormDescription = includeAlola,
  includeVersionGroupFlavor = false,
}: {
  includeAlola: boolean;
  includeFormDescription?: boolean;
  includeVersionGroupFlavor?: boolean;
}) {
  server.use(
    http.get("https://pokeapi.co/api/v2/pokemon-species/38/", () => {
      return HttpResponse.json({
        ...pikachuSpecies,
        form_descriptions: includeFormDescription
          ? [
              {
                description: "This form lives on snowy mountains.",
                language: { name: "en", url: "" },
              },
            ]
          : [],
        flavor_text_entries: [
          ...pikachuSpecies.flavor_text_entries,
          ...(includeVersionGroupFlavor
            ? [
                {
                  flavor_text: "Alolan Ninetales protects snowy peaks.",
                  language: { name: "en", url: "" },
                  version: {
                    name: "moon",
                    url: "https://pokeapi.co/api/v2/version/18/",
                  },
                },
              ]
            : []),
        ],
        id: 38,
        name: "ninetales",
        names: [{ language: { name: "en", url: "" }, name: "Ninetales" }],
        varieties: ninetalesVarieties(includeAlola),
      });
    }),
    http.get("https://pokeapi.co/api/v2/pokemon/38/", () => {
      return HttpResponse.json({ ...pikachuPokemon, name: "ninetales" });
    }),
    http.get("https://pokeapi.co/api/v2/pokemon/ninetales-alola/", () => {
      return HttpResponse.json({ ...pikachuPokemon, name: "ninetales-alola" });
    }),
    http.get("https://pokeapi.co/api/v2/pokemon-form/ninetales-alola/", () => {
      return HttpResponse.json({
        name: "ninetales-alola",
        version_group: {
          name: "sun-moon",
          url: "https://pokeapi.co/api/v2/version-group/17/",
        },
      });
    }),
    http.get("https://pokeapi.co/api/v2/version-group/17/", () => {
      return HttpResponse.json({
        name: "sun-moon",
        versions: [
          {
            name: includeVersionGroupFlavor ? "moon" : "ultra-sun",
            url: "https://pokeapi.co/api/v2/version/18/",
          },
        ],
      });
    }),
    http.get("https://pokeapi.co/api/v2/evolution-chain/10/", () => {
      return HttpResponse.json(pikachuEvolutionChain);
    }),
  );
}

function ninetalesVarieties(includeAlola: boolean) {
  return [
    {
      is_default: true,
      pokemon: {
        name: "ninetales",
        url: "https://pokeapi.co/api/v2/pokemon/38/",
      },
    },
    ...(includeAlola
      ? [
          {
            is_default: false,
            pokemon: {
              name: "ninetales-alola",
              url: "https://pokeapi.co/api/v2/pokemon/ninetales-alola/",
            },
          },
        ]
      : []),
  ];
}

function setupRaichuDetailResources() {
  server.use(
    http.get("https://pokeapi.co/api/v2/pokemon-species/26/", () => {
      return HttpResponse.json({
        ...pikachuSpecies,
        id: 26,
        name: "raichu",
        names: [{ language: { name: "en", url: "" }, name: "Raichu" }],
        varieties: [
          {
            is_default: true,
            pokemon: {
              name: "raichu",
              url: "https://pokeapi.co/api/v2/pokemon/26/",
            },
          },
          {
            is_default: false,
            pokemon: {
              name: "raichu-alola",
              url: "https://pokeapi.co/api/v2/pokemon/raichu-alola/",
            },
          },
        ],
      });
    }),
    http.get("https://pokeapi.co/api/v2/pokemon/26/", () => {
      return HttpResponse.json({ ...pikachuPokemon, name: "raichu" });
    }),
    http.get("https://pokeapi.co/api/v2/pokemon-form/raichu-alola/", () => {
      return HttpResponse.json({
        name: "raichu-alola",
        version_group: {
          name: "sun-moon",
          url: "https://pokeapi.co/api/v2/version-group/17/",
        },
      });
    }),
    http.get("https://pokeapi.co/api/v2/version-group/17/", () => {
      return HttpResponse.json({
        name: "sun-moon",
        versions: [
          {
            name: "moon",
            url: "https://pokeapi.co/api/v2/version/18/",
          },
        ],
      });
    }),
    http.get("https://pokeapi.co/api/v2/evolution-chain/10/", () => {
      return HttpResponse.json(pikachuEvolutionChain);
    }),
  );
}

async function loadNinetalesWithCarriedAlolaForm(): Promise<PokemonDetail> {
  return (await executeQuery(
    pokemonDetailQueryOptions(
      ninetalesIndexEntry,
      createResourceQueryClient(),
      carriedVulpixAlolaForm,
    ),
  )) as PokemonDetail;
}

async function loadDefaultNinetales(): Promise<PokemonDetail> {
  return (await executeQuery(
    pokemonDetailQueryOptions(ninetalesIndexEntry, createResourceQueryClient()),
  )) as PokemonDetail;
}
