import aliases from "../src/search/alias-overrides.json";
import source from "../src/search/species-source.json";

export const speciesFuseOptions = {
  includeScore: true,
  keys: [
    { name: "name", weight: 0.45 },
    { name: "slug", weight: 0.3 },
    { name: "dexNumbers", weight: 0.2 },
    { name: "aliases", weight: 0.25 },
  ],
  threshold: 0.35,
};

export function buildSpeciesIndex() {
  return source.map((entry) => ({
    ...entry,
    aliases: aliases[entry.slug as keyof typeof aliases] ?? [],
    dexNumbers: [
      ...new Set([
        String(entry.dexNumber),
        String(entry.dexNumber).padStart(3, "0"),
      ]),
    ],
  }));
}
