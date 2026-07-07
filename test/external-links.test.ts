import { expect, test } from "bun:test";
import {
  pokemonDbAbilityUrl,
  pokemonDbEggGroupUrl,
  pokemonDbPokedexUrl,
} from "../src/external-links";

test("builds PokemonDB Pokedex URLs from species slugs", () => {
  expect(pokemonDbPokedexUrl({ slug: "vulpix" })).toBe(
    "https://pokemondb.net/pokedex/vulpix",
  );
  expect(pokemonDbPokedexUrl({ slug: "mr-mime" })).toBe(
    "https://pokemondb.net/pokedex/mr-mime",
  );
});

test("builds PokemonDB ability URLs from ability names", () => {
  expect(pokemonDbAbilityUrl({ name: "Natural Cure" })).toBe(
    "https://pokemondb.net/ability/natural-cure",
  );
  expect(pokemonDbAbilityUrl({ name: "Lightning Rod" })).toBe(
    "https://pokemondb.net/ability/lightning-rod",
  );
});

test("builds PokemonDB egg group URLs from egg group names", () => {
  expect(pokemonDbEggGroupUrl({ name: "Field" })).toBe(
    "https://pokemondb.net/egg-group/field",
  );
  expect(pokemonDbEggGroupUrl({ name: "Water 1" })).toBe(
    "https://pokemondb.net/egg-group/water-1",
  );
  expect(pokemonDbEggGroupUrl({ name: "No Eggs" })).toBe(
    "https://pokemondb.net/egg-group/undiscovered",
  );
});
