import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  applyAppKey,
  createInitialAppState,
  detailLoadFailed,
  detailLoadSucceeded,
  loadAdjacentDetailSpecies,
  type DetailNavigationDelta,
  type DetailState,
} from "../app-state";
import type { PokemonDetail, PokemonForm } from "../pokemon-detail";
import { pokemonDetailQueryOptions } from "../pokemon-detail";
import { pokespriteRenderedSpriteQueryOptions } from "../pokesprite";
import { getSpeciesByDexDelta, type SpeciesIndexEntry } from "../search";
import {
  DetailCardTitle,
  DetailScreen,
  InstructionFooter,
  KeyHints,
  PokedexCard,
} from "./components";
import { colors, textStyles } from "./design-tokens";
import {
  DexNavigationButtons,
  LoadedDetailView,
} from "./detail/LoadedDetailView";
import { SearchView } from "./search/SearchView";

type AppProps = {
  initialQuery?: string;
  onExit: () => void;
};

export function App({ initialQuery = "", onExit }: AppProps) {
  const [state, setState] = useState(() => createInitialAppState(initialQuery));
  const queryClient = useQueryClient();

  useKeyboard((key: KeyEvent) => {
    setState((current) => {
      return applyAppKey(current, key);
    });
  });

  useEffect(() => {
    if (state.shouldExit) {
      onExit();
    }
  }, [onExit, state.shouldExit]);

  if (state.screen === "detail") {
    return (
      <DetailView
        onLoadFailed={(species, form, error) => {
          setState((current) =>
            current.screen === "detail"
              ? detailLoadFailed(current, species, error, form)
              : current,
          );
        }}
        onLoadSucceeded={(species, detail) => {
          setState((current) =>
            current.screen === "detail"
              ? detailLoadSucceeded(current, species, detail)
              : current,
          );
        }}
        onNavigate={(delta) => {
          setState((current) =>
            current.screen === "detail"
              ? loadAdjacentDetailSpecies(current, delta)
              : current,
          );
        }}
        queryClient={queryClient}
        state={state}
      />
    );
  }

  return <SearchView query={state.query} selectedIndex={state.selectedIndex} />;
}

type DetailViewProps = {
  onLoadFailed: (
    species: DetailState["species"],
    form: DetailState["form"],
    error: unknown,
  ) => void;
  onLoadSucceeded: (
    species: DetailState["species"],
    detail: PokemonDetail,
  ) => void;
  onNavigate: (delta: DetailNavigationDelta) => void;
  queryClient: ReturnType<typeof useQueryClient>;
  state: DetailState;
};

type DetailLoadProps = Omit<DetailViewProps, "onNavigate">;

function DetailView({
  onLoadFailed,
  onLoadSucceeded,
  onNavigate,
  queryClient,
  state,
}: DetailViewProps) {
  usePokemonDetailLoad({
    onLoadFailed,
    onLoadSucceeded,
    queryClient,
    state,
  });
  usePokemonSpritePrefetch({
    enabled: state.status !== "error",
    form: state.form,
    queryClient,
    shiny: state.shiny,
    species: state.species,
  });
  useAdjacentPokemonPrefetch({
    enabled: state.status !== "error",
    queryClient,
    shiny: state.shiny,
    species: state.species,
  });

  if (state.detail !== undefined) {
    return (
      <LoadedDetailView
        abilityViewerOpen={state.detailOverlay === "abilities"}
        detail={state.detail.detail}
        descriptionIndex={state.descriptionIndex}
        errorMessage={state.status === "error" ? state.errorMessage : undefined}
        formSelectorSelectedIndex={getFormSelectorSelectedIndex(state)}
        loadedSpecies={state.detail.species}
        navigationSpecies={state.species}
        onNavigate={onNavigate}
        queryClient={queryClient}
        shiny={state.shiny}
      />
    );
  }

  if (state.status === "loading") {
    if (state.previousQuery.length === 0) {
      return <InitialDetailLoadingView species={state.species} />;
    }

    return (
      <SearchView
        query={state.previousQuery}
        selectedIndex={state.previousSelectedIndex}
      />
    );
  }

  return <DetailErrorView state={state} />;
}

function InitialDetailLoadingView({ species }: { species: SpeciesIndexEntry }) {
  return (
    <DetailScreen>
      <PokedexCard>
        <DetailCardTitle
          left={`#${species.dexNumber.toString().padStart(3, "0")} ${species.name}`}
          right=""
        />
        <box style={{ alignItems: "flex-start", flexDirection: "row", gap: 1 }}>
          <SkeletonPanel height={17} width={42} />
          <box style={{ flexDirection: "column", width: 53 }}>
            <SkeletonPanel height={7} width={53} />
            <SkeletonPanel height={9} width={53} />
          </box>
        </box>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <SkeletonPanel height={10} width={45} />
          <SkeletonPanel height={10} width={50} />
        </box>
      </PokedexCard>
      <DexNavigationButtons
        nextSpecies={getSpeciesByDexDelta(species, 1)}
        previousSpecies={getSpeciesByDexDelta(species, -1)}
      />
    </DetailScreen>
  );
}

function SkeletonPanel({ height, width }: { height: number; width: number }) {
  return (
    <box
      border
      borderColor={colors.panelSecondary}
      borderStyle="rounded"
      style={{ height, width }}
    />
  );
}

function usePokemonDetailLoad({
  onLoadFailed,
  onLoadSucceeded,
  queryClient,
  state,
}: DetailLoadProps) {
  const retryErrorUpdatedAt = useRef<number | undefined>(undefined);
  const detail = useQuery({
    ...pokemonDetailQueryOptions(state.species, queryClient, state.form),
    enabled: state.status !== "error",
  });

  useEffect(() => {
    if (detail.data !== undefined && state.status !== "ready") {
      retryErrorUpdatedAt.current = undefined;
      onLoadSucceeded(state.species, detail.data);
    }
  }, [detail.data, onLoadSucceeded, state.species, state.status]);

  useEffect(() => {
    if (state.retryToken > 0 && state.status === "loading") {
      retryErrorUpdatedAt.current = detail.errorUpdatedAt;
      void detail.refetch();
    }
  }, [detail.errorUpdatedAt, detail.refetch, state.retryToken, state.status]);

  useEffect(() => {
    if (
      detail.isError &&
      !detail.isFetching &&
      state.status !== "error" &&
      retryErrorUpdatedAt.current !== detail.errorUpdatedAt
    ) {
      retryErrorUpdatedAt.current = undefined;
      onLoadFailed(state.species, state.form, detail.error);
    }
  }, [
    detail.error,
    detail.errorUpdatedAt,
    detail.isError,
    detail.isFetching,
    onLoadFailed,
    state.form,
    state.species,
    state.status,
  ]);
}

function usePokemonSpritePrefetch({
  enabled,
  form,
  queryClient,
  shiny,
  species,
}: {
  enabled: boolean;
  form: PokemonForm | undefined;
  queryClient: ReturnType<typeof useQueryClient>;
  shiny: boolean;
  species: SpeciesIndexEntry;
}) {
  useQuery({
    ...pokespriteRenderedSpriteQueryOptions(species, queryClient, shiny, form),
    enabled,
  });
}

function useAdjacentPokemonPrefetch({
  enabled,
  queryClient,
  shiny,
  species,
}: {
  enabled: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
  shiny: boolean;
  species: SpeciesIndexEntry;
}) {
  useEffect(() => {
    if (enabled === false) {
      return;
    }

    prefetchPokemonDetail(
      queryClient,
      getSpeciesByDexDelta(species, -1),
      shiny,
    );
    prefetchPokemonDetail(queryClient, getSpeciesByDexDelta(species, 1), shiny);
  }, [enabled, queryClient, shiny, species]);
}

function prefetchPokemonDetail(
  queryClient: ReturnType<typeof useQueryClient>,
  species: SpeciesIndexEntry | undefined,
  shiny: boolean,
) {
  if (species === undefined) {
    return;
  }

  void queryClient.prefetchQuery(
    pokemonDetailQueryOptions(species, queryClient),
  );
  void queryClient.prefetchQuery(
    pokespriteRenderedSpriteQueryOptions(species, queryClient, shiny),
  );
}

function getFormSelectorSelectedIndex(state: DetailState): number | undefined {
  return typeof state.detailOverlay === "object" &&
    state.detailOverlay.kind === "forms"
    ? state.detailOverlay.selectedIndex
    : undefined;
}

function DetailErrorView({ state }: { state: DetailState }) {
  return (
    <DetailScreen>
      <PokedexCard>
        <DetailCardTitle
          left={`Could not load #${state.species.dexNumbers[1] ?? state.species.dexNumbers[0]} ${state.species.name}`}
          right="Recoverable"
        />
        <box style={{ flexDirection: "column", gap: 1, padding: 1 }}>
          <text fg={colors.muted} attributes={textStyles.muted}>
            {state.errorMessage ??
              "Detail data is unavailable. If offline, this species is not cached yet."}
          </text>
        </box>
      </PokedexCard>
      <InstructionFooter>
        <KeyHints
          hints={[
            { key: "r", action: "retry" },
            { key: "/", action: "search" },
            { key: "q/esc", action: "exit" },
          ]}
        />
      </InstructionFooter>
    </DetailScreen>
  );
}
