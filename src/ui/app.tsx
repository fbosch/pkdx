import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  DetailCardTitle,
  DetailScreen,
  InstructionFooter,
  KeyHints,
  Modal,
  PokedexCard,
  PokedexHeader,
  StatBar,
  TypeLabels,
  keyHintsWidth,
  typeLabelsWidth,
} from "./components";
import { colors, textStyles } from "./design-tokens";

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
    return (
      <DetailScreen>
        <PokedexCard>
          <DetailCardTitle
            left={`Loading #${state.species.dexNumbers[1] ?? state.species.dexNumbers[0]} ${state.species.name}...`}
            right="Detail"
          />
          <box
            style={{
              alignItems: "center",
              height: 10,
              justifyContent: "center",
            }}
          >
            <text fg={colors.muted} attributes={textStyles.muted}>
              Preparing Detail data...
            </text>
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
        ) : null}
        {errorMessage !== undefined ? (
          <text fg={colors.muted} attributes={textStyles.muted}>
            Could not load next Detail: {errorMessage}. Press r to retry or / to
            search.
          </text>
        ) : null}
        <box style={{ flexDirection: "row", gap: 1 }}>
          <box
            border
            borderColor={colors.panelSecondary}
            borderStyle="rounded"
            style={{
              flexDirection: "column",
              minHeight: 14,
              paddingX: 1,
              width: 30,
            }}
          >
            <text attributes={textStyles.active}>Sprite</text>
            <box
              style={{
                alignItems: "center",
                flexGrow: 1,
                justifyContent: "center",
              }}
            >
              <text fg={colors.muted} attributes={textStyles.muted}>
                {detail.sprite.label}
              </text>
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
              <text>{detail.flavorText}</text>
            </box>
            <box
              border
              borderColor={colors.panelSecondary}
              borderStyle="rounded"
              style={{ flexDirection: "column", paddingX: 1, width: 65 }}
            >
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
            <text attributes={textStyles.active}>Damage Taken</text>
            <text fg={colors.muted} attributes={textStyles.muted}>
              Coming in the next slice.
            </text>
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

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <text>
      <span fg={colors.muted}>{label.padEnd(9)}</span>
      <span>{value}</span>
    </text>
  );
}
