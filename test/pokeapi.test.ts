import { expect, test } from "bun:test";
import { HttpResponse, http } from "msw";
import {
  queryCachePolicies,
  runtimeQueryCachePolicies,
} from "../src/query-cache";
import {
  canonicalPokeApiUrl,
  PokeApiResourceError,
  pokeApiResourceQueryKey,
  pokeApiResourceQueryOptions,
} from "../src/pokeapi";
import { createMockServer, executeQuery } from "./support/query-test";

const server = createMockServer();

test("canonicalizes PokeAPI resource URLs for stable query keys", () => {
  expect(canonicalPokeApiUrl("pokemon/pikachu?ignored=true#ignored")).toBe(
    "https://pokeapi.co/api/v2/pokemon/pikachu/",
  );
  expect(
    pokeApiResourceQueryKey("http://pokeapi.co/api/v2/pokemon/25"),
  ).toEqual(["pokeapi-resource", "https://pokeapi.co/api/v2/pokemon/25/"]);
});

test("rejects non-PokeAPI resource URLs", () => {
  expect(() =>
    canonicalPokeApiUrl("https://example.com/api/v2/pokemon/25"),
  ).toThrow("Unsupported PokeAPI host");
  expect(() =>
    canonicalPokeApiUrl("https://pokeapi.co/api/v1/pokemon/25"),
  ).toThrow("Unsupported PokeAPI path");
});

test("fetches resources through query options and returns parsed values", async () => {
  let requestedUrl: string | undefined;
  server.use(
    http.get("https://pokeapi.co/api/v2/pokemon/pikachu/", ({ request }) => {
      requestedUrl = request.url;
      return HttpResponse.json({ name: "pikachu", ignored: true });
    }),
  );

  const options = pokeApiResourceQueryOptions({
    url: "pokemon/pikachu",
    parse: (resource) => {
      const record = resource as { name: string };
      return { displayName: record.name.toUpperCase() };
    },
  });

  await expect(executeQuery(options)).resolves.toEqual({
    displayName: "PIKACHU",
  });
  expect([...options.queryKey]).toEqual([
    "pokeapi-resource",
    "https://pokeapi.co/api/v2/pokemon/pikachu/",
  ]);
  expect(options.staleTime).toBe(queryCachePolicies.pokeapiResource.staleTime);
  expect(options.gcTime).toBe(runtimeQueryCachePolicies.pokeapiResource.gcTime);
  expect(requestedUrl).toBe("https://pokeapi.co/api/v2/pokemon/pikachu/");
});

test("turns failed PokeAPI responses into boundary errors", async () => {
  server.use(
    http.get("https://pokeapi.co/api/v2/pokemon/missingno/", () => {
      return new HttpResponse("not found", { status: 404 });
    }),
  );

  const options = pokeApiResourceQueryOptions({
    url: "pokemon/missingno",
    parse: (resource) => resource,
  });

  await expect(executeQuery(options)).rejects.toThrow(PokeApiResourceError);
});
