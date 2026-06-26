import { expect, test } from "bun:test";
import {
  parseAbilityResource,
  parseEvolutionChainResource,
  parsePokemonResource,
  parsePokemonSpeciesResource,
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
});

test("parses consumed Pokemon Species fields", () => {
  expect(
    parsePokemonSpeciesResource({ ...pikachuSpecies, unused: true }),
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
  expect(
    parseEvolutionChainResource({
      id: 10,
      chain: {
        evolution_details: [],
        evolves_to: [
          {
            evolution_details: [
              {
                min_level: 22,
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
    }),
  ).toMatchObject({
    id: 10,
    chain: {
      species: {
        name: "pikachu",
      },
    },
  });
});
