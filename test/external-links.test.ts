import { expect, test } from "bun:test";
import {
  pokemonDbAbilityUrl,
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
