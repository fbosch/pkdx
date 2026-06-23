import type { KeyEvent } from "@opentui/core";
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
import type { PokemonAbilityDetail, PokemonDetail } from "../pokemon-detail";
import {
  pokemonAbilityDetailsQueryOptions,
  pokemonDetailQueryOptions,
} from "../pokemon-detail";
import { minimumSearchQueryLength, searchResults } from "../search";
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
        onLoadFailed={(species, error) => {
          setState((current) =>
            current.screen === "detail"
              ? detailLoadFailed(current, species, error)
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
            { key: "shift+j/k", action: "move" },
            { key: "enter", action: "open" },
            { key: "esc", action: "exit" },
          ]}
        />
      </InstructionFooter>
    </box>
  );
}

type DetailViewProps = {
  onLoadFailed: (species: DetailState["species"], error: unknown) => void;
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
  const retryErrorUpdatedAt = useRef<number | undefined>(undefined);
  const detail = useQuery({
    ...pokemonDetailQueryOptions(state.species, queryClient),
    enabled: state.status !== "error",
  });
  const showColdLoadingSkeleton = useDelayedVisibility(
    state.detail === undefined && state.status === "loading",
    state.species.slug,
  );

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
      onLoadFailed(state.species, detail.error);
    }
  }, [
    detail.error,
    detail.errorUpdatedAt,
    detail.isError,
    detail.isFetching,
    onLoadFailed,
    state.species,
    state.status,
  ]);

  if (state.detail !== undefined) {
    return (
      <LoadedDetailView
        abilityViewerOpen={state.detailOverlay === "abilities"}
        detail={state.detail.detail}
        errorMessage={state.status === "error" ? state.errorMessage : undefined}
        loadingSpecies={state.status === "loading" ? state.species : undefined}
        queryClient={queryClient}
      />
    );
  }

  if (state.status === "loading") {
    if (!showColdLoadingSkeleton) {
      return <DetailScreen>{null}</DetailScreen>;
    }

    return <DetailLoadingSkeleton species={state.species} />;
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
              height: 16,
              justifyContent: "center",
              paddingX: 1,
              width: 30,
            }}
          >
            <box
              style={{
                alignItems: "center",
                flexDirection: "column",
                gap: 1,
                height: 13,
                justifyContent: "center",
                width: 18,
              }}
            >
              <SkeletonText width={10} />
              <SkeletonText width={16} />
              <SkeletonText width={12} />
            </box>
          </box>
          <box style={{ flexDirection: "column", width: 65 }}>
            <box
              border
              borderColor={colors.panelSecondary}
              borderStyle="rounded"
              style={{
                flexDirection: "column",
                minHeight: 7,
                paddingX: 1,
                width: 65,
              }}
            >
              <SkeletonText width={58} />
              <SkeletonText width={52} />
              <SkeletonText width={44} />
            </box>
            <box
              border
              borderColor={colors.panelSecondary}
              borderStyle="rounded"
              style={{ flexDirection: "column", paddingX: 1, width: 65 }}
            >
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
            </box>
          </box>
        </box>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <box
            border
            borderColor={colors.panelSecondary}
            borderStyle="rounded"
            style={{ flexDirection: "column", paddingX: 1, width: 45 }}
          >
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
          </box>
          <box
            border
            borderColor={colors.panelSecondary}
            borderStyle="rounded"
            style={{ flexDirection: "column", paddingX: 1, width: 50 }}
          >
            <text attributes={textStyles.active}>Damage Taken</text>
            <SkeletonText width={38} />
            <SkeletonText width={28} />
            <text> </text>
            <SkeletonText width={34} />
            <SkeletonText width={24} />
          </box>
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
  errorMessage: string | undefined;
  loadingSpecies: DetailState["species"] | undefined;
  queryClient: ReturnType<typeof useQueryClient>;
};

function LoadedDetailView({
  abilityViewerOpen,
  detail,
  errorMessage,
  loadingSpecies,
  queryClient,
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
              height: 16,
              justifyContent: "center",
              paddingX: 1,
              width: 30,
            }}
          >
            <box
              style={{
                alignItems: "center",
                height: 13,
                justifyContent: "center",
                width: 18,
              }}
            />
          </box>
          <box style={{ flexDirection: "column", width: 65 }}>
            <box
              border
              borderColor={colors.panelSecondary}
              borderStyle="rounded"
              style={{
                flexDirection: "column",
                minHeight: 7,
                paddingX: 1,
                width: 65,
              }}
            >
              <text>{detail.flavorText}</text>
            </box>
            <box
              border
              borderColor={colors.panelSecondary}
              borderStyle="rounded"
              style={{ flexDirection: "column", paddingX: 1, width: 65 }}
            >
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
            </box>
          </box>
        </box>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <box
            border
            borderColor={colors.panelSecondary}
            borderStyle="rounded"
            style={{ flexDirection: "column", paddingX: 1, width: 45 }}
          >
            <text attributes={textStyles.active}>Stats</text>
            {detail.stats.map((stat) => (
              <text key={stat.name}>
                <span>{stat.name.padEnd(11)}</span>
                <span> {stat.base.toString().padStart(3)} </span>
                <StatBar name={stat.name} value={stat.base} />
              </text>
            ))}
          </box>
          <box
            border
            borderColor={colors.panelSecondary}
            borderStyle="rounded"
            style={{ flexDirection: "column", paddingX: 1, width: 50 }}
          >
            <DamageTakenPanel damageTaken={detail.damageTaken} />
          </box>
        </box>
      </PokedexCard>
      {abilityViewerOpen ? (
        <AbilityViewer abilities={detail.abilities} queryClient={queryClient} />
      ) : null}
      <InstructionFooter>
        <KeyHints
          hints={[
            { key: "a", action: "abilities" },
            { key: "/", action: "search" },
            { key: "q/esc", action: "exit" },
          ]}
        />
      </InstructionFooter>
    </DetailScreen>
  );
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
