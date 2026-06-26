import type {
  PokeApiAbility,
  PokeApiEvolutionChain,
  PokeApiPokemon,
  PokeApiPokemonSpecies,
} from "../../src/pokeapi/schema";

const languageEnglish = {
  name: "en",
  url: "https://pokeapi.co/api/v2/language/9/",
};

export const pikachuSpecies: PokeApiPokemonSpecies = {
  egg_groups: [
    {
      name: "field",
      url: "https://pokeapi.co/api/v2/egg-group/5/",
    },
    {
      name: "fairy",
      url: "https://pokeapi.co/api/v2/egg-group/6/",
    },
  ],
  evolution_chain: {
    url: "https://pokeapi.co/api/v2/evolution-chain/10/",
  },
  flavor_text_entries: [
    {
      flavor_text:
        "When several of these POKéMON\ngather, their electricity can\fbuild and cause lightning storms.",
      language: languageEnglish,
      version: {
        name: "red",
        url: "https://pokeapi.co/api/v2/version/1/",
      },
    },
    {
      flavor_text: "Japanese text should not be selected.",
      language: {
        name: "ja",
        url: "https://pokeapi.co/api/v2/language/11/",
      },
      version: {
        name: "red",
        url: "https://pokeapi.co/api/v2/version/1/",
      },
    },
  ],
  gender_rate: 4,
  genera: [
    {
      genus: "Mouse Pokémon",
      language: languageEnglish,
    },
  ],
  id: 25,
  name: "pikachu",
  names: [
    {
      language: languageEnglish,
      name: "Pikachu",
    },
  ],
  varieties: [
    {
      is_default: true,
      pokemon: {
        name: "pikachu",
        url: "https://pokeapi.co/api/v2/pokemon/25/",
      },
    },
    {
      is_default: false,
      pokemon: {
        name: "pikachu-rock-star",
        url: "https://pokeapi.co/api/v2/pokemon/pikachu-rock-star/",
      },
    },
  ],
};

export const pikachuPokemon: PokeApiPokemon = {
  abilities: [
    {
      ability: {
        name: "static",
        url: "https://pokeapi.co/api/v2/ability/9/",
      },
      is_hidden: false,
      slot: 1,
    },
    {
      ability: {
        name: "lightning-rod",
        url: "https://pokeapi.co/api/v2/ability/31/",
      },
      is_hidden: true,
      slot: 3,
    },
  ],
  height: 4,
  name: "pikachu",
  species: {
    name: "pikachu",
    url: "https://pokeapi.co/api/v2/pokemon-species/25/",
  },
  stats: [
    statEntry("hp", 35, 1),
    statEntry("attack", 55, 2),
    statEntry("defense", 40, 3),
    statEntry("special-attack", 50, 4),
    statEntry("special-defense", 50, 5),
    statEntry("speed", 90, 6),
  ],
  types: [
    {
      slot: 1,
      type: {
        name: "electric",
        url: "https://pokeapi.co/api/v2/type/13/",
      },
    },
  ],
  weight: 60,
};

export const pikachuEvolutionChain: PokeApiEvolutionChain = {
  chain: {
    evolution_details: [],
    evolves_to: [
      {
        evolution_details: [
          {
            min_happiness: 220,
            trigger: {
              name: "level-up",
              url: "https://pokeapi.co/api/v2/evolution-trigger/1/",
            },
          },
        ],
        evolves_to: [
          {
            evolution_details: [
              {
                item: {
                  name: "thunder-stone",
                  url: "https://pokeapi.co/api/v2/item/83/",
                },
                trigger: {
                  name: "use-item",
                  url: "https://pokeapi.co/api/v2/evolution-trigger/3/",
                },
              },
            ],
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
    ],
    species: {
      name: "pichu",
      url: "https://pokeapi.co/api/v2/pokemon-species/172/",
    },
  },
  id: 10,
};

export const pikachuRockStarPokemon: PokeApiPokemon = {
  ...pikachuPokemon,
  name: "pikachu-rock-star",
};

export const charizardSpecies: PokeApiPokemonSpecies = {
  ...pikachuSpecies,
  id: 6,
  name: "charizard",
  names: [
    {
      language: languageEnglish,
      name: "Charizard",
    },
  ],
  varieties: [
    {
      is_default: true,
      pokemon: {
        name: "charizard",
        url: "https://pokeapi.co/api/v2/pokemon/6/",
      },
    },
    {
      is_default: false,
      pokemon: {
        name: "charizard-mega-x",
        url: "https://pokeapi.co/api/v2/pokemon/charizard-mega-x/",
      },
    },
    {
      is_default: false,
      pokemon: {
        name: "charizard-mega-y",
        url: "https://pokeapi.co/api/v2/pokemon/charizard-mega-y/",
      },
    },
  ],
};

export const charizardMegaXPokemon: PokeApiPokemon = {
  ...pikachuPokemon,
  height: 17,
  name: "charizard-mega-x",
  species: {
    name: "charizard",
    url: "https://pokeapi.co/api/v2/pokemon-species/6/",
  },
  types: [
    {
      slot: 1,
      type: {
        name: "fire",
        url: "https://pokeapi.co/api/v2/type/10/",
      },
    },
    {
      slot: 2,
      type: {
        name: "dragon",
        url: "https://pokeapi.co/api/v2/type/16/",
      },
    },
  ],
  weight: 1105,
};

export const staticAbility: PokeApiAbility = {
  effect_entries: [
    {
      effect: "This Pokémon has a chance of paralyzing attackers on contact.",
      language: languageEnglish,
      short_effect: "May paralyze attackers on contact.",
    },
  ],
  flavor_text_entries: [
    {
      flavor_text: "Contact may paralyze the attacker.",
      language: languageEnglish,
      version_group: {
        name: "sword-shield",
        url: "https://pokeapi.co/api/v2/version-group/20/",
      },
    },
  ],
  id: 9,
  name: "static",
};

function statEntry(name: string, baseStat: number, id: number) {
  return {
    base_stat: baseStat,
    stat: {
      name,
      url: `https://pokeapi.co/api/v2/stat/${id}/`,
    },
  };
}
