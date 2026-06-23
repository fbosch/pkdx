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
  | "flavor_text_entries"
  | "id"
  | "name"
  | "names"
  | "varieties"
>;

export type PokeApiAbility = Pick<
  GeneratedAbility,
  "effect_entries" | "flavor_text_entries" | "id" | "name"
>;

type PokeApiEvolutionChainNode = {
  evolves_to: PokeApiEvolutionChainNode[];
  species: GeneratedEvolutionChainSpecies;
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
  evolution_chain: z.object({ url: z.string() }),
  flavor_text_entries: z.array(
    z.object({
      flavor_text: z.string(),
      language: namedResourceSchema,
      version: namedResourceSchema,
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
  evolves_to: EvolutionChainNode[];
  species: z.infer<typeof namedResourceSchema>;
};

const evolutionChainNodeSchema: z.ZodType<EvolutionChainNode> = z.lazy(() =>
  z.object({
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
