import { queryOptions } from "@tanstack/react-query";
import { runtimeQueryCachePolicies } from "../query-cache";
const pokeApiBaseUrl = "https://pokeapi.co/api/v2/";

export type PokeApiResourceQueryKey = readonly [
  "pokeapi-resource",
  canonicalUrl: string,
];

type FetchResource = (input: string, init?: RequestInit) => Promise<Response>;

type PokeApiResourceQueryConfig<T> = {
  url: string | URL;
  parse: (resource: unknown) => T;
  fetch?: FetchResource;
};

export class PokeApiResourceError extends Error {
  readonly canonicalUrl: string;
  readonly status: number;

  constructor(canonicalUrl: string, status: number) {
    super(`PokeAPI request failed for ${canonicalUrl}: ${status}`);
    this.name = "PokeApiResourceError";
    this.canonicalUrl = canonicalUrl;
    this.status = status;
  }
}

export function canonicalPokeApiUrl(url: string | URL): string {
  const parsed = new URL(url, pokeApiBaseUrl);

  if (parsed.hostname !== "pokeapi.co") {
    throw new Error(`Unsupported PokeAPI host: ${parsed.hostname}`);
  }

  if (!parsed.pathname.startsWith("/api/v2/")) {
    throw new Error(`Unsupported PokeAPI path: ${parsed.pathname}`);
  }

  parsed.protocol = "https:";
  parsed.hash = "";
  parsed.search = "";

  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname = `${parsed.pathname}/`;
  }

  return parsed.toString();
}

export function pokeApiResourceQueryKey(
  url: string | URL,
): PokeApiResourceQueryKey {
  return ["pokeapi-resource", canonicalPokeApiUrl(url)];
}

export function pokeApiResourceQueryOptions<T>({
  url,
  parse,
  fetch = globalThis.fetch,
}: PokeApiResourceQueryConfig<T>) {
  const canonicalUrl = canonicalPokeApiUrl(url);

  return queryOptions({
    queryKey: pokeApiResourceQueryKey(canonicalUrl),
    queryFn: async ({ signal }) => {
      const resource = await fetchPokeApiResource(canonicalUrl, fetch, signal);
      return parse(resource);
    },
    ...runtimeQueryCachePolicies.pokeapiResource,
  });
}

async function fetchPokeApiResource(
  canonicalUrl: string,
  fetchResource: FetchResource,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetchResource(canonicalUrl, { signal });

  if (!response.ok) {
    throw new PokeApiResourceError(canonicalUrl, response.status);
  }

  return await response.json();
}
