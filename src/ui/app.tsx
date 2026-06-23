import type { CliRenderer, KeyEvent } from "@opentui/core";
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
import type { PokemonDetail } from "../pokemon-detail";
import { pokemonDetailQueryOptions } from "../pokemon-detail";
import { minimumSearchQueryLength, searchResults } from "../search";
import { colors, textStyles } from "./design-tokens";

type AppProps = {
  initialQuery?: string;
  renderer: CliRenderer;
};

export function App({ initialQuery = "", renderer }: AppProps) {
  const [state, setState] = useState(() => createInitialAppState(initialQuery));
  const queryClient = useQueryClient();

  useKeyboard((key: KeyEvent) => {
    setState((current) => {
      const next = applyAppKey(current, key);
      if (next.shouldExit) {
        renderer.destroy();
      }
      return next;
    });
  });

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
          style={{ flexDirection: "column", paddingX: 1, width: 56 }}
        >
          <text
            attributes={
              state.query.length === 0 ? textStyles.muted : textStyles.active
            }
            {...(state.query.length === 0 ? { fg: colors.muted } : {})}
          >{`> ${queryLabel}`}</text>
        </box>
        <text
          attributes={textStyles.active}
          style={{ left: 2, position: "absolute", top: 0 }}
        >
          <span fg={colors.indicatorBlue}>⬤</span>
          <span> </span>
          <span fg={colors.indicatorRed}>●</span>
          <span> </span>
          <span fg={colors.indicatorYellow}>●</span>
          <span> </span>
          <span fg={colors.indicatorGreen}>●</span>
          <span> Pokedex </span>
        </text>
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

      <text
        fg={colors.muted}
        attributes={textStyles.muted}
        style={{ bottom: 1, position: "absolute" }}
      >
        Type to filter | Shift-J/K move | Enter opens | Esc exits
      </text>
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
        detail={state.detail.detail}
        errorMessage={state.status === "error" ? state.errorMessage : undefined}
        loadingSpecies={state.status === "loading" ? state.species : undefined}
      />
    );
  }

  if (state.status === "loading") {
    return (
      <box style={{ flexDirection: "column", padding: 1 }}>
        <text>Terminal Pokedex</text>
        <text>Detail</text>
        <text>
          Loading #{state.species.dexNumbers[1] ?? state.species.dexNumbers[0]}{" "}
          {state.species.name}...
        </text>
        <text>
          Press / to return to Search. Press q, Escape, or Ctrl-C to exit.
        </text>
      </box>
    );
  }

  return (
    <box style={{ flexDirection: "column", padding: 1 }}>
      <text>Terminal Pokedex</text>
      <text>Detail</text>
      <text>Could not load Detail for {state.species.name}.</text>
      <text fg={colors.muted} attributes={textStyles.muted}>
        {state.errorMessage ??
          "Detail data is unavailable. If offline, this species is not cached yet."}
      </text>
      <text>Press r to retry, / to return to Search, or q to exit.</text>
    </box>
  );
}

type LoadedDetailViewProps = {
  detail: PokemonDetail;
  errorMessage: string | undefined;
  loadingSpecies: DetailState["species"] | undefined;
};

function LoadedDetailView({
  detail,
  errorMessage,
  loadingSpecies,
}: LoadedDetailViewProps) {
  return (
    <box style={{ flexDirection: "column", padding: 1 }}>
      <text>Terminal Pokedex</text>
      <text>Detail</text>
      {loadingSpecies !== undefined ? (
        <text fg={colors.muted} attributes={textStyles.muted}>
          Loading #
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
      <text>
        #{detail.dexNumber.toString().padStart(3, "0")} {detail.name}
      </text>
      <text>Types: {detail.types.join(" / ")}</text>
      <text>
        Abilities: {detail.abilities.map((ability) => ability.name).join(", ")}
      </text>
      <text>
        Height: {detail.heightMeters.toFixed(1)} m | Weight:{" "}
        {detail.weightKilograms.toFixed(1)} kg
      </text>
      <text>
        Stats:{" "}
        {detail.stats.map((stat) => `${stat.name} ${stat.base}`).join(" | ")}
      </text>
      <text>{detail.flavorText}</text>
      <text>Sprite: {detail.sprite.label}</text>
      <text>
        Press / to return to Search. Press q, Escape, or Ctrl-C to exit.
      </text>
    </box>
  );
}
