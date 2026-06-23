import { expect, test } from "bun:test";
import { HttpResponse, http } from "msw";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cachePokeSpriteAsset,
  parsePokeSpriteMetadata,
  PokeSpriteResourceError,
  pokespriteMetadataQueryKey,
  pokespriteMetadataQueryOptions,
  pokeSpriteAssetCachePath,
  resolveDefaultPokeSpriteAsset,
  resolvePokeSpriteAsset,
} from "../src/pokesprite";
import { queryCachePolicies } from "../src/query-cache";
import { findExactSpecies } from "../src/search";
import type { SpeciesIndexEntry } from "../src/search";
import { pokespritePokemonMetadata } from "./support/pokesprite-fixtures";
import { createMockServer, executeQuery } from "./support/query-test";

const server = createMockServer();

test("parses consumed PokeSprite metadata fields", () => {
  const metadata = parsePokeSpriteMetadata(pokespritePokemonMetadata);

  expect(metadata["025"]).toEqual({
    dexNumber: 25,
    forms: {
      $: {
        hasFemale: true,
        hasRight: false,
        hasUnofficialFemaleIcon: true,
        isAliasOf: undefined,
      },
    },
    name: "Pikachu",
    slug: "pikachu",
  });
  expect(metadata["810"]).toMatchObject({
    dexNumber: 810,
    forms: {},
    name: "Grookey",
    slug: "grookey",
  });
});

test("loads PokeSprite metadata through persisted query options", async () => {
  let requestedUrl: string | undefined;
  server.use(
    http.get(
      "https://raw.githubusercontent.com/msikma/pokesprite/master/data/pokemon.json",
      ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json(pokespritePokemonMetadata);
      },
    ),
  );

  const options = pokespriteMetadataQueryOptions();

  await expect(executeQuery(options)).resolves.toMatchObject({
    "025": { name: "Pikachu", slug: "pikachu" },
  });
  expect([...pokespriteMetadataQueryKey()]).toEqual([
    "pokesprite-metadata",
    "https://raw.githubusercontent.com/msikma/pokesprite/master/data/pokemon.json",
  ]);
  expect(options.staleTime).toBe(
    queryCachePolicies.pokespriteMetadata.staleTime,
  );
  expect(options.gcTime).toBe(queryCachePolicies.pokespriteMetadata.gcTime);
  expect(requestedUrl).toBe(
    "https://raw.githubusercontent.com/msikma/pokesprite/master/data/pokemon.json",
  );
});

test("turns failed PokeSprite responses into boundary errors", async () => {
  server.use(
    http.get(
      "https://raw.githubusercontent.com/msikma/pokesprite/master/data/pokemon.json",
      () => new HttpResponse("not found", { status: 404 }),
    ),
  );

  await expect(executeQuery(pokespriteMetadataQueryOptions())).rejects.toThrow(
    PokeSpriteResourceError,
  );
});

test("resolves known default sprite slugs from metadata", () => {
  const metadata = parsePokeSpriteMetadata(pokespritePokemonMetadata);
  const pikachu = findExactSpecies("pikachu") ?? throwMissingSpecies("pikachu");
  const nidoranFemale =
    findExactSpecies("nidoran-f") ?? throwMissingSpecies("nidoran-f");

  expect(resolveDefaultPokeSpriteAsset(metadata, pikachu)).toMatchObject({
    formKey: "$",
    shiny: false,
    slug: "pikachu",
    url: "https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen7x/regular/pikachu.png",
  });
  expect(resolveDefaultPokeSpriteAsset(metadata, nidoranFemale)).toMatchObject({
    slug: "nidoran-f",
    url: "https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen7x/regular/nidoran-f.png",
  });
});

test("resolves form aliases and shiny asset URLs", () => {
  const metadata = parsePokeSpriteMetadata(pokespritePokemonMetadata);
  const raticate: SpeciesIndexEntry = {
    aliases: [],
    dexNumber: 20,
    dexNumbers: ["20", "020"],
    name: "Raticate",
    slug: "raticate",
  };

  expect(
    resolvePokeSpriteAsset(metadata, raticate, "totem", true),
  ).toMatchObject({
    formKey: "alola",
    shiny: true,
    slug: "raticate-alola",
    url: "https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen7x/shiny/raticate-alola.png",
  });
});

test("fails concisely when requested Gen 7x sprite metadata is missing", () => {
  const metadata = parsePokeSpriteMetadata(pokespritePokemonMetadata);
  const grookey: SpeciesIndexEntry = {
    aliases: [],
    dexNumber: 810,
    dexNumbers: ["810"],
    name: "Grookey",
    slug: "grookey",
  };

  expect(() => resolveDefaultPokeSpriteAsset(metadata, grookey)).toThrow(
    "PokeSprite metadata missing grookey form $",
  );
});

test("caches PokeSprite PNG assets by resolved URL", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "pkdx-pokesprite-"));
  const asset = pikachuDefaultSpriteAsset();
  const pngBytes = new Uint8Array([137, 80, 78, 71]);
  let requestCount = 0;

  server.use(
    http.get(asset.url, () => {
      requestCount += 1;
      return new HttpResponse(pngBytes);
    }),
  );

  try {
    const cached = await cachePokeSpriteAsset(asset, { cacheDirectory });
    const reused = await cachePokeSpriteAsset(asset, { cacheDirectory });

    expect(cached.filePath).toBe(
      pokeSpriteAssetCachePath(cacheDirectory, asset.url),
    );
    expect(reused.filePath).toBe(cached.filePath);
    expect(
      new Uint8Array(await Bun.file(cached.filePath).arrayBuffer()),
    ).toEqual(pngBytes);
    expect(requestCount).toBe(1);
  } finally {
    await rm(cacheDirectory, { force: true, recursive: true });
  }
});

test("turns failed PokeSprite asset responses into boundary errors", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "pkdx-pokesprite-"));
  const asset = pikachuDefaultSpriteAsset();

  server.use(
    http.get(asset.url, () => new HttpResponse("nope", { status: 503 })),
  );

  try {
    await expect(
      cachePokeSpriteAsset(asset, { cacheDirectory }),
    ).rejects.toThrow(PokeSpriteResourceError);
  } finally {
    await rm(cacheDirectory, { force: true, recursive: true });
  }
});

function pikachuDefaultSpriteAsset() {
  const metadata = parsePokeSpriteMetadata(pokespritePokemonMetadata);
  const pikachu = findExactSpecies("pikachu") ?? throwMissingSpecies("pikachu");
  return resolveDefaultPokeSpriteAsset(metadata, pikachu);
}

function throwMissingSpecies(slug: string): never {
  throw new Error(`Missing test species: ${slug}`);
}
