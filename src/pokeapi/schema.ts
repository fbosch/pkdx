import type { components } from "./generated";
import { z } from "zod";

type GeneratedPokemon = components["schemas"]["PokemonDetail"];
type GeneratedSpecies = components["schemas"]["PokemonSpeciesDetail"];
type GeneratedAbility = components["schemas"]["AbilityDetail"];
type GeneratedEvolutionChain = components["schemas"]["EvolutionChainDetail"];
type GeneratedPokemonAbility = GeneratedPokemon["abilities"][number];
type GeneratedPokemonStat = GeneratedPokemon["stats"][number];
type GeneratedPokemonType = GeneratedPokemon["types"][number];
type GeneratedEvolutionChainSpecies =
  GeneratedEvolutionChain["chain"]["species"];

export type PokeApiPokemon = {
  abilities: Pick<GeneratedPokemonAbility, "ability" | "is_hidden" | "slot">[];
  height: number;
  name: GeneratedPokemon["name"];
  species: GeneratedPokemon["species"];
  stats: Pick<GeneratedPokemonStat, "base_stat" | "stat">[];
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
> & { gender_rate: number };

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
  gender?: string | null;
  held_item?: { name: string; url: string } | null;
  item?: { name: string; url: string } | null;
  known_move?: { name: string; url: string } | null;
  known_move_type?: { name: string; url: string } | null;
  location?: { name: string; url: string } | null;
  min_affection?: number | null;
  min_beauty?: number | null;
  min_happiness?: number | null;
  min_level?: number | null;
  needs_multiplayer?: boolean | null;
  needs_overworld_rain?: boolean | null;
  time_of_day?: string;
  trade_species?: string | null;
  trigger: { name: string; url: string };
  turn_upside_down?: boolean | null;
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
  egg_groups: z.array(namedResourceSchema),
  evolution_chain: z.object({ url: z.string() }),
  flavor_text_entries: z.array(
    z.object({
      flavor_text: z.string(),
      language: namedResourceSchema,
      version: namedResourceSchema,
    }),
  ),
  gender_rate: z.number(),
  genera: z.array(
    z.object({
      genus: z.string(),
      language: namedResourceSchema,
    }),
  ),
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
  gender: z.string().nullable().optional(),
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
  trade_species: z.string().nullable().optional(),
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

export function parsePokemonResource(resource: unknown): PokeApiPokemon {
  return pokemonResourceSchema.parse(resource) as PokeApiPokemon;
}

export function parsePokemonSpeciesResource(
  resource: unknown,
): PokeApiPokemonSpecies {
  return pokemonSpeciesResourceSchema.parse(resource) as PokeApiPokemonSpecies;
}

export function parseAbilityResource(resource: unknown): PokeApiAbility {
  return abilityResourceSchema.parse(resource) as PokeApiAbility;
}

export function parseEvolutionChainResource(
  resource: unknown,
): PokeApiEvolutionChain {
  return evolutionChainResourceSchema.parse(resource) as PokeApiEvolutionChain;
}
