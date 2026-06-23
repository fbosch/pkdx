import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { pokeApiResourceQueryOptions } from "./pokeapi";
import type {
  PokeApiAbility,
  PokeApiPokemon,
  PokeApiPokemonSpecies,
} from "./pokeapi/schema";
import {
  parseAbilityResource,
  parsePokemonResource,
  parsePokemonSpeciesResource,
} from "./pokeapi/schema";
import { queryCachePolicies } from "./query-cache";
import type { SpeciesIndexEntry } from "./search";
import { calculateDamageTaken, type DamageTaken } from "./type-matchups";

type ResourceQueryClient = Pick<QueryClient, "fetchQuery">;

export type PokemonDetail = {
  abilities: PokemonAbility[];
  damageTaken: DamageTaken;
  dexNumber: number;
  eggGroups: string[];
  flavorText: string;
  genderRatio: PokemonGenderRatio;
  heightMeters: number;
  name: string;
  species: string;
  sprite: PokemonSpriteReference;
  stats: PokemonStat[];
  types: string[];
  weightKilograms: number;
};

export type PokemonAbility = {
  isHidden: boolean;
  name: string;
  url?: string;
};

export type PokemonAbilityDetail = {
  effect: string;
  name: string;
  shortEffect: string;
};

export type PokemonGenderRatio =
  | { kind: "genderless" }
  | { femalePercent: number; kind: "gendered"; malePercent: number };

export type PokemonStat = {
  base: number;
  name: string;
};

export type PokemonSpriteReference = {
  kind: "placeholder";
  label: string;
};

type PokemonDetailQueryKey = readonly ["pokemon-detail", speciesSlug: string];
type PokemonAbilityDetailsQueryKey = readonly [
  "pokemon-ability-details",
  abilityUrls: readonly string[],
];

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

export function pokemonAbilityDetailsQueryOptions(
  abilities: readonly PokemonAbility[],
  queryClient: ResourceQueryClient,
) {
  return queryOptions({
    queryKey: pokemonAbilityDetailsQueryKey(abilities),
    queryFn: async () => {
      const resources = await Promise.all(
        abilities.map((ability) =>
          queryClient.fetchQuery(
            pokeApiResourceQueryOptions({
              parse: parseAbilityResource,
              url: getAbilityResourceUrl(ability),
            }),
          ),
        ),
      );

      return resources.map(buildPokemonAbilityDetail);
    },
    ...queryCachePolicies.pokemonDetail,
  });
}

function pokemonAbilityDetailsQueryKey(
  abilities: readonly PokemonAbility[],
): PokemonAbilityDetailsQueryKey {
  return [
    "pokemon-ability-details",
    abilities.map((ability) => getAbilityResourceUrl(ability)),
  ];
}

function getAbilityResourceUrl(ability: PokemonAbility): string {
  return ability.url ?? `ability/${slugifyResourceName(ability.name)}`;
}

export function buildDefaultPokemonDetail(
  species: SpeciesIndexEntry,
  speciesResource: PokeApiPokemonSpecies,
  pokemonResource: PokeApiPokemon,
): PokemonDetail {
  const types = pokemonResource.types
    .toSorted((left, right) => left.slot - right.slot)
    .map((entry) => formatResourceName(entry.type.name));

  return {
    abilities: pokemonResource.abilities
      .toSorted((left, right) => left.slot - right.slot)
      .map((entry) => ({
        isHidden: entry.is_hidden,
        name: formatResourceName(entry.ability.name),
        url: entry.ability.url,
      })),
    dexNumber: species.dexNumber,
    damageTaken: calculateDamageTaken(types),
    eggGroups: speciesResource.egg_groups.map((eggGroup) =>
      formatResourceName(eggGroup.name),
    ),
    flavorText: selectFlavorText(speciesResource),
    genderRatio: formatGenderRatio(speciesResource.gender_rate),
    heightMeters: pokemonResource.height / 10,
    name: getEnglishSpeciesName(speciesResource) ?? species.name,
    species: getEnglishGenus(speciesResource) ?? "Unknown Pokemon",
    sprite: {
      kind: "placeholder",
      label: `${species.slug} sprite pending`,
    },
    stats: pokemonResource.stats.map((entry) => ({
      base: entry.base_stat,
      name: formatStatName(entry.stat.name),
    })),
    types,
    weightKilograms: pokemonResource.weight / 10,
  };
}

export function buildPokemonAbilityDetail(
  abilityResource: PokeApiAbility,
): PokemonAbilityDetail {
  const englishEffect = abilityResource.effect_entries.find(
    (entry) => entry.language.name === "en",
  );
  const englishFlavor = abilityResource.flavor_text_entries.find(
    (entry) => entry.language.name === "en",
  );

  return {
    effect: normalizeFlavorText(
      englishEffect?.effect ??
        englishFlavor?.flavor_text ??
        "No ability description available.",
    ),
    name: formatResourceName(abilityResource.name),
    shortEffect: normalizeFlavorText(
      englishEffect?.short_effect ??
        englishFlavor?.flavor_text ??
        "No short ability description available.",
    ),
  };
}

function getEnglishGenus(
  speciesResource: PokeApiPokemonSpecies,
): string | undefined {
  return speciesResource.genera.find((entry) => entry.language.name === "en")
    ?.genus;
}

function formatGenderRatio(genderRate: number): PokemonGenderRatio {
  if (genderRate === -1) {
    return { kind: "genderless" };
  }

  const femalePercent = (genderRate / 8) * 100;
  const malePercent = 100 - femalePercent;

  return { femalePercent, kind: "gendered", malePercent };
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

function slugifyResourceName(value: string): string {
  return value.toLowerCase().replaceAll(" ", "-");
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
