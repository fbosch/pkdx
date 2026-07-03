import { expect, test } from "bun:test";
import {
  evolutionChainResourceSchema,
  parseAbilityResource,
  parseEvolutionChainResource,
  parsePokemonResource,
  parsePokemonSpeciesResource,
  pokemonResourceSchema,
  pokemonSpeciesResourceSchema,
} from "../src/pokeapi/schema";
import {
  pikachuPokemon,
  pikachuSpecies,
  staticAbility,
} from "./support/pokeapi-fixtures";

test("parses consumed Pokemon resource fields", () => {
  expect(parsePokemonResource({ ...pikachuPokemon, unused: true })).toEqual(
    pikachuPokemon,
  );
  expect(
    pokemonResourceSchema.parse({ ...pikachuPokemon, unused: true }),
  ).toEqual(pikachuPokemon);
});

test("parses consumed Pokemon Species fields", () => {
  expect(
    parsePokemonSpeciesResource({ ...pikachuSpecies, unused: true }),
  ).toEqual(pikachuSpecies);
  expect(
    pokemonSpeciesResourceSchema.parse({ ...pikachuSpecies, unused: true }),
  ).toEqual(pikachuSpecies);
});

test("parses consumed Ability fields", () => {
  expect(parseAbilityResource({ ...staticAbility, unused: true })).toEqual(
    staticAbility,
  );
});

test("rejects invalid consumed Pokemon fields", () => {
  expect(() =>
    parsePokemonResource({
      ...pikachuPokemon,
      height: "not-a-number",
    }),
  ).toThrow();
});

test("parses consumed Evolution Chain fields", () => {
  const resource = {
    id: 10,
    chain: {
      evolution_details: [],
      evolves_to: [
        {
          evolution_details: [
            {
              gender: 1,
              min_level: 22,
              trade_species: {
                name: "karrablast",
                url: "https://pokeapi.co/api/v2/pokemon-species/588/",
              },
              trigger: {
                name: "level-up",
                url: "https://pokeapi.co/api/v2/evolution-trigger/1/",
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
  };

  expect(parseEvolutionChainResource(resource)).toMatchObject({
    id: 10,
    chain: {
      evolves_to: [
        {
          evolution_details: [
            {
              trade_species: {
                name: "karrablast",
              },
            },
          ],
        },
      ],
      species: {
        name: "pikachu",
      },
    },
  });
  expect(evolutionChainResourceSchema.parse(resource)).toMatchObject({
    id: 10,
    chain: {
      species: {
        name: "pikachu",
      },
    },
  });
});
