import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import {
  useQuery,
  useQueryClient,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query";
import { startTransition, useEffect, useRef, useState } from "react";
import type { CliImageMode } from "#src/cli.tsx";
import {
  applyAppKey,
  createInitialAppState,
  detailAbilitiesLoadFailed,
  detailAbilitiesLoaded,
  loadAdjacentDetailSpecies,
  loadDetailSpecies,
  type AppKeyContext,
  type AppState,
  type DetailNavigationDelta,
  type DetailLoadStatus,
  type DetailState,
  type LoadedDetail,
} from "#src/app-state.ts";
import { appendDebugErrorLog } from "#src/error-log.ts";
import type { PokemonForm, PokemonFormIntent } from "#src/pokemon-detail.ts";
import {
  pokemonAbilityDetailsQueryOptions,
  pokemonDetailQueryOptions,
  pokemonFormTargetKey,
} from "#src/pokemon-detail.ts";
import {
  pokespriteCachedAssetQueryOptions,
  pokespriteRenderedSpriteQueryOptions,
} from "#src/pokesprite.ts";
import { prepareTerminalSpriteImage } from "#src/terminal-images.ts";
import { CacheDebugPanel } from "./CacheDebugPanel";
import { QueryDebugPanel } from "./QueryDebugPanel";
import {
  findSpeciesByIdentityOrAlias,
  getSpeciesByDexDelta,
  type SpeciesIndexEntry,
} from "#src/search/index.ts";
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
    if (state.screen === "detail") {
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
          debug={debug}
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
          onStateChange={(next) => {
            startTransition(() => {
              setState((current) =>
                current.screen === "detail" ? next : current,
              );
            });
          }}
          onNavigate={(delta, detail) => {
            startTransition(() => {
              setState((current) =>
                current.screen === "detail"
                  ? loadAdjacentDetailSpecies(current, delta, detail)
                  : current,
              );
            });
          }}
          onSelectSpecies={(name, detail) => {
            const species = findSpeciesByIdentityOrAlias(name);
            if (species === undefined) {
              return;
            }

            startTransition(() => {
              setState((current) =>
                current.screen === "detail"
                  ? loadDetailSpecies(current, species, detail)
                  : current,
              );
            });
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
        {debug ? <DebugPanels /> : null}
      </>
    );
  }

  return (
    <>
      <SearchView query={state.query} selectedIndex={state.selectedIndex} />
      {debug ? <DebugPanels /> : null}
    </>
  );
}

function DebugPanels() {
  return (
    <>
      <QueryDebugPanel />
      <CacheDebugPanel />
    </>
  );
}

async function openPokemonDbPokedexEntryInBrowser(species: SpeciesIndexEntry) {
  const { openPokemonDbPokedexEntry } = await import("../external-links");
  await openPokemonDbPokedexEntry(species);
}

function shouldOpenPokemonDbEntry(
  detail: LoadedDetail | undefined,
  state: DetailState,
  key: KeyEvent,
): detail is LoadedDetail {
  return (
    key.name === "o" &&
    detail !== undefined &&
    state.detailOverlay === undefined
  );
}

type DetailQueryTarget = {
  form: PokemonFormIntent | undefined;
  species: SpeciesIndexEntry;
};

type DetailViewProps = {
  debug: boolean;
  onAbilityDetailsLoadFailed: () => void;
  onAbilityDetailsLoaded: () => void;
  onCloseOverlay: () => void;
  onStateChange: (next: AppState) => void;
  onNavigate: (delta: DetailNavigationDelta, detail?: LoadedDetail) => void;
  onRenderError: (error: Error) => void;
  onSelectSpecies: (name: string, detail?: LoadedDetail) => void;
  state: DetailState;
  terminalImagesEnabled: boolean;
};
type AbilityDetailsPreloadProps = Pick<
  DetailViewProps,
  "onAbilityDetailsLoadFailed" | "onAbilityDetailsLoaded" | "state"
> & { detail: LoadedDetail | undefined };
type DetailViewContentProps = Pick<
  DetailViewProps,
  | "onCloseOverlay"
  | "onNavigate"
  | "onSelectSpecies"
  | "state"
  | "terminalImagesEnabled"
> & {
  detail: LoadedDetail | undefined;
  detailError: unknown;
  status: DetailLoadStatus;
};
type DetailKeyboardProps = Pick<DetailViewProps, "onStateChange" | "state"> & {
  detail?: LoadedDetail | undefined;
  detailStatus: "loading" | "ready" | "error";
  onResetError?: (() => void) | undefined;
};

function DetailView({
  debug,
  onAbilityDetailsLoadFailed,
  onAbilityDetailsLoaded,
  onCloseOverlay,
  onStateChange,
  onNavigate,
  onRenderError,
  onSelectSpecies,
  state,
  terminalImagesEnabled,
}: DetailViewProps) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <DetailErrorBoundary
      onError={onRenderError}
      renderError={(error) => (
        <DetailErrorFallback
          error={error}
          onResetError={reset}
          onStateChange={onStateChange}
          state={state}
        />
      )}
      resetKey={detailErrorBoundaryResetKey(state)}
    >
      <DetailQueryView
        debug={debug}
        onAbilityDetailsLoadFailed={onAbilityDetailsLoadFailed}
        onAbilityDetailsLoaded={onAbilityDetailsLoaded}
        onCloseOverlay={onCloseOverlay}
        onNavigate={onNavigate}
        onResetError={reset}
        onSelectSpecies={onSelectSpecies}
        onStateChange={onStateChange}
        state={state}
        terminalImagesEnabled={terminalImagesEnabled}
      />
    </DetailErrorBoundary>
  );
}

function DetailQueryView({
  debug,
  onAbilityDetailsLoadFailed,
  onAbilityDetailsLoaded,
  onCloseOverlay,
  onStateChange,
  onNavigate,
  onResetError,
  onSelectSpecies,
  state,
  terminalImagesEnabled,
}: Omit<DetailViewProps, "onRenderError"> & {
  onResetError: () => void;
}) {
  const { detailError, detailStatus, detailTarget, loadedDetail, refetch } =
    useLoadedDetailQuery(state);

  useDetailKeyboard({
    detail: loadedDetail,
    detailStatus,
    onResetError,
    onStateChange,
    state,
  });

  useEffect(() => {
    if (state.retryToken === 0 || detailStatus !== "error") {
      return;
    }

    void refetch();
  }, [detailStatus, refetch, state.retryToken]);

  useEffect(() => {
    if (debug === false || detailStatus !== "error") {
      return;
    }

    void appendDebugErrorLog(detailError, {
      event: "detail.loadFailed",
      form: detailTarget.form?.pokemonName,
      species: detailTarget.species.slug,
    });
  }, [debug, detailError, detailStatus, detailTarget]);

  usePokemonSpritePrefetch({
    enabled: true,
    form: resolvedDetailTargetPokemonForm(loadedDetail, detailTarget),
    shiny: state.shiny,
    species: detailTarget.species,
    terminalImagesEnabled,
  });
  useAdjacentPokemonPrefetch({
    enabled: true,
    prewarmSprites: true,
    shiny: state.shiny,
    species: detailTarget.species,
    terminalImagesEnabled,
  });
  useAbilityDetailsPreload({
    detail: loadedDetail,
    onAbilityDetailsLoadFailed,
    onAbilityDetailsLoaded,
    state,
  });

  return (
    <DetailViewContent
      onCloseOverlay={onCloseOverlay}
      onNavigate={onNavigate}
      onSelectSpecies={onSelectSpecies}
      detail={loadedDetail}
      detailError={detailError}
      status={detailStatus}
      state={state}
      terminalImagesEnabled={terminalImagesEnabled}
    />
  );
}

function useLoadedDetailQuery(state: DetailState) {
  const queryClient = useQueryClient();
  const previousLoadedDetail = useRef<LoadedDetail | undefined>(undefined);
  const detailTarget = { form: state.form, species: state.species };
  const detail = useQuery({
    ...pokemonDetailQueryOptions(
      detailTarget.species,
      queryClient,
      detailTarget.form,
    ),
  });
  const fetchedDetail =
    detail.data === undefined
      ? undefined
      : ({
          detail: detail.data,
          form: detail.data.form,
          species: detailTarget.species,
        } satisfies LoadedDetail);

  useEffect(() => {
    if (fetchedDetail !== undefined) {
      previousLoadedDetail.current = fetchedDetail;
    }
  }, [fetchedDetail]);

  const retainedDetail =
    previousLoadedDetail.current?.species.slug === state.species.slug
      ? previousLoadedDetail.current
      : undefined;
  const loadedDetail = fetchedDetail ?? retainedDetail;
  const detailStatus = detailLoadStatus(detail, loadedDetail);

  return {
    detailError: detail.error,
    detailStatus,
    detailTarget,
    loadedDetail,
    refetch: detail.refetch,
  };
}

function DetailErrorFallback({
  error,
  onResetError,
  onStateChange,
  state,
}: Pick<DetailKeyboardProps, "onResetError" | "onStateChange" | "state"> & {
  error: unknown;
}) {
  useDetailKeyboard({
    detailStatus: "error",
    onResetError,
    onStateChange,
    state,
  });

  return <DetailErrorView error={error} state={state} />;
}

function useDetailKeyboard({
  detail,
  detailStatus,
  onResetError,
  onStateChange,
  state,
}: DetailKeyboardProps) {
  useKeyboard((key: KeyEvent) => {
    if (shouldOpenPokemonDbEntry(detail, state, key)) {
      void openPokemonDbPokedexEntryInBrowser(detail.species);
      return;
    }

    if (key.name === "r" && detailStatus === "error") {
      onResetError?.();
    }

    const context: AppKeyContext = { detail, detailStatus };
    onStateChange(applyAppKey(state, key, context));
  });
}

function DetailViewContent({
  detail,
  detailError,
  onCloseOverlay,
  onNavigate,
  onSelectSpecies,
  status,
  state,
  terminalImagesEnabled,
}: DetailViewContentProps) {
  if (detail === undefined) {
    return status === "error" ? (
      <DetailErrorView error={detailError} state={state} />
    ) : (
      <InitialDetailLoadingView species={state.species} />
    );
  }

  const descriptionIndex = clampedDescriptionIndex(
    state.descriptionIndex,
    detail.detail,
  );
  return (
    <LoadedDetailView
      abilityViewerOpen={state.detailOverlay === "abilities"}
      detail={detail.detail}
      descriptionIndex={descriptionIndex}
      errorMessage={
        status === "error" ? detailErrorMessage(detailError) : undefined
      }
      evolutionViewerOpen={state.detailOverlay === "evolutions"}
      formSelectorSelectedIndex={getFormSelectorSelectedIndex(state)}
      loadedSpecies={detail.species}
      navigationSpecies={state.species}
      onCloseOverlay={onCloseOverlay}
      onNavigate={(delta) => onNavigate(delta, detail)}
      onSelectSpecies={(name) => onSelectSpecies(name, detail)}
      shiny={state.shiny}
      terminalImagesEnabled={terminalImagesEnabled}
    />
  );
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

function detailLoadStatus(
  query: { data: unknown; isError: boolean; isPending: boolean },
  loadedDetail: LoadedDetail | undefined,
): DetailLoadStatus {
  if (query.isError) {
    return "error";
  }

  if (query.data !== undefined || loadedDetail !== undefined) {
    return "ready";
  }

  return query.isPending ? "loading" : "loading";
}

function detailErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "Detail data is unavailable. If offline, this species is not cached yet.";
}

function clampedDescriptionIndex(
  index: number,
  detail: LoadedDetail["detail"],
): number {
  return Math.min(index, Math.max(0, detail.flavorTexts.length - 1));
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

function resolvedDetailTargetPokemonForm(
  detail: LoadedDetail | undefined,
  target: DetailQueryTarget,
): PokemonForm | undefined {
  if (
    detail === undefined ||
    detail.species.slug !== target.species.slug ||
    pokemonFormTargetKey(detail.form) !== pokemonFormTargetKey(target.form)
  ) {
    return undefined;
  }

  return detail.form;
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
}

function useAbilityDetailsPreload({
  detail,
  onAbilityDetailsLoadFailed,
  onAbilityDetailsLoaded,
  state,
}: AbilityDetailsPreloadProps) {
  const queryClient = useQueryClient();
  const abilities = detail?.detail.abilities;
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
  prewarmSprites,
  shiny,
  species,
  terminalImagesEnabled,
}: {
  enabled: boolean;
  prewarmSprites: boolean;
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
      prewarmSprites,
      terminalImageSupport !== undefined,
    );
    prefetchPokemonDetail(
      queryClient,
      getSpeciesByDexDelta(species, 1),
      shiny,
      prewarmSprites,
      terminalImageSupport !== undefined,
    );
  }, [
    enabled,
    prewarmSprites,
    queryClient,
    shiny,
    species,
    terminalImageSupport,
  ]);
}

function prefetchPokemonDetail(
  queryClient: ReturnType<typeof useQueryClient>,
  species: SpeciesIndexEntry | undefined,
  shiny: boolean,
  prefetchSprite: boolean,
  terminalImagesEnabled: boolean,
) {
  if (species === undefined) {
    return;
  }

  void queryClient.prefetchQuery(
    pokemonDetailQueryOptions(species, queryClient),
  );
  if (prefetchSprite === false) {
    return;
  }

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

function DetailErrorView({
  error,
  state,
}: {
  error: unknown;
  state: DetailState;
}) {
  return (
    <DetailScreen>
      <DetailErrorModal
        message={detailErrorMessage(error)}
        title={`Could Not Load #${state.species.dexNumbers[1] ?? state.species.dexNumbers[0]} ${state.species.name}`}
      />
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
