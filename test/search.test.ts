import { expect, test } from "bun:test";
import {
  findExactSpecies,
  minimumSearchQueryLength,
  searchSpecies,
} from "../src/search";

test.each([
  { query: "pikachu", slug: "pikachu" },
  { query: "pika", slug: "pikachu" },
  { query: "001", slug: "bulbasaur" },
  { query: "nidoran female", slug: "nidoran-f" },
  { query: "mr mime", slug: "mr-mime" },
  { query: "pecharunt", slug: "pecharunt" },
])("ranks $slug for $query", ({ query, slug }) => {
  expect(searchSpecies(query)[0]?.slug).toBe(slug);
});

test("exact species matching excludes fuzzy aliases", () => {
  expect(findExactSpecies("pikachu")?.slug).toBe("pikachu");
  expect(findExactSpecies("025")?.slug).toBe("pikachu");
  expect(findExactSpecies("1025")?.slug).toBe("pecharunt");
  expect(findExactSpecies("pika")).toBeUndefined();
});

test("search starts after one input character", () => {
  expect(minimumSearchQueryLength).toBe(1);
  expect(searchSpecies("")).toEqual([]);
  expect(searchSpecies("p").length).toBeGreaterThan(0);
  expect(searchSpecies("pik")[0]?.slug).toBe("pikachu");
});
