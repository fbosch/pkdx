export const pokemonTypes = [
  "Bug",
  "Dark",
  "Dragon",
  "Electric",
  "Fairy",
  "Fighting",
  "Fire",
  "Flying",
  "Ghost",
  "Grass",
  "Ground",
  "Ice",
  "Normal",
  "Poison",
  "Psychic",
  "Rock",
  "Steel",
  "Water",
] as const;

export type PokemonType = (typeof pokemonTypes)[number];
export type DamageMultiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4;

export type DamageTakenEntry = {
  multiplier: Exclude<DamageMultiplier, 1>;
  type: PokemonType;
};

export type DamageTaken = {
  resistances: DamageTakenEntry[];
  weaknesses: DamageTakenEntry[];
};

const pokemonTypeByLowercase = new Map(
  pokemonTypes.map((type) => [type.toLowerCase(), type] as const),
);
const pokemonTypeOrder = new Map(
  pokemonTypes.map((type, index) => [type, index] as const),
);
const damageTakenCache = new Map<string, DamageTaken>();

const singleTypeEffectiveness: Record<
  PokemonType,
  Partial<Record<PokemonType, DamageMultiplier>>
> = {
  Bug: { Fighting: 0.5, Ground: 0.5, Grass: 0.5, Flying: 2, Rock: 2, Fire: 2 },
  Dark: { Fighting: 2, Bug: 2, Ghost: 0.5, Dark: 0.5, Psychic: 0, Fairy: 2 },
  Dragon: {
    Fire: 0.5,
    Water: 0.5,
    Grass: 0.5,
    Electric: 0.5,
    Ice: 2,
    Dragon: 2,
    Fairy: 2,
  },
  Electric: { Flying: 0.5, Steel: 0.5, Electric: 0.5, Ground: 2 },
  Fairy: { Fighting: 0.5, Bug: 0.5, Dark: 0.5, Poison: 2, Dragon: 0, Steel: 2 },
  Fighting: { Flying: 2, Rock: 0.5, Bug: 0.5, Psychic: 2, Dark: 0.5, Fairy: 2 },
  Fire: {
    Bug: 0.5,
    Steel: 0.5,
    Fire: 0.5,
    Grass: 0.5,
    Ice: 0.5,
    Fairy: 0.5,
    Ground: 2,
    Rock: 2,
    Water: 2,
  },
  Flying: {
    Fighting: 0.5,
    Bug: 0.5,
    Grass: 0.5,
    Ground: 0,
    Rock: 2,
    Electric: 2,
    Ice: 2,
  },
  Ghost: { Poison: 0.5, Bug: 0.5, Normal: 0, Fighting: 0, Ghost: 2, Dark: 2 },
  Grass: {
    Ground: 0.5,
    Water: 0.5,
    Grass: 0.5,
    Electric: 0.5,
    Flying: 2,
    Poison: 2,
    Bug: 2,
    Fire: 2,
    Ice: 2,
  },
  Ground: { Poison: 0.5, Rock: 0.5, Electric: 0, Water: 2, Grass: 2, Ice: 2 },
  Ice: { Ice: 0.5, Fighting: 2, Rock: 2, Steel: 2, Fire: 2 },
  Normal: { Fighting: 2, Ghost: 0 },
  Poison: {
    Fighting: 0.5,
    Poison: 0.5,
    Bug: 0.5,
    Grass: 0.5,
    Fairy: 0.5,
    Ground: 2,
    Psychic: 2,
  },
  Psychic: { Fighting: 0.5, Psychic: 0.5, Bug: 2, Ghost: 2, Dark: 2 },
  Rock: {
    Normal: 0.5,
    Flying: 0.5,
    Poison: 0.5,
    Fire: 0.5,
    Fighting: 2,
    Ground: 2,
    Steel: 2,
    Water: 2,
    Grass: 2,
  },
  Steel: {
    Normal: 0.5,
    Flying: 0.5,
    Rock: 0.5,
    Bug: 0.5,
    Steel: 0.5,
    Grass: 0.5,
    Psychic: 0.5,
    Ice: 0.5,
    Dragon: 0.5,
    Fairy: 0.5,
    Poison: 0,
    Fighting: 2,
    Ground: 2,
    Fire: 2,
  },
  Water: { Steel: 0.5, Fire: 0.5, Water: 0.5, Ice: 0.5, Grass: 2, Electric: 2 },
};

export function calculateDamageTaken(types: readonly string[]): DamageTaken {
  const defensiveTypes = types.map(toPokemonType);
  const cacheKey = damageTakenCacheKey(defensiveTypes);
  const cached = damageTakenCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const immune: DamageTakenEntry[] = [];
  const doubleResistances: DamageTakenEntry[] = [];
  const resistances: DamageTakenEntry[] = [];
  const weaknesses: DamageTakenEntry[] = [];
  const doubleWeaknesses: DamageTakenEntry[] = [];

  for (const attackingType of pokemonTypes) {
    let multiplier: DamageMultiplier = 1;

    for (const defensiveType of defensiveTypes) {
      multiplier = (multiplier *
        (singleTypeEffectiveness[defensiveType][attackingType] ??
          1)) as DamageMultiplier;
    }

    switch (multiplier) {
      case 0:
        immune.push({ multiplier, type: attackingType });
        break;
      case 0.25:
        doubleResistances.push({ multiplier, type: attackingType });
        break;
      case 0.5:
        resistances.push({ multiplier, type: attackingType });
        break;
      case 2:
        weaknesses.push({ multiplier, type: attackingType });
        break;
      case 4:
        doubleWeaknesses.push({ multiplier, type: attackingType });
        break;
    }
  }

  const damageTaken = {
    resistances: [...resistances, ...doubleResistances, ...immune],
    weaknesses: [...doubleWeaknesses, ...weaknesses],
  };
  damageTakenCache.set(cacheKey, damageTaken);
  return damageTaken;
}

function damageTakenCacheKey(types: readonly PokemonType[]): string {
  if (types.length === 1) {
    return types[0] ?? "";
  }

  if (types.length === 2) {
    const left = types[0];
    const right = types[1];
    if (left === undefined || right === undefined) {
      return "";
    }

    return comparePokemonTypes(left, right) <= 0
      ? `${left}|${right}`
      : `${right}|${left}`;
  }

  return [...types].sort(comparePokemonTypes).join("|");
}

function comparePokemonTypes(left: PokemonType, right: PokemonType): number {
  return (pokemonTypeOrder.get(left) ?? 0) - (pokemonTypeOrder.get(right) ?? 0);
}

function toPokemonType(type: string): PokemonType {
  const pokemonType = pokemonTypeByLowercase.get(type.toLowerCase());

  if (pokemonType === undefined) {
    throw new Error(`Unknown Pokemon type: ${type}`);
  }

  return pokemonType;
}
