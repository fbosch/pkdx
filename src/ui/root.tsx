import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  createAppQueryClient,
  createQueryPersister,
  persistedQueryMaxAge,
  queryCacheBuster,
} from "../query-cache";
import { App } from "./app";

const persistQueryCache = Bun.env.POKEDEX_DISABLE_QUERY_CACHE !== "1";
const queryClient = createAppQueryClient();

type RootProps = {
  initialQuery?: string;
  onExit: () => void;
};

export function Root({ initialQuery = "", onExit }: RootProps) {
  if (!persistQueryCache) {
    return (
      <QueryClientProvider client={queryClient}>
        <App initialQuery={initialQuery} onExit={onExit} />
      </QueryClientProvider>
    );
  }

  const persister = createQueryPersister();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        buster: queryCacheBuster,
        maxAge: persistedQueryMaxAge,
        persister,
      }}
    >
      <App initialQuery={initialQuery} onExit={onExit} />
    </PersistQueryClientProvider>
  );
}
