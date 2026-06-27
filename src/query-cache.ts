import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import type { AsyncStorage } from "@tanstack/react-query-persist-client";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

const oneHour = 60 * 60 * 1000;
const oneDay = 24 * oneHour;
const maxRuntimeGcTime = 24 * oneDay;

export const queryCacheBuster = "query-cache-v5";

export const queryCachePolicies = {
  pokeapiResource: {
    staleTime: 7 * oneDay,
    gcTime: 30 * oneDay,
  },
  pokemonDetail: {
    staleTime: oneDay,
    gcTime: 14 * oneDay,
  },
  pokespriteMetadata: {
    staleTime: 30 * oneDay,
    gcTime: 90 * oneDay,
  },
} as const;

export const persistedQueryMaxAge = Math.max(
  ...Object.values(queryCachePolicies).map((policy) => policy.gcTime),
);

export const runtimeQueryCachePolicies = {
  pokeapiResource: runtimeQueryCachePolicy(queryCachePolicies.pokeapiResource),
  pokemonDetail: runtimeQueryCachePolicy(queryCachePolicies.pokemonDetail),
  pokespriteMetadata: runtimeQueryCachePolicy(
    queryCachePolicies.pokespriteMetadata,
  ),
} as const;

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: maxRuntimeGcTime,
        networkMode: "offlineFirst",
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 0,
      },
    },
  });
}

function runtimeQueryCachePolicy<
  T extends { gcTime: number; staleTime: number },
>(policy: T): T {
  return {
    ...policy,
    gcTime: Math.min(policy.gcTime, maxRuntimeGcTime),
  };
}

export function createQueryPersister(
  cacheDirectory = getDefaultCacheDirectory(),
) {
  return createAsyncStoragePersister({
    key: "query-client.json",
    storage: createFileStorage(cacheDirectory),
  });
}

export function createFileStorage(cacheDirectory: string): AsyncStorage {
  return {
    async getItem(key) {
      const file = Bun.file(cacheFilePath(cacheDirectory, key));
      if (!(await file.exists())) {
        return null;
      }

      return await file.text();
    },
    async setItem(key, value) {
      const filePath = cacheFilePath(cacheDirectory, key);
      await mkdir(dirname(filePath), { recursive: true });
      await Bun.write(filePath, value);
    },
    async removeItem(key) {
      await rm(cacheFilePath(cacheDirectory, key), { force: true });
    },
  };
}

function getDefaultCacheDirectory(): string {
  const baseDirectory =
    process.env.XDG_CACHE_HOME ?? join(Bun.env.HOME ?? ".", ".cache");
  return join(baseDirectory, "pkdx", "tanstack-query");
}

function cacheFilePath(cacheDirectory: string, key: string): string {
  return join(cacheDirectory, encodeURIComponent(key));
}
