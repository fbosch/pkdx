import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  applyAppKey,
  createInitialAppState,
  detailAbilitiesLoadFailed,
  detailAbilitiesLoaded,
  detailLoadFailed,
  detailLoadSucceeded,
  loadAdjacentDetailSpecies,
  type DetailNavigationDelta,
  type DetailState,
} from "../app-state";
import type { PokemonDetail, PokemonForm } from "../pokemon-detail";
import {
  pokemonAbilityDetailsQueryOptions,
  pokemonDetailQueryOptions,
} from "../pokemon-detail";
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
        onAbilityDetailsLoadFailed={() => {
          setState((current) =>
            current.screen === "detail"
              ? detailAbilitiesLoadFailed(current)
              : current,
          );
        }}
        onAbilityDetailsLoaded={() => {
          setState((current) =>
            current.screen === "detail"
              ? detailAbilitiesLoaded(current)
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
        state={state}
      />
    );
  }

  return <SearchView query={state.query} selectedIndex={state.selectedIndex} />;
}

type DetailViewProps = {
  onAbilityDetailsLoadFailed: () => void;
  onAbilityDetailsLoaded: () => void;
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
  state: DetailState;
};

type DetailLoadProps = Pick<
  DetailViewProps,
  "onLoadFailed" | "onLoadSucceeded" | "state"
>;
type AbilityDetailsPreloadProps = Pick<
  DetailViewProps,
  "onAbilityDetailsLoadFailed" | "onAbilityDetailsLoaded" | "state"
>;

function DetailView({
  onAbilityDetailsLoadFailed,
  onAbilityDetailsLoaded,
  onLoadFailed,
  onLoadSucceeded,
  onNavigate,
  state,
}: DetailViewProps) {
  usePokemonDetailLoad({
    onLoadFailed,
    onLoadSucceeded,
    state,
  });
  usePokemonSpritePrefetch({
    enabled: state.status !== "error",
    form: state.form,
    shiny: state.shiny,
    species: state.species,
  });
  useAdjacentPokemonPrefetch({
    enabled: state.status !== "error",
    shiny: state.shiny,
    species: state.species,
  });
  useAbilityDetailsPreload({
    onAbilityDetailsLoadFailed,
    onAbilityDetailsLoaded,
    state,
  });

  if (state.detail !== undefined) {
    return (
      <LoadedDetailView
        abilityViewerOpen={state.detailOverlay === "abilities"}
        detail={state.detail.detail}
        descriptionIndex={state.descriptionIndex}
        errorMessage={state.status === "error" ? state.errorMessage : undefined}
        evolutionViewerOpen={state.detailOverlay === "evolutions"}
        formSelectorSelectedIndex={getFormSelectorSelectedIndex(state)}
        loadedSpecies={state.detail.species}
        navigationSpecies={state.species}
        onNavigate={onNavigate}
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
          <SkeletonPanel height={18} width={42} />
          <box style={{ flexDirection: "column", width: 53 }}>
            <SkeletonPanel height={8} width={53} />
            <SkeletonPanel height={10} width={53} />
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
  state,
}: DetailLoadProps) {
  const queryClient = useQueryClient();
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
  shiny,
  species,
}: {
  enabled: boolean;
  form: PokemonForm | undefined;
  shiny: boolean;
  species: SpeciesIndexEntry;
}) {
  const queryClient = useQueryClient();
  useQuery({
    ...pokespriteRenderedSpriteQueryOptions(species, queryClient, shiny, form),
    enabled,
  });
}

function useAbilityDetailsPreload({
  onAbilityDetailsLoadFailed,
  onAbilityDetailsLoaded,
  state,
}: AbilityDetailsPreloadProps) {
  const queryClient = useQueryClient();
  const abilities = state.detail?.detail.abilities;
  const abilityDetails = useQuery({
    ...pokemonAbilityDetailsQueryOptions(abilities ?? [], queryClient),
    enabled:
      state.detailOverlay === "abilities-loading" && abilities !== undefined,
  });

  useEffect(() => {
    if (state.detailOverlay !== "abilities-loading") {
      return;
    }

    if (abilityDetails.data !== undefined) {
      onAbilityDetailsLoaded();
      return;
    }

    if (abilityDetails.isError) {
      onAbilityDetailsLoadFailed();
    }
  }, [
    abilityDetails.data,
    abilityDetails.isError,
    onAbilityDetailsLoadFailed,
    onAbilityDetailsLoaded,
    state.detailOverlay,
  ]);
}

function useAdjacentPokemonPrefetch({
  enabled,
  shiny,
  species,
}: {
  enabled: boolean;
  shiny: boolean;
  species: SpeciesIndexEntry;
}) {
  const queryClient = useQueryClient();
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
