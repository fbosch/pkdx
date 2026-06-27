import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { pokeApiResourceQueryOptions } from "./pokeapi";
import type {
  PokeApiAbility,
  PokeApiEvolutionChain,
  PokeApiEvolutionDetail,
  PokeApiPokemon,
  PokeApiPokemonSpecies,
  PokeApiVersionGroup,
} from "./pokeapi/schema";
import {
  parseEvolutionChainResource,
  parseAbilityResource,
  parsePokemonFormResource,
  parsePokemonResource,
  parsePokemonSpeciesResource,
  parseVersionGroupResource,
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
  evolutionChain: PokemonEvolutionChain;
  flavorText: string;
  flavorTexts: PokemonFlavorText[];
  form: PokemonForm;
  forms: PokemonForm[];
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

export type PokemonEvolutionChain = {
  root: PokemonEvolution;
};

export type PokemonEvolution = {
  evolvesTo: PokemonEvolution[];
  method: string | undefined;
  name: string;
  url?: string;
};

export type PokemonFlavorText = {
  source: string;
  text: string;
};

export type PokemonForm = {
  displayName: string;
  isDefault: boolean;
  pokemonName: string;
  pokemonUrl: string;
  spriteFormKey: string;
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

type PokemonDetailQueryKey = readonly [
  "pokemon-detail",
  speciesSlug: string,
  formKey: string,
];
type PokemonAbilityDetailsQueryKey = readonly [
  "pokemon-ability-details",
  abilityUrls: readonly string[],
];

const formattedResourceNames = new Map<string, string>();
const normalizedFlavorTexts = new Map<string, string>();
const pokemonEvolutionChains = new WeakMap<
  PokeApiEvolutionChain,
  PokemonEvolutionChain
>();

export function pokemonDetailQueryKey(
  species: SpeciesIndexEntry,
  form?: PokemonForm,
): PokemonDetailQueryKey {
  return ["pokemon-detail", species.slug, pokemonFormTargetKey(form)];
}

export function pokemonDetailQueryOptions(
  species: SpeciesIndexEntry,
  queryClient: ResourceQueryClient,
  form?: PokemonForm,
) {
  return queryOptions({
    queryKey: pokemonDetailQueryKey(species, form),
    queryFn: async () => {
      const speciesResource = await queryClient.fetchQuery(
        pokeApiResourceQueryOptions({
          parse: parsePokemonSpeciesResource,
          url: `pokemon-species/${species.dexNumber}`,
        }),
      );
      const forms = buildPokemonForms(species, speciesResource);
      const selectedForm = getSelectedPokemonForm(forms, species.slug, form);
      const pokemonResource = await queryClient.fetchQuery(
        pokeApiResourceQueryOptions({
          parse: parsePokemonResource,
          url: selectedForm.pokemonUrl,
        }),
      );
      const evolutionChainResource = await queryClient.fetchQuery(
        pokeApiResourceQueryOptions({
          parse: parseEvolutionChainResource,
          url: speciesResource.evolution_chain.url,
        }),
      );
      const formVersionGroup = await loadPokemonFormVersionGroup(
        selectedForm,
        queryClient,
      );
      const excludedVersionGroups = await loadExcludedFlavorTextVersionGroups(
        forms,
        selectedForm,
        queryClient,
      );

      return buildPokemonDetail(
        species,
        speciesResource,
        pokemonResource,
        evolutionChainResource,
        forms,
        selectedForm,
        formVersionGroup,
        excludedVersionGroups,
      );
    },
    ...queryCachePolicies.pokemonDetail,
  });
}

export function pokemonFormTargetKey(form: PokemonForm | undefined): string {
  if (form === undefined || form.isDefault) {
    return "$";
  }

  return form.pokemonName;
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
  evolutionChainResource: PokeApiEvolutionChain,
): PokemonDetail {
  const forms = buildPokemonForms(species, speciesResource);
  return buildPokemonDetail(
    species,
    speciesResource,
    pokemonResource,
    evolutionChainResource,
    forms,
    getSelectedPokemonForm(forms, species.slug),
  );
}

export function buildPokemonDetail(
  species: SpeciesIndexEntry,
  speciesResource: PokeApiPokemonSpecies,
  pokemonResource: PokeApiPokemon,
  evolutionChainResource: PokeApiEvolutionChain,
  forms: readonly PokemonForm[],
  form: PokemonForm,
  formVersionGroup?: PokeApiVersionGroup,
  excludedVersionGroups: readonly PokeApiVersionGroup[] = [],
): PokemonDetail {
  const types = pokemonResource.types
    .toSorted((left, right) => left.slot - right.slot)
    .map((entry) => formatResourceName(entry.type.name));
  const flavorTexts = buildFlavorTexts(
    speciesResource,
    form,
    formVersionGroup,
    excludedVersionGroups,
  );

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
    evolutionChain: buildPokemonEvolutionChain(evolutionChainResource),
    flavorText: flavorTexts[0]?.text ?? "No flavor text available.",
    flavorTexts,
    form,
    forms: [...forms],
    genderRatio: formatGenderRatio(speciesResource.gender_rate),
    heightMeters: pokemonResource.height / 10,
    name: form.isDefault
      ? (getEnglishSpeciesName(speciesResource) ?? species.name)
      : formatResourceName(pokemonResource.name),
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

export function buildPokemonForms(
  species: SpeciesIndexEntry,
  speciesResource: PokeApiPokemonSpecies,
): PokemonForm[] {
  const forms = speciesResource.varieties.map((variety) => ({
    displayName: getPokemonFormDisplayName(
      species,
      variety.pokemon.name,
      variety.is_default,
    ),
    isDefault: variety.is_default,
    pokemonName: variety.pokemon.name,
    pokemonUrl: variety.pokemon.url,
    spriteFormKey: getPokeSpriteFormKey(
      species.slug,
      variety.pokemon.name,
      variety.is_default,
    ),
  }));

  if (forms.some((form) => form.isDefault) === false) {
    throw new Error(
      `PokeAPI species ${speciesResource.name} has no default variety`,
    );
  }

  return forms.toSorted((left, right) => {
    if (left.isDefault) {
      return -1;
    }

    if (right.isDefault) {
      return 1;
    }

    return left.displayName.localeCompare(right.displayName);
  });
}

function buildPokemonEvolutionChain(
  evolutionChainResource: PokeApiEvolutionChain,
): PokemonEvolutionChain {
  const cached = pokemonEvolutionChains.get(evolutionChainResource);
  if (cached !== undefined) {
    return cached;
  }

  const chain = { root: buildPokemonEvolution(evolutionChainResource.chain) };
  pokemonEvolutionChains.set(evolutionChainResource, chain);
  return chain;
}

function buildPokemonEvolution(
  evolution: PokeApiEvolutionChain["chain"],
): PokemonEvolution {
  return {
    evolvesTo: evolution.evolves_to.map(buildPokemonEvolution),
    method: formatEvolutionMethod(evolution.evolution_details),
    name: formatResourceName(evolution.species.name),
    url: evolution.species.url,
  };
}

function formatEvolutionMethod(
  details: readonly PokeApiEvolutionDetail[],
): string | undefined {
  const detail = details[0];
  if (detail === undefined) {
    return undefined;
  }

  const parts = [
    formatEvolutionTrigger(detail),
    formatEvolutionMinimum("Lv", detail.min_level),
    formatEvolutionResource(detail.item),
    formatEvolutionResource(detail.held_item, "hold"),
    formatEvolutionResource(detail.known_move, "knows"),
    formatEvolutionResource(detail.known_move_type, "knows", "move"),
    formatEvolutionMinimum("happiness", detail.min_happiness),
    formatEvolutionMinimum("affection", detail.min_affection),
    formatEvolutionMinimum("beauty", detail.min_beauty),
    formatEvolutionResource(detail.location, "at"),
    formatEvolutionTime(detail.time_of_day),
    detail.needs_overworld_rain === true ? "rain" : undefined,
    detail.needs_multiplayer === true ? "multiplayer" : undefined,
    detail.turn_upside_down === true ? "upside down" : undefined,
  ].filter((part) => part !== undefined);

  return parts.length === 0 ? undefined : parts.join(", ");
}

function formatEvolutionMinimum(
  label: string,
  value: number | null | undefined,
): string | undefined {
  return value === undefined || value === null
    ? undefined
    : `${label} ${value.toString()}`;
}

function formatEvolutionResource(
  resource: { name: string } | null | undefined,
  prefix?: string,
  suffix?: string,
): string | undefined {
  if (resource === undefined || resource === null) {
    return undefined;
  }

  return [prefix, formatResourceName(resource.name), suffix]
    .filter((part) => part !== undefined)
    .join(" ");
}

function formatEvolutionTime(value: string | undefined): string | undefined {
  return value === undefined || value.length === 0 ? undefined : value;
}

function formatEvolutionTrigger(detail: PokeApiEvolutionDetail): string {
  return match(detail.trigger.name)
    .with("level-up", () => "level up")
    .with("trade", () => "trade")
    .with("use-item", () => "use item")
    .otherwise(formatResourceName);
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

function getSelectedPokemonForm(
  forms: readonly PokemonForm[],
  speciesSlug: string,
  selectedForm?: PokemonForm,
): PokemonForm {
  const defaultForm = forms.find((candidate) => candidate.isDefault);
  const form =
    selectedForm === undefined
      ? defaultForm
      : (findSelectedPokemonForm(forms, speciesSlug, selectedForm) ??
        defaultForm);

  if (form === undefined) {
    throw new Error("PokeAPI species has no default variety");
  }

  return form;
}

function findSelectedPokemonForm(
  forms: readonly PokemonForm[],
  speciesSlug: string,
  selectedForm: PokemonForm,
): PokemonForm | undefined {
  return (
    forms.find(
      (candidate) => candidate.pokemonName === selectedForm.pokemonName,
    ) ??
    forms.find(
      (candidate) =>
        selectedForm.isDefault === false &&
        candidate.isDefault === false &&
        candidate.pokemonName ===
          `${speciesSlug}-${selectedForm.spriteFormKey}` &&
        candidate.spriteFormKey === selectedForm.spriteFormKey,
    )
  );
}

function getEnglishSpeciesName(
  speciesResource: PokeApiPokemonSpecies,
): string | undefined {
  return speciesResource.names.find((entry) => entry.language.name === "en")
    ?.name;
}

function buildFlavorTexts(
  speciesResource: PokeApiPokemonSpecies,
  form: PokemonForm,
  formVersionGroup?: PokeApiVersionGroup,
  excludedVersionGroups: readonly PokeApiVersionGroup[] = [],
): PokemonFlavorText[] {
  const versionGroupTexts = buildVersionGroupFlavorTexts(
    speciesResource,
    formVersionGroup,
  );
  if (versionGroupTexts.length > 0) {
    return versionGroupTexts;
  }

  if (form.isDefault === false) {
    const formDescriptions = buildFormDescriptionTexts(speciesResource);
    if (formDescriptions.length > 0) {
      return formDescriptions;
    }
  }

  const excludedVersionNames = new Set(
    excludedVersionGroups.flatMap((versionGroup) =>
      versionGroup.versions.map((version) => version.name),
    ),
  );
  const entries = speciesResource.flavor_text_entries
    .filter(
      (entry) =>
        entry.language.name === "en" &&
        excludedVersionNames.has(entry.version.name) === false,
    )
    .toSorted((left, right) =>
      left.version.name.localeCompare(right.version.name),
    );

  return entries.map((entry) => ({
    source: formatResourceName(entry.version.name),
    text: normalizeFlavorText(entry.flavor_text),
  }));
}

async function loadPokemonFormVersionGroup(
  form: PokemonForm,
  queryClient: ResourceQueryClient,
): Promise<PokeApiVersionGroup | undefined> {
  if (form.isDefault) {
    return undefined;
  }

  const formResource = await queryClient.fetchQuery(
    pokeApiResourceQueryOptions({
      parse: parsePokemonFormResource,
      url: `pokemon-form/${form.pokemonName}`,
    }),
  );

  return await queryClient.fetchQuery(
    pokeApiResourceQueryOptions({
      parse: parseVersionGroupResource,
      url: formResource.version_group.url,
    }),
  );
}

async function loadExcludedFlavorTextVersionGroups(
  forms: readonly PokemonForm[],
  selectedForm: PokemonForm,
  queryClient: ResourceQueryClient,
): Promise<PokeApiVersionGroup[]> {
  if (selectedForm.isDefault === false) {
    return [];
  }

  return await Promise.all(
    forms
      .filter((form) => form.isDefault === false)
      .map((form) => loadPokemonFormVersionGroup(form, queryClient)),
  ).then((versionGroups) =>
    versionGroups.filter((versionGroup) => versionGroup !== undefined),
  );
}

function buildVersionGroupFlavorTexts(
  speciesResource: PokeApiPokemonSpecies,
  versionGroup: PokeApiVersionGroup | undefined,
): PokemonFlavorText[] {
  if (versionGroup === undefined) {
    return [];
  }

  const versionNames = new Set(
    versionGroup.versions.map((version) => version.name),
  );

  return speciesResource.flavor_text_entries
    .filter(
      (entry) =>
        entry.language.name === "en" && versionNames.has(entry.version.name),
    )
    .toSorted((left, right) =>
      left.version.name.localeCompare(right.version.name),
    )
    .map((entry) => ({
      source: formatResourceName(entry.version.name),
      text: normalizeFlavorText(entry.flavor_text),
    }));
}

function buildFormDescriptionTexts(
  speciesResource: PokeApiPokemonSpecies,
): PokemonFlavorText[] {
  return speciesResource.form_descriptions
    .filter(
      (entry) =>
        entry.language.name === "en" && entry.description !== undefined,
    )
    .map((entry) => ({
      source: "Form",
      text: normalizeFlavorText(entry.description ?? ""),
    }));
}

function normalizeFlavorText(value: string): string {
  const cached = normalizedFlavorTexts.get(value);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = value
    .replaceAll("\f", " ")
    .replaceAll("\n", " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  normalizedFlavorTexts.set(value, normalized);
  return normalized;
}

function formatResourceName(value: string): string {
  const cached = formattedResourceNames.get(value);
  if (cached !== undefined) {
    return cached;
  }

  const formatted = value
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
  formattedResourceNames.set(value, formatted);
  return formatted;
}

function getPokemonFormDisplayName(
  species: SpeciesIndexEntry,
  pokemonName: string,
  isDefault: boolean,
): string {
  if (isDefault) {
    return `${species.name} (Default)`;
  }

  return formatResourceName(pokemonName);
}

function getPokeSpriteFormKey(
  speciesSlug: string,
  pokemonName: string,
  isDefault: boolean,
): string {
  if (isDefault) {
    return "$";
  }

  return pokemonName.startsWith(`${speciesSlug}-`)
    ? pokemonName.slice(speciesSlug.length + 1)
    : pokemonName;
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
