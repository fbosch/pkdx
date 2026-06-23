import type {
  PokeApiAbility,
  PokeApiPokemon,
  PokeApiPokemonSpecies,
} from "../../src/pokeapi/schema";

const languageEnglish = {
  name: "en",
  url: "https://pokeapi.co/api/v2/language/9/",
};

export const pikachuSpecies: PokeApiPokemonSpecies = {
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
