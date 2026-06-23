import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { pokeApiResourceQueryOptions } from "./pokeapi";
import type { PokeApiPokemon, PokeApiPokemonSpecies } from "./pokeapi/schema";
import {
  parsePokemonResource,
  parsePokemonSpeciesResource,
} from "./pokeapi/schema";
import { queryCachePolicies } from "./query-cache";
import type { SpeciesIndexEntry } from "./search";

type ResourceQueryClient = Pick<QueryClient, "fetchQuery">;

export type PokemonDetail = {
  abilities: PokemonAbility[];
  dexNumber: number;
  flavorText: string;
  heightMeters: number;
  name: string;
  sprite: PokemonSpriteReference;
  stats: PokemonStat[];
  types: string[];
  weightKilograms: number;
};

export type PokemonAbility = {
  isHidden: boolean;
  name: string;
};

export type PokemonStat = {
  base: number;
  name: string;
};

export type PokemonSpriteReference = {
  kind: "placeholder";
  label: string;
};

type PokemonDetailQueryKey = readonly ["pokemon-detail", speciesSlug: string];

export function pokemonDetailQueryKey(
  species: SpeciesIndexEntry,
): PokemonDetailQueryKey {
  return ["pokemon-detail", species.slug];
}

export function pokemonDetailQueryOptions(
  species: SpeciesIndexEntry,
  queryClient: ResourceQueryClient,
) {
  return queryOptions({
    queryKey: pokemonDetailQueryKey(species),
    queryFn: async () => {
      const speciesResource = await queryClient.fetchQuery(
        pokeApiResourceQueryOptions({
          parse: parsePokemonSpeciesResource,
          url: `pokemon-species/${species.dexNumber}`,
        }),
      );
      const pokemonResource = await queryClient.fetchQuery(
        pokeApiResourceQueryOptions({
          parse: parsePokemonResource,
          url: getDefaultPokemonUrl(speciesResource),
        }),
      );

      return buildDefaultPokemonDetail(
        species,
        speciesResource,
        pokemonResource,
      );
    },
    ...queryCachePolicies.pokemonDetail,
  });
}

export function buildDefaultPokemonDetail(
  species: SpeciesIndexEntry,
  speciesResource: PokeApiPokemonSpecies,
  pokemonResource: PokeApiPokemon,
): PokemonDetail {
  return {
    abilities: pokemonResource.abilities
      .toSorted((left, right) => left.slot - right.slot)
      .map((entry) => ({
        isHidden: entry.is_hidden,
        name: formatResourceName(entry.ability.name),
      })),
    dexNumber: species.dexNumber,
    flavorText: selectFlavorText(speciesResource),
    heightMeters: pokemonResource.height / 10,
    name: getEnglishSpeciesName(speciesResource) ?? species.name,
    sprite: {
      kind: "placeholder",
      label: `${species.slug} sprite pending`,
    },
    stats: pokemonResource.stats.map((entry) => ({
      base: entry.base_stat,
      name: formatStatName(entry.stat.name),
    })),
    types: pokemonResource.types
      .toSorted((left, right) => left.slot - right.slot)
      .map((entry) => formatResourceName(entry.type.name)),
    weightKilograms: pokemonResource.weight / 10,
  };
}

function getDefaultPokemonUrl(speciesResource: PokeApiPokemonSpecies): string {
  const defaultVariety = speciesResource.varieties.find(
    (variety) => variety.is_default,
  );

  if (defaultVariety === undefined) {
    throw new Error(
      `PokeAPI species ${speciesResource.name} has no default variety`,
    );
  }

  return defaultVariety.pokemon.url;
}

function getEnglishSpeciesName(
  speciesResource: PokeApiPokemonSpecies,
): string | undefined {
  return speciesResource.names.find((entry) => entry.language.name === "en")
    ?.name;
}

function selectFlavorText(speciesResource: PokeApiPokemonSpecies): string {
  const englishEntries = speciesResource.flavor_text_entries.filter(
    (entry) => entry.language.name === "en",
  );
  const selectedEntry = englishEntries.toSorted((left, right) =>
    left.version.name.localeCompare(right.version.name),
  )[0];

  return selectedEntry === undefined
    ? "No flavor text available."
    : normalizeFlavorText(selectedEntry.flavor_text);
}

function normalizeFlavorText(value: string): string {
  return value
    .replaceAll("\f", " ")
    .replaceAll("\n", " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function formatResourceName(value: string): string {
  return value
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function formatStatName(value: string): string {
  const labels: Record<string, string> = {
    attack: "Attack",
    defense: "Defense",
    hp: "HP",
    "special-attack": "Sp. Attack",
    "special-defense": "Sp. Defense",
    speed: "Speed",
  };

  return labels[value] ?? formatResourceName(value);
}
