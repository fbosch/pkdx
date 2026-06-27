import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { CliImageMode } from "../cli";
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
import { appendDebugErrorLog } from "../error-log";
import type { PokemonDetail, PokemonForm } from "../pokemon-detail";
import {
  pokemonAbilityDetailsQueryOptions,
  pokemonDetailQueryOptions,
  pokemonFormTargetKey,
} from "../pokemon-detail";
import {
  pokespriteCachedAssetQueryOptions,
  pokespriteRenderedSpriteQueryOptions,
} from "../pokesprite";
import { prepareTerminalSpriteImage } from "../terminal-images";
import { QueryDebugPanel } from "./QueryDebugPanel";
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
import { colors } from "./design-tokens";
import {
  DexNavigationButtons,
  LoadedDetailView,
  detailDamagePanelWidth,
  detailFactsPanelHeight,
  detailFlavorPanelHeight,
  detailInfoPanelWidth,
  detailLowerPanelHeight,
  detailSpritePanelHeight,
  detailSpritePanelWidth,
  detailStatsPanelWidth,
} from "./detail/LoadedDetailView";
import {
  DetailErrorBoundary,
  DetailErrorModal,
} from "./detail/DetailErrorModal";
import { SearchView } from "./search/SearchView";
import { useTerminalImageSupport } from "./useTerminalImageSupport";
import {
  detailSpriteCanvasHeight,
  detailSpriteCanvasWidth,
} from "./detail/PokemonSpritePanel";

type AppProps = {
  debug?: boolean;
  imageMode?: CliImageMode;
  initialQuery?: string;
  onExit: () => void;
};

export function App({
  debug = false,
  imageMode = "builtin",
  initialQuery = "",
  onExit,
}: AppProps) {
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
      <>
        <DetailView
          onLoadFailed={(species, form, error) => {
            if (debug) {
              void appendDebugErrorLog(error, {
                event: "detail.loadFailed",
                form: form?.pokemonName,
                species: species.slug,
              });
            }

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
          onRenderError={(error) => {
            if (debug) {
              void appendDebugErrorLog(error, {
                event: "detail.renderFailed",
                form: state.form?.pokemonName,
                species: state.species.slug,
              });
            }
          }}
          state={state}
          onCloseOverlay={() => {
            setState((current) => applyAppKey(current, { name: "escape" }));
          }}
          terminalImagesEnabled={imageMode === "builtin"}
        />
        {debug ? <QueryDebugPanel /> : null}
      </>
    );
  }

  return (
    <>
      <SearchView query={state.query} selectedIndex={state.selectedIndex} />
      {debug ? <QueryDebugPanel /> : null}
    </>
  );
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
  onRenderError: (error: Error) => void;
  onSelectSpecies: (name: string) => void;
  state: DetailState;
  terminalImagesEnabled: boolean;
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
type DetailViewContentProps = Pick<
  DetailViewProps,
  | "onCloseOverlay"
  | "onNavigate"
  | "onSelectSpecies"
  | "state"
  | "terminalImagesEnabled"
>;

const detailQueryDebounceMs = 100;
export const detailLoadingPlaceholderDelayMs = 50;

function DetailView({
  onAbilityDetailsLoadFailed,
  onAbilityDetailsLoaded,
  onCloseOverlay,
  onLoadFailed,
  onLoadSucceeded,
  onNavigate,
  onRenderError,
  onSelectSpecies,
  state,
  terminalImagesEnabled,
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
    terminalImagesEnabled,
  });
  useAdjacentPokemonPrefetch({
    enabled: state.status !== "error",
    shiny: state.shiny,
    species: detailTarget.species,
    terminalImagesEnabled,
  });
  useAbilityDetailsPreload({
    onAbilityDetailsLoadFailed,
    onAbilityDetailsLoaded,
    state,
  });

  return (
    <DetailErrorBoundary
      onError={onRenderError}
      resetKey={detailErrorBoundaryResetKey(state)}
    >
      <DetailViewContent
        onCloseOverlay={onCloseOverlay}
        onNavigate={onNavigate}
        onSelectSpecies={onSelectSpecies}
        state={state}
        terminalImagesEnabled={terminalImagesEnabled}
      />
    </DetailErrorBoundary>
  );
}

function DetailViewContent({
  onCloseOverlay,
  onNavigate,
  onSelectSpecies,
  state,
  terminalImagesEnabled,
}: DetailViewContentProps) {
  const showPreviousSearch = usePreviousSearchDuringDetailLoad(state);

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
        terminalImagesEnabled={terminalImagesEnabled}
      />
    );
  }

  if (state.status === "loading") {
    return showPreviousSearch ? (
      <SearchView
        query={state.previousQuery}
        selectedIndex={state.previousSelectedIndex}
      />
    ) : (
      <InitialDetailLoadingView species={state.species} />
    );
  }

  return <DetailErrorView state={state} />;
}

function usePreviousSearchDuringDetailLoad(state: DetailState): boolean {
  const shouldDelayPlaceholder =
    shouldShowPreviousSearchDuringDetailLoad(state);
  const [showPreviousSearch, setShowPreviousSearch] = useState(
    () => shouldDelayPlaceholder,
  );

  useEffect(() => {
    if (shouldDelayPlaceholder === false) {
      setShowPreviousSearch(false);
      return;
    }

    setShowPreviousSearch(true);
    const timeout = setTimeout(() => {
      setShowPreviousSearch(false);
    }, detailLoadingPlaceholderDelayMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [shouldDelayPlaceholder]);

  return showPreviousSearch;
}

export function shouldShowPreviousSearchDuringDetailLoad(
  state: DetailState,
): boolean {
  return state.status === "loading" && state.previousQuery.length > 0;
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
            height={detailLowerPanelHeight}
            width={detailStatsPanelWidth}
          />
          <SkeletonPanel
            height={detailLowerPanelHeight}
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

function detailErrorBoundaryResetKey(state: DetailState): string {
  return [
    state.species.slug,
    pokemonFormTargetKey(state.form),
    state.retryToken.toString(),
  ].join(":");
}

function usePokemonSpritePrefetch({
  enabled,
  form,
  shiny,
  species,
  terminalImagesEnabled,
}: {
  enabled: boolean;
  form: PokemonForm | undefined;
  shiny: boolean;
  species: SpeciesIndexEntry;
  terminalImagesEnabled: boolean;
}) {
  const queryClient = useQueryClient();
  const detectedTerminalImageSupport = useTerminalImageSupport();
  const terminalImageSupport = terminalImagesEnabled
    ? detectedTerminalImageSupport
    : undefined;
  const cachedAsset = useQuery({
    ...pokespriteCachedAssetQueryOptions(species, queryClient, shiny, form),
    enabled: enabled && terminalImageSupport !== undefined,
  });
  useQuery({
    ...pokespriteRenderedSpriteQueryOptions(species, queryClient, shiny, form),
    enabled: enabled && terminalImageSupport === undefined,
  });
  useEffect(() => {
    if (cachedAsset.data === undefined || terminalImageSupport === undefined) {
      return;
    }

    void prewarmTerminalSpriteImage(cachedAsset.data.filePath);
  }, [cachedAsset.data, terminalImageSupport]);
  useEffect(() => {
    if (enabled === false || terminalImageSupport === undefined) {
      return;
    }

    void queryClient
      .fetchQuery(
        pokespriteCachedAssetQueryOptions(species, queryClient, !shiny, form),
      )
      .then((asset) => prewarmTerminalSpriteImage(asset.filePath))
      .catch(() => undefined);
  }, [enabled, form, queryClient, shiny, species, terminalImageSupport]);
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
  terminalImagesEnabled,
}: {
  enabled: boolean;
  shiny: boolean;
  species: SpeciesIndexEntry;
  terminalImagesEnabled: boolean;
}) {
  const queryClient = useQueryClient();
  const detectedTerminalImageSupport = useTerminalImageSupport();
  const terminalImageSupport = terminalImagesEnabled
    ? detectedTerminalImageSupport
    : undefined;
  useEffect(() => {
    if (enabled === false) {
      return;
    }

    prefetchPokemonDetail(
      queryClient,
      getSpeciesByDexDelta(species, -1),
      shiny,
      terminalImageSupport !== undefined,
    );
    prefetchPokemonDetail(
      queryClient,
      getSpeciesByDexDelta(species, 1),
      shiny,
      terminalImageSupport !== undefined,
    );
  }, [enabled, queryClient, shiny, species, terminalImageSupport]);
}

function prefetchPokemonDetail(
  queryClient: ReturnType<typeof useQueryClient>,
  species: SpeciesIndexEntry | undefined,
  shiny: boolean,
  terminalImagesEnabled: boolean,
) {
  if (species === undefined) {
    return;
  }

  void queryClient.prefetchQuery(
    pokemonDetailQueryOptions(species, queryClient),
  );
  if (terminalImagesEnabled) {
    void queryClient
      .fetchQuery(
        pokespriteCachedAssetQueryOptions(species, queryClient, shiny),
      )
      .then((asset) => prewarmTerminalSpriteImage(asset.filePath))
      .catch(() => undefined);
    return;
  }

  void queryClient.prefetchQuery(
    pokespriteRenderedSpriteQueryOptions(species, queryClient, shiny),
  );
}

async function prewarmTerminalSpriteImage(filePath: string): Promise<void> {
  await prepareTerminalSpriteImage(filePath, {
    height: detailSpriteCanvasHeight,
    width: detailSpriteCanvasWidth,
  }).catch(() => undefined);
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
      <DetailErrorModal
        message={
          state.errorMessage ??
          "Detail data is unavailable. If offline, this species is not cached yet."
        }
        title={`Could Not Load #${state.species.dexNumbers[1] ?? state.species.dexNumbers[0]} ${state.species.name}`}
      />
      <InstructionFooter>
        <KeyHints
          hints={[
            { key: "r", action: "retry" },
            { key: "/", action: "search" },
            { key: "ctrl-c", action: "exit" },
          ]}
        />
      </InstructionFooter>
    </DetailScreen>
  );
}
