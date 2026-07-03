import type { components } from "./generated";
import { z } from "zod";

type GeneratedPokemon = components["schemas"]["PokemonDetail"];
type GeneratedSpecies = components["schemas"]["PokemonSpeciesDetail"];
type GeneratedPokemonForm = components["schemas"]["PokemonFormDetail"];
type GeneratedVersionGroup = components["schemas"]["VersionGroupDetail"];
type GeneratedAbility = components["schemas"]["AbilityDetail"];
type GeneratedEvolutionChain = components["schemas"]["EvolutionChainDetail"];
type GeneratedPokemonAbility = GeneratedPokemon["abilities"][number];
type GeneratedPokemonType = GeneratedPokemon["types"][number];
type GeneratedEvolutionChainSpecies =
  GeneratedEvolutionChain["chain"]["species"];
type GeneratedFormDescription = GeneratedSpecies["form_descriptions"][number];
type PokeApiNamedResource = { name: string; url: string };

export type PokeApiPokemon = {
  abilities: Pick<GeneratedPokemonAbility, "ability" | "is_hidden" | "slot">[];
  height: number;
  name: GeneratedPokemon["name"];
  species: GeneratedPokemon["species"];
  stats: {
    base_stat: number;
    effort: number;
    stat: PokeApiNamedResource;
  }[];
  types: Pick<GeneratedPokemonType, "slot" | "type">[];
  weight: number;
};

export type PokeApiPokemonSpecies = Pick<
  GeneratedSpecies,
  | "evolution_chain"
  | "egg_groups"
  | "flavor_text_entries"
  | "genera"
  | "id"
  | "name"
  | "names"
  | "varieties"
> & {
  capture_rate: number;
  form_descriptions: ({ description?: string | undefined } & Pick<
    GeneratedFormDescription,
    "language"
  >)[];
  gender_rate: number;
  generation: PokeApiNamedResource;
  growth_rate: PokeApiNamedResource;
};

export type PokeApiPokemonForm = Pick<
  GeneratedPokemonForm,
  "name" | "version_group"
>;

export type PokeApiVersionGroup = Pick<
  GeneratedVersionGroup,
  "name" | "versions"
>;

export type PokeApiAbility = Pick<
  GeneratedAbility,
  "effect_entries" | "flavor_text_entries" | "id" | "name"
>;

type PokeApiEvolutionChainNode = {
  evolution_details: PokeApiEvolutionDetail[];
  evolves_to: PokeApiEvolutionChainNode[];
  species: GeneratedEvolutionChainSpecies;
};

export type PokeApiEvolutionDetail = {
  base_form?: { name: string; url: string } | null | undefined;
  evolved_form?: { name: string; url: string } | null | undefined;
  gender?: number | null | undefined;
  held_item?: { name: string; url: string } | null | undefined;
  item?: { name: string; url: string } | null | undefined;
  known_move?: { name: string; url: string } | null | undefined;
  known_move_type?: { name: string; url: string } | null | undefined;
  location?: { name: string; url: string } | null | undefined;
  min_affection?: number | null | undefined;
  min_beauty?: number | null | undefined;
  min_happiness?: number | null | undefined;
  min_level?: number | null | undefined;
  needs_multiplayer?: boolean | null | undefined;
  needs_overworld_rain?: boolean | null | undefined;
  time_of_day?: string | undefined;
  trade_species?: { name: string; url: string } | null | undefined;
  trigger: { name: string; url: string };
  turn_upside_down?: boolean | null | undefined;
};

export type PokeApiEvolutionChain = {
  chain: PokeApiEvolutionChainNode;
  id: GeneratedEvolutionChain["id"];
};

const namedResourceSchema = z.object({
  name: z.string(),
  url: z.string(),
});

const pokemonTypeSchema = z.object({
  slot: z.number(),
  type: namedResourceSchema,
});

const pokemonAbilitySchema = z.object({
  ability: namedResourceSchema,
  is_hidden: z.boolean(),
  slot: z.number(),
});

const pokemonStatSchema = z.object({
  base_stat: z.number(),
  effort: z.number(),
  stat: namedResourceSchema,
});

export const pokemonResourceSchema = z.object({
  abilities: z.array(pokemonAbilitySchema),
  height: z.number(),
  name: z.string(),
  species: namedResourceSchema,
  stats: z.array(pokemonStatSchema),
  types: z.array(pokemonTypeSchema),
  weight: z.number(),
});

export const pokemonSpeciesResourceSchema = z.object({
  capture_rate: z.number(),
  egg_groups: z.array(namedResourceSchema),
  evolution_chain: z.object({ url: z.string() }),
  form_descriptions: z.array(
    z.object({
      description: z.string().optional(),
      language: namedResourceSchema,
    }),
  ),
  flavor_text_entries: z.array(
    z.object({
      flavor_text: z.string(),
      language: namedResourceSchema,
      version: namedResourceSchema,
    }),
  ),
  gender_rate: z.number(),
  generation: namedResourceSchema,
  genera: z.array(
    z.object({
      genus: z.string(),
      language: namedResourceSchema,
    }),
  ),
  growth_rate: namedResourceSchema,
  id: z.number(),
  name: z.string(),
  names: z.array(
    z.object({
      language: namedResourceSchema,
      name: z.string(),
    }),
  ),
  varieties: z.array(
    z.object({
      is_default: z.boolean(),
      pokemon: namedResourceSchema,
    }),
  ),
});

const pokemonFormResourceSchema = z.object({
  name: z.string(),
  version_group: namedResourceSchema,
});

const versionGroupResourceSchema = z.object({
  name: z.string(),
  versions: z.array(namedResourceSchema),
});

const abilityResourceSchema = z.object({
  effect_entries: z.array(
    z.object({
      effect: z.string(),
      language: namedResourceSchema,
      short_effect: z.string(),
    }),
  ),
  flavor_text_entries: z.array(
    z.object({
      flavor_text: z.string(),
      language: namedResourceSchema,
      version_group: namedResourceSchema,
    }),
  ),
  id: z.number(),
  name: z.string(),
});

type EvolutionChainNode = {
  evolution_details: PokeApiEvolutionDetail[];
  evolves_to: EvolutionChainNode[];
  species: z.infer<typeof namedResourceSchema>;
};

const optionalNamedResourceSchema = namedResourceSchema.nullable().optional();

const evolutionDetailSchema = z.object({
  base_form: optionalNamedResourceSchema,
  evolved_form: optionalNamedResourceSchema,
  gender: z.number().nullable().optional(),
  held_item: optionalNamedResourceSchema,
  item: optionalNamedResourceSchema,
  known_move: optionalNamedResourceSchema,
  known_move_type: optionalNamedResourceSchema,
  location: optionalNamedResourceSchema,
  min_affection: z.number().nullable().optional(),
  min_beauty: z.number().nullable().optional(),
  min_happiness: z.number().nullable().optional(),
  min_level: z.number().nullable().optional(),
  needs_multiplayer: z.boolean().nullable().optional(),
  needs_overworld_rain: z.boolean().nullable().optional(),
  time_of_day: z.string().optional(),
  trade_species: optionalNamedResourceSchema,
  trigger: namedResourceSchema,
  turn_upside_down: z.boolean().nullable().optional(),
});

const evolutionChainNodeSchema: z.ZodType<EvolutionChainNode> = z.lazy(() =>
  z.object({
    evolution_details: z.array(evolutionDetailSchema),
    evolves_to: z.array(evolutionChainNodeSchema),
    species: namedResourceSchema,
  }),
);

export const evolutionChainResourceSchema = z.object({
  chain: evolutionChainNodeSchema,
  id: z.number(),
});

export const pokeApiQueryCacheSchemas = {
  ability: z.toJSONSchema(abilityResourceSchema),
  evolutionChain: z.toJSONSchema(evolutionChainResourceSchema),
  pokemon: z.toJSONSchema(pokemonResourceSchema),
  pokemonForm: z.toJSONSchema(pokemonFormResourceSchema),
  pokemonSpecies: z.toJSONSchema(pokemonSpeciesResourceSchema),
  versionGroup: z.toJSONSchema(versionGroupResourceSchema),
} as const;

export function parsePokemonResource(resource: unknown): PokeApiPokemon {
  return pokemonResourceSchema.parse(resource);
}

export function parsePokemonSpeciesResource(
  resource: unknown,
): PokeApiPokemonSpecies {
  return pokemonSpeciesResourceSchema.parse(resource);
}

export function parsePokemonFormResource(
  resource: unknown,
): PokeApiPokemonForm {
  return pokemonFormResourceSchema.parse(resource);
}

export function parseVersionGroupResource(
  resource: unknown,
): PokeApiVersionGroup {
  return versionGroupResourceSchema.parse(resource);
}

export function parseAbilityResource(resource: unknown): PokeApiAbility {
  return abilityResourceSchema.parse(resource);
}

export function parseEvolutionChainResource(
  resource: unknown,
): PokeApiEvolutionChain {
  return evolutionChainResourceSchema.parse(resource);
}
