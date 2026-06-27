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
  loadDetailSpecies,
  type DetailNavigationDelta,
  type DetailState,
} from "../app-state";
import type { PokemonDetail, PokemonForm } from "../pokemon-detail";
import {
  pokemonAbilityDetailsQueryOptions,
  pokemonDetailQueryOptions,
  pokemonFormTargetKey,
} from "../pokemon-detail";
import { pokespriteRenderedSpriteQueryOptions } from "../pokesprite";
import {
  findExactSpecies,
  getSpeciesByDexDelta,
  type SpeciesIndexEntry,
} from "../search";
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
  detailDamagePanelWidth,
  detailFactsPanelHeight,
  detailFlavorPanelHeight,
  detailInfoPanelWidth,
  detailLowerPanelMinHeight,
  detailSpritePanelHeight,
  detailSpritePanelWidth,
  detailStatsPanelWidth,
} from "./detail/LoadedDetailView";
import { SearchView } from "./search/SearchView";

type AppProps = {
  initialQuery?: string;
  onExit: () => void;
};

export function App({ initialQuery = "", onExit }: AppProps) {
  const [state, setState] = useState(() => createInitialAppState(initialQuery));

  useKeyboard((key: KeyEvent) => {
    if (shouldOpenPokemonDbEntry(state, key)) {
      void openPokemonDbPokedexEntryInBrowser(state.detail.species);
      return;
    }

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
        onSelectSpecies={(name) => {
          const species = findExactSpecies(name);
          if (species === undefined) {
            return;
          }

          setState((current) =>
            current.screen === "detail"
              ? loadDetailSpecies(current, species)
              : current,
          );
        }}
        state={state}
        onCloseOverlay={() => {
          setState((current) => applyAppKey(current, { name: "escape" }));
        }}
      />
    );
  }

  return <SearchView query={state.query} selectedIndex={state.selectedIndex} />;
}

async function openPokemonDbPokedexEntryInBrowser(species: SpeciesIndexEntry) {
  const { openPokemonDbPokedexEntry } = await import("../external-links");
  await openPokemonDbPokedexEntry(species);
}

function shouldOpenPokemonDbEntry(
  state: ReturnType<typeof createInitialAppState>,
  key: KeyEvent,
): state is DetailState & { detail: NonNullable<DetailState["detail"]> } {
  return (
    key.name === "o" &&
    state.screen === "detail" &&
    state.detail !== undefined &&
    state.detailOverlay === undefined
  );
}

type DetailViewProps = {
  onAbilityDetailsLoadFailed: () => void;
  onAbilityDetailsLoaded: () => void;
  onCloseOverlay: () => void;
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
  onSelectSpecies: (name: string) => void;
  state: DetailState;
};

type DetailLoadProps = Pick<
  DetailViewProps,
  "onLoadFailed" | "onLoadSucceeded" | "state"
> & { target: DetailQueryTarget };
type AbilityDetailsPreloadProps = Pick<
  DetailViewProps,
  "onAbilityDetailsLoadFailed" | "onAbilityDetailsLoaded" | "state"
>;
type DetailQueryTarget = {
  form: PokemonForm | undefined;
  species: SpeciesIndexEntry;
};

const detailQueryDebounceMs = 100;

function DetailView({
  onAbilityDetailsLoadFailed,
  onAbilityDetailsLoaded,
  onCloseOverlay,
  onLoadFailed,
  onLoadSucceeded,
  onNavigate,
  onSelectSpecies,
  state,
}: DetailViewProps) {
  const detailTarget = useDebouncedDetailTarget(
    state.species,
    state.form,
    detailQueryDebounceMs,
  );
  usePokemonDetailLoad({
    onLoadFailed,
    onLoadSucceeded,
    state,
    target: detailTarget,
  });
  usePokemonSpritePrefetch({
    enabled: state.status !== "error",
    form: detailTarget.form,
    shiny: state.shiny,
    species: detailTarget.species,
  });
  useAdjacentPokemonPrefetch({
    enabled: state.status !== "error",
    shiny: state.shiny,
    species: detailTarget.species,
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
        onCloseOverlay={onCloseOverlay}
        onNavigate={onNavigate}
        onSelectSpecies={onSelectSpecies}
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
          <SkeletonPanel
            height={detailSpritePanelHeight}
            width={detailSpritePanelWidth}
          />
          <box style={{ flexDirection: "column", width: detailInfoPanelWidth }}>
            <SkeletonPanel
              height={detailFlavorPanelHeight}
              width={detailInfoPanelWidth}
            />
            <SkeletonPanel
              height={detailFactsPanelHeight}
              width={detailInfoPanelWidth}
            />
          </box>
        </box>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <SkeletonPanel
            height={detailLowerPanelMinHeight}
            width={detailStatsPanelWidth}
          />
          <SkeletonPanel
            height={detailLowerPanelMinHeight}
            width={detailDamagePanelWidth}
          />
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
  target,
}: DetailLoadProps) {
  const queryClient = useQueryClient();
  const retryErrorUpdatedAt = useRef<number | undefined>(undefined);
  const targetIsCurrent = detailTargetsMatch(target, state.species, state.form);
  const detail = useQuery({
    ...pokemonDetailQueryOptions(target.species, queryClient, target.form),
    enabled: state.status !== "error" && targetIsCurrent,
  });

  useEffect(() => {
    if (
      targetIsCurrent &&
      detail.data !== undefined &&
      state.status !== "ready"
    ) {
      retryErrorUpdatedAt.current = undefined;
      onLoadSucceeded(target.species, detail.data);
    }
  }, [
    detail.data,
    onLoadSucceeded,
    state.status,
    target.species,
    targetIsCurrent,
  ]);

  useEffect(() => {
    if (targetIsCurrent && state.retryToken > 0 && state.status === "loading") {
      retryErrorUpdatedAt.current = detail.errorUpdatedAt;
      void detail.refetch();
    }
  }, [
    detail.errorUpdatedAt,
    detail.refetch,
    state.retryToken,
    state.status,
    targetIsCurrent,
  ]);

  useEffect(() => {
    if (
      detail.isError &&
      !detail.isFetching &&
      targetIsCurrent &&
      state.status !== "error" &&
      retryErrorUpdatedAt.current !== detail.errorUpdatedAt
    ) {
      retryErrorUpdatedAt.current = undefined;
      onLoadFailed(target.species, target.form, detail.error);
    }
  }, [
    detail.error,
    detail.errorUpdatedAt,
    detail.isError,
    detail.isFetching,
    onLoadFailed,
    state.status,
    target.form,
    target.species,
    targetIsCurrent,
  ]);
}

function useDebouncedDetailTarget(
  species: SpeciesIndexEntry,
  form: PokemonForm | undefined,
  delayMs: number,
): DetailQueryTarget {
  const [target, setTarget] = useState<DetailQueryTarget>(() => ({
    form,
    species,
  }));

  useEffect(() => {
    if (detailTargetsMatch(target, species, form)) {
      return;
    }

    const timeout = setTimeout(() => {
      setTarget({ form, species });
    }, delayMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [delayMs, form, species, target]);

  return target;
}

function detailTargetsMatch(
  target: DetailQueryTarget,
  species: SpeciesIndexEntry,
  form: PokemonForm | undefined,
): boolean {
  return (
    target.species.slug === species.slug &&
    pokemonFormTargetKey(target.form) === pokemonFormTargetKey(form)
  );
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
