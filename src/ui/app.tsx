import { RGBA, type KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  applyAppKey,
  createInitialAppState,
  detailLoadFailed,
  detailLoadSucceeded,
  type DetailState,
} from "../app-state";
import type {
  PokemonAbilityDetail,
  PokemonDetail,
  PokemonForm,
} from "../pokemon-detail";
import {
  pokemonAbilityDetailsQueryOptions,
  pokemonDetailQueryOptions,
} from "../pokemon-detail";
import { pokespriteRenderedSpriteQueryOptions } from "../pokesprite";
import { minimumSearchQueryLength, searchResults } from "../search";
import type { SpeciesIndexEntry } from "../search";
import type { RenderedSprite, SpriteCell } from "../sprite-rendering";
import type { DamageTaken, DamageTakenEntry } from "../type-matchups";
import {
  DetailCardTitle,
  DetailScreen,
  InstructionFooter,
  KeyHints,
  Modal,
  PokedexCard,
  PokedexHeader,
  StatBar,
  TypeTag,
  TypeLabels,
  keyHintsWidth,
  typeLabelsWidth,
} from "./components";
import { colors, textStyles } from "./design-tokens";

const detailLoadingGraceMs = 120;
const detailInfoPanelWidth = 53;
const detailSpriteCanvasHeight = 15;
const detailSpriteCanvasWidth = 40;
const detailSpritePanelHeight = 17;
const detailSpritePanelWidth = 42;

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
        queryClient={queryClient}
        state={state}
      />
    );
  }

  const results = searchResults(state.query, state.selectedIndex);
  const queryLabel =
    state.query.length === 0 ? "Search Pokemon species..." : state.query;
  const hasSearchableQuery =
    state.query.trim().length >= minimumSearchQueryLength;

  return (
    <box
      style={{
        alignItems: "center",
        flexDirection: "column",
        justifyContent: "center",
        padding: 1,
        height: "100%",
        position: "relative",
      }}
    >
      <box style={{ position: "relative", width: 56 }}>
        <box
          border
          borderColor={colors.accent}
          borderStyle="rounded"
          style={{ flexDirection: "column", paddingX: 1, width: 56 }}
        >
          <text
            attributes={
              state.query.length === 0 ? textStyles.muted : textStyles.active
            }
            {...(state.query.length === 0 ? { fg: colors.muted } : {})}
          >{`> ${queryLabel}`}</text>
        </box>
        <PokedexHeader />
        {hasSearchableQuery ? (
          <box
            style={{
              flexDirection: "column",
              left: 0,
              position: "absolute",
              top: 3,
              width: 56,
              zIndex: 100,
            }}
          >
            {results.length === 0 ? (
              <text fg={colors.muted} attributes={textStyles.muted}>
                No species match this query.
              </text>
            ) : null}
            {results.map((result) => {
              const label = ` #${result.dexNumbers[1] ?? result.dexNumbers[0]} ${result.name}`;

              return (
                <text
                  key={result.slug}
                  attributes={
                    result.selected ? textStyles.selected : textStyles.normal
                  }
                  {...(result.selected
                    ? { bg: colors.selected, fg: colors.selectedText }
                    : {})}
                >
                  {result.selected ? label.padEnd(56) : label}
                </text>
              );
            })}
          </box>
        ) : null}
      </box>

      <InstructionFooter>
        <KeyHints
          hints={[
            { key: "type", action: "filter" },
            { key: "ctrl+u", action: "clear" },
            { key: "ctrl+j/k", action: "move" },
            { key: "enter", action: "open" },
            { key: "esc", action: "exit" },
          ]}
        />
      </InstructionFooter>
    </box>
  );
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
  queryClient: ReturnType<typeof useQueryClient>;
  state: DetailState;
};

function DetailView({
  onLoadFailed,
  onLoadSucceeded,
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
  const showColdLoadingSkeleton = useDelayedVisibility(
    state.detail === undefined && state.status === "loading",
    state.species.slug,
  );

  if (state.detail !== undefined) {
    return (
      <LoadedDetailView
        abilityViewerOpen={state.detailOverlay === "abilities"}
        detail={state.detail.detail}
        descriptionIndex={state.descriptionIndex}
        errorMessage={state.status === "error" ? state.errorMessage : undefined}
        formSelectorSelectedIndex={getFormSelectorSelectedIndex(state)}
        loadedSpecies={state.detail.species}
        loadingSpecies={state.status === "loading" ? state.species : undefined}
        queryClient={queryClient}
        shiny={state.shiny}
      />
    );
  }

  if (state.status === "loading") {
    return showColdLoadingSkeleton ? (
      <DetailLoadingSkeleton species={state.species} />
    ) : (
      <DetailScreen>{null}</DetailScreen>
    );
  }

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

function usePokemonDetailLoad({
  onLoadFailed,
  onLoadSucceeded,
  queryClient,
  state,
}: DetailViewProps) {
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

function getFormSelectorSelectedIndex(state: DetailState): number | undefined {
  return typeof state.detailOverlay === "object" &&
    state.detailOverlay.kind === "forms"
    ? state.detailOverlay.selectedIndex
    : undefined;
}

function useDelayedVisibility(active: boolean, key: string): boolean {
  const [visibleKey, setVisibleKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!active) {
      setVisibleKey(undefined);
      return;
    }

    setVisibleKey(undefined);
    const timeout = setTimeout(() => {
      setVisibleKey(key);
    }, detailLoadingGraceMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [active, key]);

  return visibleKey === key;
}

export function DetailLoadingSkeleton({
  species,
}: {
  species: DetailState["species"];
}) {
  const dexNumber = (species.dexNumbers[1] ?? species.dexNumbers[0] ?? 0)
    .toString()
    .padStart(3, "0");
  const title = `#${dexNumber} ${species.name}`;

  return (
    <DetailScreen>
      <PokedexCard>
        <DetailCardTitle
          left={
            <span>
              <span fg={colors.muted}>#{dexNumber}</span>
              <span> {species.name}</span>
            </span>
          }
          leftWidth={title.length}
          right={<span fg={colors.muted}>Loading</span>}
          rightWidth={7}
        />
        <text fg={colors.muted} attributes={textStyles.muted}>
          <SkeletonLine width={22} />
        </text>
        <box style={{ alignItems: "flex-start", flexDirection: "row", gap: 1 }}>
          <box
            border
            borderColor={colors.panelSecondary}
            borderStyle="rounded"
            style={{
              alignItems: "center",
              flexDirection: "column",
              height: detailSpritePanelHeight,
              justifyContent: "center",
              paddingX: 1,
              width: detailSpritePanelWidth,
            }}
          >
            <box
              style={{
                alignItems: "center",
                flexDirection: "column",
                gap: 1,
                height: detailSpriteCanvasHeight,
                justifyContent: "center",
                width: detailSpriteCanvasWidth,
              }}
            >
              <SkeletonText width={10} />
              <SkeletonText width={16} />
              <SkeletonText width={12} />
            </box>
          </box>
          <box style={{ flexDirection: "column", width: detailInfoPanelWidth }}>
            <DetailPanel minHeight={7} width={detailInfoPanelWidth}>
              <SkeletonText width={46} />
              <SkeletonText width={40} />
              <SkeletonText width={34} />
            </DetailPanel>
            <DetailPanel width={detailInfoPanelWidth}>
              {(
                [
                  ["Species", 20],
                  ["Egg Group", 18],
                  ["Gender", 24],
                  ["Height", 10],
                  ["Weight", 12],
                  ["Ability", 22],
                ] satisfies [string, number][]
              ).map(([label, width]) => (
                <SkeletonFactRow key={label} label={label} width={width} />
              ))}
            </DetailPanel>
          </box>
        </box>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <DetailPanel width={45}>
            <text attributes={textStyles.active}>Stats</text>
            {[
              "HP",
              "Attack",
              "Defense",
              "Sp. Attack",
              "Sp. Defense",
              "Speed",
            ].map((label) => (
              <text key={label} fg={colors.muted} attributes={textStyles.muted}>
                <span>{label.padEnd(11)}</span>
                <span> </span>
                <SkeletonLine width={20} />
              </text>
            ))}
          </DetailPanel>
          <DetailPanel width={50}>
            <text attributes={textStyles.active}>Damage Taken</text>
            <SkeletonText width={38} />
            <SkeletonText width={28} />
            <text> </text>
            <SkeletonText width={34} />
            <SkeletonText width={24} />
          </DetailPanel>
        </box>
      </PokedexCard>
      <InstructionFooter>
        <KeyHints
          hints={[
            { key: "/", action: "search" },
            { key: "q/esc", action: "exit" },
          ]}
        />
      </InstructionFooter>
    </DetailScreen>
  );
}

function DetailPanel({
  children,
  minHeight,
  width,
}: {
  children: ReactNode;
  minHeight?: number;
  width: number;
}) {
  return (
    <box
      border
      borderColor={colors.panelSecondary}
      borderStyle="rounded"
      style={{
        flexDirection: "column",
        ...(minHeight === undefined ? {} : { minHeight }),
        paddingX: 1,
        position: "relative",
        width,
      }}
    >
      {children}
    </box>
  );
}

function SkeletonFactRow({ label, width }: { label: string; width: number }) {
  return (
    <text fg={colors.muted} attributes={textStyles.muted}>
      <span>{label.padEnd(11)}</span>
      <SkeletonLine width={width} />
    </text>
  );
}

function SkeletonText({ width }: { width: number }) {
  return (
    <text fg={colors.muted} attributes={textStyles.muted}>
      <SkeletonLine width={width} />
    </text>
  );
}

function SkeletonLine({ width }: { width: number }) {
  return <span>{"░".repeat(width)}</span>;
}

type LoadedDetailViewProps = {
  abilityViewerOpen: boolean;
  detail: PokemonDetail;
  descriptionIndex: number;
  errorMessage: string | undefined;
  formSelectorSelectedIndex: number | undefined;
  loadedSpecies: SpeciesIndexEntry;
  loadingSpecies: DetailState["species"] | undefined;
  queryClient: ReturnType<typeof useQueryClient>;
  shiny: boolean;
};

function LoadedDetailView({
  abilityViewerOpen,
  detail,
  descriptionIndex,
  errorMessage,
  formSelectorSelectedIndex,
  loadedSpecies,
  loadingSpecies,
  queryClient,
  shiny,
}: LoadedDetailViewProps) {
  return (
    <DetailScreen>
      <PokedexCard>
        <DetailCardTitle
          left={
            <span>
              <span fg={colors.muted}>
                #{detail.dexNumber.toString().padStart(3, "0")}
              </span>
              <span> {detail.name}</span>
            </span>
          }
          leftWidth={
            `#${detail.dexNumber.toString().padStart(3, "0")} ${detail.name}`
              .length
          }
          right={<TypeLabels types={detail.types} />}
          rightWidth={typeLabelsWidth(detail.types)}
        />
        {loadingSpecies !== undefined ? (
          <text fg={colors.muted} attributes={textStyles.muted}>
            Loading next: #
            {loadingSpecies.dexNumbers[1] ?? loadingSpecies.dexNumbers[0]}{" "}
            {loadingSpecies.name}...
          </text>
        ) : errorMessage === undefined ? (
          <text> </text>
        ) : null}
        {errorMessage !== undefined ? (
          <text fg={colors.muted} attributes={textStyles.muted}>
            Could not load next Detail: {errorMessage}. Press r to retry or / to
            search.
          </text>
        ) : null}
        <box style={{ alignItems: "flex-start", flexDirection: "row", gap: 1 }}>
          <box
            border
            borderColor={colors.panelSecondary}
            borderStyle="rounded"
            style={{
              alignItems: "center",
              flexDirection: "column",
              height: detailSpritePanelHeight,
              justifyContent: "center",
              paddingX: 1,
              position: "relative",
              width: detailSpritePanelWidth,
            }}
          >
            {shiny ? <PokemonSpriteShinyMarker /> : null}
            <PokemonSpritePanel
              form={detail.form}
              queryClient={queryClient}
              shiny={shiny}
              species={loadedSpecies}
            />
          </box>
          <box style={{ flexDirection: "column", width: detailInfoPanelWidth }}>
            <DetailPanel minHeight={7} width={detailInfoPanelWidth}>
              <FlavorTextPanel
                detail={detail}
                selectedIndex={descriptionIndex}
              />
            </DetailPanel>
            <DetailPanel width={detailInfoPanelWidth}>
              <FactRow label="Species" value={detail.species} />
              <FactRow label="Egg Group" value={detail.eggGroups.join(" / ")} />
              <FactRow
                label="Gender"
                value={<GenderRatio ratio={detail.genderRatio} />}
              />
              <FactRow
                label="Height"
                value={`${detail.heightMeters.toFixed(1)} m`}
              />
              <FactRow
                label="Weight"
                value={`${detail.weightKilograms.toFixed(1)} kg`}
              />
              {detail.abilities.map((ability, index) => (
                <FactRow
                  key={ability.name}
                  label={index === 0 ? "Ability" : ""}
                  value={`${ability.name}${ability.isHidden ? " (Hidden)" : ""}`}
                />
              ))}
            </DetailPanel>
          </box>
        </box>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <DetailPanel width={45}>
            <text attributes={textStyles.active}>Stats</text>
            {detail.stats.map((stat) => (
              <text key={stat.name}>
                <span>{stat.name.padEnd(11)}</span>
                <span> {stat.base.toString().padStart(3)} </span>
                <StatBar name={stat.name} value={stat.base} />
              </text>
            ))}
          </DetailPanel>
          <DetailPanel width={50}>
            <DamageTakenPanel damageTaken={detail.damageTaken} />
          </DetailPanel>
        </box>
      </PokedexCard>
      <DetailOverlays
        abilityViewerOpen={abilityViewerOpen}
        detail={detail}
        formSelectorSelectedIndex={formSelectorSelectedIndex}
        queryClient={queryClient}
      />
      <LoadedDetailFooter
        hasAlternateForms={detail.forms.length > 1}
        shiny={shiny}
      />
    </DetailScreen>
  );
}

function DetailOverlays({
  abilityViewerOpen,
  detail,
  formSelectorSelectedIndex,
  queryClient,
}: {
  abilityViewerOpen: boolean;
  detail: PokemonDetail;
  formSelectorSelectedIndex: number | undefined;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  return (
    <>
      {abilityViewerOpen ? (
        <AbilityViewer abilities={detail.abilities} queryClient={queryClient} />
      ) : null}
      {formSelectorSelectedIndex === undefined ? null : (
        <FormSelector
          currentForm={detail.form}
          forms={detail.forms}
          selectedIndex={formSelectorSelectedIndex}
        />
      )}
    </>
  );
}

function LoadedDetailFooter({
  hasAlternateForms,
  shiny,
}: {
  hasAlternateForms: boolean;
  shiny: boolean;
}) {
  return (
    <InstructionFooter>
      <KeyHints
        hints={[
          { key: "a", action: "abilities" },
          ...(hasAlternateForms ? [{ key: "f", action: "forms" }] : []),
          { key: "d/D", action: "desc" },
          { key: "s", action: shiny ? "regular" : "shiny" },
          { key: "/", action: "search" },
          { key: "q/esc", action: "exit" },
        ]}
      />
    </InstructionFooter>
  );
}

function FlavorTextPanel({
  detail,
  selectedIndex,
}: {
  detail: PokemonDetail;
  selectedIndex: number;
}) {
  const selected = detail.flavorTexts[selectedIndex];
  const text = selected?.text ?? detail.flavorText;
  const source = selected?.source ?? "Unknown";
  const count = Math.max(1, detail.flavorTexts.length);
  const displayIndex = Math.min(selectedIndex + 1, count);

  return (
    <>
      <text>{text}</text>
      <text
        fg={colors.muted}
        attributes={textStyles.muted}
        style={{ bottom: 0, position: "absolute", right: 1 }}
      >
        {`${displayIndex.toString()}/${count.toString()} (${source})`}
      </text>
    </>
  );
}

export function PokemonSpriteShinyMarker() {
  return (
    <text
      fg={colors.accent}
      style={{ position: "absolute", right: 1, top: 0, zIndex: 1 }}
    >
      ★
    </text>
  );
}

type PokemonSpritePanelProps = {
  form: PokemonForm | undefined;
  queryClient: ReturnType<typeof useQueryClient>;
  shiny: boolean;
  species: SpeciesIndexEntry;
};

function PokemonSpritePanel({
  form,
  queryClient,
  shiny,
  species,
}: PokemonSpritePanelProps) {
  const sprite = useQuery(
    pokespriteRenderedSpriteQueryOptions(species, queryClient, shiny, form),
  );

  if (sprite.data !== undefined) {
    return <PokemonSpriteArtwork sprite={sprite.data} />;
  }

  if (sprite.isError) {
    return <PokemonSpriteFallback error={sprite.error} />;
  }

  return <PokemonSpriteLoading />;
}

function PokemonSpriteLoading() {
  return (
    <box
      style={{
        alignItems: "center",
        flexDirection: "column",
        height: detailSpriteCanvasHeight,
        justifyContent: "center",
        width: detailSpriteCanvasWidth,
      }}
    />
  );
}

export function PokemonSpriteFallback({ error }: { error: unknown }) {
  return (
    <box
      style={{
        alignItems: "center",
        flexDirection: "column",
        height: detailSpriteCanvasHeight,
        justifyContent: "center",
        width: detailSpriteCanvasWidth,
      }}
    >
      <text fg={colors.muted} attributes={textStyles.muted}>
        Sprite unavailable
      </text>
      <text fg={colors.muted} attributes={textStyles.muted}>
        {spriteErrorMessage(error)}
      </text>
      <text fg={colors.muted} attributes={textStyles.muted}>
        Detail data is still available.
      </text>
    </box>
  );
}

function spriteErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "Sprite resources could not be loaded or read from cache.";
}

export function PokemonSpriteArtwork({ sprite }: { sprite: RenderedSprite }) {
  return (
    <box
      style={{
        alignItems: "center",
        flexDirection: "column",
        height: detailSpriteCanvasHeight,
        justifyContent: "center",
        width: detailSpriteCanvasWidth,
      }}
    >
      {sprite.rows.map((row, rowIndex) => (
        <text key={rowIndex.toString()}>{spriteRowSpans(row)}</text>
      ))}
    </box>
  );
}

function spriteRowSpans(row: readonly SpriteCell[]) {
  return groupSpriteCells(row).map((group, index) => (
    <span
      key={index.toString()}
      {...(group.fg === undefined ? {} : { fg: RGBA.fromIndex(group.fg) })}
      {...(group.bg === undefined ? {} : { bg: RGBA.fromIndex(group.bg) })}
    >
      {group.text}
    </span>
  ));
}

function groupSpriteCells(row: readonly SpriteCell[]) {
  const groups: { bg?: number; fg?: number; text: string }[] = [];

  for (const cell of row) {
    const current = groups.at(-1);
    if (
      current !== undefined &&
      current.fg === cell.fg &&
      current.bg === cell.bg
    ) {
      current.text = `${current.text}${cell.char}`;
      continue;
    }

    groups.push({
      ...(cell.bg === undefined ? {} : { bg: cell.bg }),
      ...(cell.fg === undefined ? {} : { fg: cell.fg }),
      text: cell.char,
    });
  }

  return groups;
}

type AbilityViewerProps = {
  abilities: PokemonDetail["abilities"];
  queryClient: ReturnType<typeof useQueryClient>;
};

function AbilityViewer({ abilities, queryClient }: AbilityViewerProps) {
  const abilityDetails = useQuery(
    pokemonAbilityDetailsQueryOptions(abilities, queryClient),
  );

  return (
    <Modal
      right={<KeyHints hints={[{ key: "a/esc", action: "close" }]} />}
      rightWidth={keyHintsWidth([{ key: "a/esc", action: "close" }])}
      title="Abilities"
    >
      {abilityDetails.isPending ? (
        <text fg={colors.muted} attributes={textStyles.muted}>
          Loading ability descriptions...
        </text>
      ) : null}
      {abilityDetails.isError ? (
        <text fg={colors.muted} attributes={textStyles.muted}>
          {abilityErrorMessage(abilityDetails.error)}
        </text>
      ) : null}
      {abilityDetails.data?.map((ability) => (
        <AbilityDescription key={ability.name} ability={ability} />
      ))}
    </Modal>
  );
}

export function FormSelector({
  currentForm,
  forms,
  selectedIndex,
}: {
  currentForm: PokemonForm;
  forms: readonly PokemonForm[];
  selectedIndex: number;
}) {
  return (
    <Modal
      right={
        <KeyHints
          hints={[
            { key: "j/k", action: "move" },
            { key: "enter", action: "select" },
            { key: "esc", action: "close" },
          ]}
        />
      }
      rightWidth={keyHintsWidth([
        { key: "j/k", action: "move" },
        { key: "enter", action: "select" },
        { key: "esc", action: "close" },
      ])}
      title="Forms"
    >
      {forms.map((form, index) => {
        const selected = index === selectedIndex;
        const current = form.pokemonName === currentForm.pokemonName;
        const label = `${current ? "*" : " "} ${form.displayName}`;

        return (
          <text
            key={form.pokemonName}
            attributes={selected ? textStyles.selected : textStyles.normal}
            {...(selected
              ? { bg: colors.selected, fg: colors.selectedText }
              : {})}
          >
            {selected ? label.padEnd(36) : label}
          </text>
        );
      })}
    </Modal>
  );
}

function abilityErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return `Could not load ability descriptions: ${error.message}`;
  }

  return "Could not load ability descriptions. If offline, they may not be cached yet.";
}

function AbilityDescription({ ability }: { ability: PokemonAbilityDetail }) {
  return (
    <box style={{ flexDirection: "column", marginBottom: 1 }}>
      <text attributes={textStyles.active}>{ability.name}</text>
      <text>{ability.shortEffect}</text>
      <text fg={colors.muted} attributes={textStyles.muted}>
        {ability.effect}
      </text>
    </box>
  );
}

export function DamageTakenPanel({
  damageTaken,
}: {
  damageTaken: DamageTaken;
}) {
  return (
    <box style={{ flexDirection: "column" }}>
      <text attributes={textStyles.active}>Damage Taken</text>
      <DamageTakenRow label="Weak" entries={damageTaken.weaknesses} />
      <text> </text>
      <DamageTakenRow label="Resist" entries={damageTaken.resistances} />
    </box>
  );
}

function DamageTakenRow({
  entries,
  label,
}: {
  entries: readonly DamageTakenEntry[];
  label: string;
}) {
  const rows = chunkEntries(entries, 3);

  if (entries.length === 0) {
    return (
      <text>
        <span fg={colors.muted}>{label.padEnd(7)}</span>
        <span fg={colors.muted}>none</span>
      </text>
    );
  }

  return (
    <box style={{ flexDirection: "column" }}>
      {rows.map((row, rowIndex) => (
        <text key={`${label}-${rowIndex.toString()}`}>
          <span fg={colors.muted}>
            {rowIndex === 0 ? label.padEnd(7) : " ".repeat(7)}
          </span>
          {row.map((entry, entryIndex) => (
            <span key={entry.type}>
              {entryIndex > 0 ? <span> </span> : null}
              <TypeTag short type={entry.type} />
              <span
                bg={multiplierColor(entry.multiplier)}
                fg={colors.multiplierText}
              >
                {` ${formatMultiplier(entry.multiplier).padStart(3)} `}
              </span>
            </span>
          ))}
        </text>
      ))}
    </box>
  );
}

function formatMultiplier(multiplier: DamageTakenEntry["multiplier"]): string {
  if (multiplier === 0.25) {
    return "1/4";
  }

  if (multiplier === 0.5) {
    return "1/2";
  }

  return `${multiplier}x`;
}

function multiplierColor(multiplier: DamageTakenEntry["multiplier"]) {
  if (multiplier === 0) {
    return colors.multiplierImmune;
  }

  return multiplier > 1 ? colors.multiplierWeak : colors.multiplierResist;
}

function chunkEntries(entries: readonly DamageTakenEntry[], size: number) {
  const rows: DamageTakenEntry[][] = [];

  for (let index = 0; index < entries.length; index += size) {
    rows.push(entries.slice(index, index + size));
  }

  return rows;
}

function GenderRatio({ ratio }: { ratio: PokemonDetail["genderRatio"] }) {
  if (ratio.kind === "genderless") {
    return <span fg={colors.muted}>Genderless</span>;
  }

  return (
    <span>
      {ratio.malePercent > 0 ? (
        <span>
          <span fg={colors.genderMale}>♂</span>
          <span>{` ${formatPercent(ratio.malePercent)}`}</span>
        </span>
      ) : null}
      {ratio.malePercent > 0 && ratio.femalePercent > 0 ? (
        <span fg={colors.muted}> / </span>
      ) : null}
      {ratio.femalePercent > 0 ? (
        <span>
          <span fg={colors.genderFemale}>♀</span>
          <span>{` ${formatPercent(ratio.femalePercent)}`}</span>
        </span>
      ) : null}
    </span>
  );
}

function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value.toString() : value.toFixed(1)}%`;
}

function FactRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <text>
      <span fg={colors.muted}>{label.padEnd(11)}</span>
      {value}
    </text>
  );
}
