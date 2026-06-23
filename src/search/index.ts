import Fuse from "fuse.js";
import fuseIndex from "./species-fuse-index.json";
import speciesIndex from "./species-index.json";

export type SpeciesIndexEntry = {
  dexNumber: number;
  dexNumbers: string[];
  name: string;
  slug: string;
  aliases: string[];
};

export type SearchResult = SpeciesIndexEntry & {
  selected: boolean;
};

const fuseOptions = {
  includeScore: true,
  keys: [
    { name: "name", weight: 0.45 },
    { name: "slug", weight: 0.3 },
    { name: "dexNumbers", weight: 0.2 },
    { name: "aliases", weight: 0.25 },
  ],
  threshold: 0.35,
};

const fuse = new Fuse(speciesIndex, fuseOptions, Fuse.parseIndex(fuseIndex));

const normalizedSpeciesIndex = speciesIndex.map((entry) => ({
  entry,
  aliases: entry.aliases.map(normalize),
  dexNumbers: entry.dexNumbers.map(normalize),
  name: normalize(entry.name),
  slug: normalize(entry.slug),
}));

const exactSpeciesByIdentity = new Map(
  normalizedSpeciesIndex.flatMap(({ dexNumbers, entry, name, slug }) =>
    [name, slug, ...dexNumbers].map((value) => [value, entry] as const),
  ),
);
const searchResultCache = new Map<string, SpeciesIndexEntry[]>();
const searchResultCacheLimit = 50;

export const minimumSearchQueryLength = 1;

export function searchSpecies(query: string, limit = 10): SpeciesIndexEntry[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < minimumSearchQueryLength) {
    return [];
  }

  const cacheKey = `${normalizedQuery}:${limit.toString()}`;
  const cachedResults = searchResultCache.get(cacheKey);
  if (cachedResults !== undefined) {
    return cachedResults;
  }

  const prefixMatches = searchSpeciesByPrefix(normalizedQuery, limit);
  const results =
    prefixMatches.length > 0
      ? prefixMatches
      : fuse.search(normalizedQuery, { limit }).map((result) => result.item);

  cacheSearchResults(cacheKey, results);
  return results;
}

export function searchResults(
  query: string,
  selectedIndex: number,
  limit = 10,
): SearchResult[] {
  return searchSpecies(query, limit).map((entry, index) => ({
    ...entry,
    selected: index === selectedIndex,
  }));
}

export function findExactSpecies(query: string): SpeciesIndexEntry | undefined {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length === 0) {
    return undefined;
  }

  return exactSpeciesByIdentity.get(normalizedQuery);
}

export function getSpeciesBySelection(
  query: string,
  selectedIndex: number,
): SpeciesIndexEntry | undefined {
  return searchSpecies(query)[selectedIndex];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(".", "")
    .replaceAll("♀", " female")
    .replaceAll("♂", " male")
    .trim();
}

function searchSpeciesByPrefix(
  query: string,
  limit: number,
): SpeciesIndexEntry[] {
  return normalizedSpeciesIndex
    .map((entry) => ({
      entry: entry.entry,
      rank: prefixMatchRank(entry, query),
    }))
    .filter(hasPrefixMatchRank)
    .toSorted((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return left.entry.dexNumber - right.entry.dexNumber;
    })
    .slice(0, limit)
    .map((result) => result.entry);
}

function hasPrefixMatchRank(result: {
  entry: SpeciesIndexEntry;
  rank: number | undefined;
}): result is { entry: SpeciesIndexEntry; rank: number } {
  return result.rank !== undefined;
}

function cacheSearchResults(key: string, results: SpeciesIndexEntry[]): void {
  searchResultCache.set(key, results);

  if (searchResultCache.size <= searchResultCacheLimit) {
    return;
  }

  const oldestKey = searchResultCache.keys().next().value;
  if (oldestKey !== undefined) {
    searchResultCache.delete(oldestKey);
  }
}

function prefixMatchRank(
  entry: (typeof normalizedSpeciesIndex)[number],
  query: string,
): number | undefined {
  if (
    entry.name === query ||
    entry.slug === query ||
    entry.dexNumbers.includes(query)
  ) {
    return 0;
  }

  if (entry.name.startsWith(query) || entry.slug.startsWith(query)) {
    return 1;
  }

  if (entry.aliases.some((alias) => alias.startsWith(query))) {
    return 2;
  }

  if (entry.dexNumbers.some((dexNumber) => dexNumber.startsWith(query))) {
    return 3;
  }

  return undefined;
}
