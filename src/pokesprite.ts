import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { queryCachePolicies } from "./query-cache";
import type { SpeciesIndexEntry } from "./search";
import { renderPngSpriteFile, type RenderedSprite } from "./sprite-rendering";

const pokespriteBaseUrl =
  "https://raw.githubusercontent.com/msikma/pokesprite/master/";
const pokespriteMetadataUrl = `${pokespriteBaseUrl}data/pokemon.json`;

export type PokeSpriteMetadataQueryKey = readonly [
  "pokesprite-metadata",
  url: string,
];

type FetchResource = (input: string, init?: RequestInit) => Promise<Response>;
type ResourceQueryClient = Pick<QueryClient, "fetchQuery">;

type PokeSpriteRenderedSpriteQueryKey = readonly [
  "pokesprite-rendered-sprite",
  dexNumber: number,
  shiny: boolean,
];

const formMetadataSchema = z
  .object({
    has_female: z.boolean().optional(),
    has_right: z.boolean().optional(),
    has_unofficial_female_icon: z.boolean().optional(),
    is_alias_of: z.string().optional(),
  })
  .transform((form) => ({
    hasFemale: form.has_female ?? false,
    hasRight: form.has_right ?? false,
    hasUnofficialFemaleIcon: form.has_unofficial_female_icon ?? false,
    isAliasOf: form.is_alias_of,
  }));

const pokemonMetadataEntrySchema = z
  .object({
    idx: z.string(),
    name: z.object({ eng: z.string() }),
    slug: z.object({ eng: z.string() }),
    "gen-7": z
      .object({
        forms: z.record(z.string(), formMetadataSchema).optional(),
      })
      .optional(),
  })
  .transform((entry) => ({
    dexNumber: Number.parseInt(entry.idx, 10),
    forms: entry["gen-7"]?.forms ?? {},
    name: entry.name.eng,
    slug: entry.slug.eng,
  }));

const pokespriteMetadataSchema = z.record(
  z.string(),
  pokemonMetadataEntrySchema,
);

export type PokeSpriteMetadata = z.infer<typeof pokespriteMetadataSchema>;
export type PokeSpritePokemonMetadata = PokeSpriteMetadata[string];

export type PokeSpriteAssetReference = {
  formKey: string;
  metadata: PokeSpritePokemonMetadata;
  shiny: boolean;
  slug: string;
  url: string;
};

export type CachedPokeSpriteAsset = PokeSpriteAssetReference & {
  filePath: string;
};

export class PokeSpriteResourceError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(url: string, status: number) {
    super(`PokeSprite request failed for ${url}: ${status}`);
    this.name = "PokeSpriteResourceError";
    this.status = status;
    this.url = url;
  }
}

export function pokespriteMetadataQueryKey(): PokeSpriteMetadataQueryKey {
  return ["pokesprite-metadata", pokespriteMetadataUrl];
}

export function pokespriteMetadataQueryOptions(
  fetch: FetchResource = globalThis.fetch,
) {
  return queryOptions({
    queryKey: pokespriteMetadataQueryKey(),
    queryFn: async ({ signal }) => {
      const resource = await fetchPokeSpriteResource(
        pokespriteMetadataUrl,
        fetch,
        signal,
      );
      return parsePokeSpriteMetadata(resource);
    },
    ...queryCachePolicies.pokespriteMetadata,
  });
}

function pokespriteRenderedSpriteQueryKey(
  species: SpeciesIndexEntry,
  shiny = false,
): PokeSpriteRenderedSpriteQueryKey {
  return ["pokesprite-rendered-sprite", species.dexNumber, shiny];
}

export function pokespriteRenderedSpriteQueryOptions(
  species: SpeciesIndexEntry,
  queryClient: ResourceQueryClient,
  shiny = false,
) {
  return queryOptions({
    queryKey: pokespriteRenderedSpriteQueryKey(species, shiny),
    queryFn: async (): Promise<RenderedSprite> => {
      const metadata = await queryClient.fetchQuery(
        pokespriteMetadataQueryOptions(),
      );
      const asset = await cachePokeSpriteAsset(
        resolveDefaultPokeSpriteAsset(metadata, species, shiny),
      );

      return renderPngSpriteFile(asset.filePath);
    },
    ...queryCachePolicies.pokespriteMetadata,
  });
}

export function parsePokeSpriteMetadata(resource: unknown): PokeSpriteMetadata {
  return pokespriteMetadataSchema.parse(resource);
}

export function resolveDefaultPokeSpriteAsset(
  metadata: PokeSpriteMetadata,
  species: SpeciesIndexEntry,
  shiny = false,
): PokeSpriteAssetReference {
  return resolvePokeSpriteAsset(metadata, species, "$", shiny);
}

export function resolvePokeSpriteAsset(
  metadata: PokeSpriteMetadata,
  species: SpeciesIndexEntry,
  formKey: string,
  shiny = false,
): PokeSpriteAssetReference {
  const entry = metadata[dexKey(species.dexNumber)];
  if (entry === undefined) {
    throw new Error(`PokeSprite metadata missing #${species.dexNumber}`);
  }

  const form = entry.forms[formKey];
  if (form === undefined) {
    throw new Error(
      `PokeSprite metadata missing ${entry.slug} form ${formKey}`,
    );
  }

  const resolvedFormKey = form.isAliasOf ?? formKey;
  const slug = spriteSlug(entry.slug, resolvedFormKey);

  return {
    formKey: resolvedFormKey,
    metadata: entry,
    shiny,
    slug,
    url: `${pokespriteBaseUrl}pokemon-gen7x/${shiny ? "shiny" : "regular"}/${slug}.png`,
  };
}

export async function cachePokeSpriteAsset(
  asset: PokeSpriteAssetReference,
  options: {
    cacheDirectory?: string;
    fetch?: FetchResource;
  } = {},
): Promise<CachedPokeSpriteAsset> {
  const cacheDirectory =
    options.cacheDirectory ?? getDefaultPokeSpriteAssetCacheDirectory();
  const filePath = pokeSpriteAssetCachePath(cacheDirectory, asset.url);
  const cachedFile = Bun.file(filePath);

  if (await cachedFile.exists()) {
    return { ...asset, filePath };
  }

  const response = await (options.fetch ?? globalThis.fetch)(asset.url);
  if (!response.ok) {
    throw new PokeSpriteResourceError(asset.url, response.status);
  }

  await mkdir(cacheDirectory, { recursive: true });
  await Bun.write(filePath, await response.arrayBuffer());

  return { ...asset, filePath };
}

export function pokeSpriteAssetCachePath(
  cacheDirectory: string,
  url: string,
): string {
  return join(cacheDirectory, encodeURIComponent(url));
}

async function fetchPokeSpriteResource(
  url: string,
  fetchResource: FetchResource,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetchResource(url, { signal });

  if (!response.ok) {
    throw new PokeSpriteResourceError(url, response.status);
  }

  return await response.json();
}

function dexKey(dexNumber: number): string {
  return dexNumber.toString().padStart(3, "0");
}

function getDefaultPokeSpriteAssetCacheDirectory(): string {
  const baseDirectory =
    process.env.XDG_CACHE_HOME ?? join(Bun.env.HOME ?? ".", ".cache");
  return join(baseDirectory, "pkdx", "pokesprite-assets");
}

function spriteSlug(speciesSlug: string, formKey: string): string {
  if (formKey === "$") {
    return speciesSlug;
  }

  return `${speciesSlug}-${formKey}`;
}
