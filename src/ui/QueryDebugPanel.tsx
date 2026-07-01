import { RGBA } from "@opentui/core";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { colors, textStyles } from "./design-tokens";

const maxDebugQueries = 5;
const debugPanelWidth = 72;
const debugPanelBackground = RGBA.fromHex("#111022");
const debugPanelTitle = RGBA.fromHex("#ffff00");
const queryStatusColors: Record<QueryDebugStatus, RGBA> = {
  fetching: RGBA.fromHex("#60a5fa"),
  fresh: RGBA.fromHex("#22c55e"),
  inactive: colors.muted,
  paused: RGBA.fromHex("#a78bfa"),
  stale: RGBA.fromHex("#facc15"),
};

type QueryDebugEntry = {
  error: string;
  id: string;
  key: string;
  observers: number;
  status: QueryDebugStatus;
  updated: string;
};

type QueryDebugFilter = QueryDebugStatus | "all";

type QueryDebugStatus = "fetching" | "fresh" | "inactive" | "paused" | "stale";

type QueryDebugSummary = Record<QueryDebugStatus, number>;

const queryDebugFilters: readonly QueryDebugFilter[] = [
  "all",
  "fresh",
  "fetching",
  "paused",
  "stale",
  "inactive",
];

export function QueryDebugPanel() {
  const queryClient = useQueryClient();
  const entries = useQueryDebugEntries(queryClient);
  const [filter, setFilter] = useState<QueryDebugFilter>("all");

  return (
    <QueryDebugPanelView
      entries={entries}
      filter={filter}
      onSelectFilter={setFilter}
    />
  );
}

export function QueryDebugPanelView({
  entries,
  filter = "all",
  onSelectFilter = () => undefined,
}: {
  entries: readonly QueryDebugEntry[];
  filter?: QueryDebugFilter;
  onSelectFilter?: (filter: QueryDebugFilter) => void;
}) {
  const summary = queryDebugSummary(entries);
  const displayedEntries = queryDebugVisibleEntries(entries, filter);

  return (
    <box
      backgroundColor={debugPanelBackground}
      style={{
        flexDirection: "column",
        height: maxDebugQueries + 3,
        overflow: "hidden",
        padding: 1,
        position: "absolute",
        right: 2,
        top: 1,
        width: debugPanelWidth,
        zIndex: 250,
      }}
    >
      <QueryDebugFilterLine
        filter={filter}
        onSelectFilter={onSelectFilter}
        summary={summary}
        total={entries.length}
      />
      {displayedEntries.map((entry) => (
        <text key={entry.id}>
          <span>{entry.observers.toString().padStart(2)}</span>
          <span> </span>
          <span fg={queryStatusColors[entry.status]}>
            {shortQueryStatusLabel(entry.status).padEnd(6)}
          </span>
          <span> </span>
          <span fg={colors.muted}>{entry.updated.padStart(6)}</span>
          <span> </span>
          <span>{entry.key}</span>
          {entry.error.length === 0 ? null : (
            <span fg={colors.muted}> {entry.error}</span>
          )}
        </text>
      ))}
    </box>
  );
}

function QueryDebugFilterLine({
  filter,
  onSelectFilter,
  summary,
  total,
}: {
  filter: QueryDebugFilter;
  onSelectFilter: (filter: QueryDebugFilter) => void;
  summary: QueryDebugSummary;
  total: number;
}) {
  return (
    <box style={{ flexDirection: "row", height: 1 }}>
      {queryDebugFilters.map((label) => (
        <QueryDebugFilterTab
          active={filter === label}
          count={label === "all" ? total : summary[label]}
          key={label}
          label={label}
          onSelect={() => onSelectFilter(label)}
        />
      ))}
    </box>
  );
}

function QueryDebugFilterTab({
  active,
  count,
  label,
  onSelect,
}: {
  active: boolean;
  count: number;
  label: QueryDebugFilter;
  onSelect: () => void;
}) {
  const color = label === "all" ? debugPanelTitle : queryStatusColors[label];

  return (
    <text
      attributes={active ? textStyles.active : textStyles.normal}
      fg={active ? debugPanelTitle : color}
      onMouseDown={onSelect}
    >
      {`${shortQueryFilterLabel(label)}:${count.toString()}`.padEnd(10)}
    </text>
  );
}

function useQueryDebugEntries(queryClient: QueryClient): QueryDebugEntry[] {
  const snapshot = useRef<{
    entries: QueryDebugEntry[];
    queryClient: QueryClient;
  }>(undefined);
  const getSnapshot = useCallback(() => {
    if (snapshot.current?.queryClient !== queryClient) {
      snapshot.current = {
        entries: queryDebugEntries(queryClient),
        queryClient,
      };
    }

    return snapshot.current.entries;
  }, [queryClient]);
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return queryClient.getQueryCache().subscribe(() => {
        snapshot.current = {
          entries: queryDebugEntries(queryClient),
          queryClient,
        };
        onStoreChange();
      });
    },
    [queryClient],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

function queryDebugEntries(queryClient: QueryClient): QueryDebugEntry[] {
  return queryClient
    .getQueryCache()
    .findAll()
    .toSorted(
      (left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt,
    )
    .map((query) => {
      const observers = query.getObserversCount();
      return {
        error: queryErrorMessage(query.state.error),
        id: query.queryHash,
        key: formatQueryKey(query.queryKey),
        observers,
        status: queryDebugStatus({
          fetchStatus: query.state.fetchStatus,
          isStale: query.isStale(),
          observers,
        }),
        updated: formatUpdatedAt(query.state.dataUpdatedAt),
      };
    });
}

function queryDebugVisibleEntries(
  entries: readonly QueryDebugEntry[],
  filter: QueryDebugFilter,
): readonly QueryDebugEntry[] {
  if (filter === "all") {
    return entries.slice(0, maxDebugQueries);
  }

  return entries
    .filter((entry) => entry.status === filter)
    .slice(0, maxDebugQueries);
}

function formatQueryKey(queryKey: readonly unknown[]): string {
  const [family, ...parts] = queryKey;
  if (typeof family !== "string") {
    return JSON.stringify(queryKey).slice(0, 42);
  }

  if (family === "pokemon-detail") {
    return `detail ${formatQueryPart(parts[0])} ${formatFormKey(parts[1])}`;
  }

  if (family === "pokemon-ability-details") {
    return `abilities ${formatQueryPart(parts[0])}`;
  }

  if (family === "pokesprite-cached-asset") {
    return `sprite cached #${formatQueryPart(parts[1])} ${formatFormKey(parts[2])}${parts[3] === true ? " shiny" : ""}`;
  }

  if (family === "pokesprite-rendered-sprite") {
    return `sprite rendered #${formatQueryPart(parts[1])} ${formatFormKey(parts[2])}${parts[3] === true ? " shiny" : ""}`;
  }

  if (family === "pokesprite-metadata") {
    return "pokesprite metadata";
  }

  return [family, ...parts.map(formatQueryPart)].join(" ").slice(0, 42);
}

function queryDebugSummary(
  entries: readonly QueryDebugEntry[],
): QueryDebugSummary {
  const summary: QueryDebugSummary = {
    fetching: 0,
    fresh: 0,
    inactive: 0,
    paused: 0,
    stale: 0,
  };
  for (const entry of entries) {
    summary[entry.status] += 1;
  }

  return summary;
}

function queryDebugStatus({
  fetchStatus,
  isStale,
  observers,
}: {
  fetchStatus: string;
  isStale: boolean;
  observers: number;
}): QueryDebugStatus {
  if (fetchStatus === "fetching") {
    return "fetching";
  }

  if (observers === 0) {
    return "inactive";
  }

  if (fetchStatus === "paused") {
    return "paused";
  }

  return isStale ? "stale" : "fresh";
}

function formatFormKey(value: unknown): string {
  return value === "$" || value === undefined
    ? "default"
    : formatQueryPart(value);
}

function formatQueryPart(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return JSON.stringify(value);
}

function shortQueryStatusLabel(label: QueryDebugStatus): string {
  if (label === "fetching") {
    return "fetch";
  }

  if (label === "inactive") {
    return "idle";
  }

  return label;
}

function shortQueryFilterLabel(label: QueryDebugFilter): string {
  return label === "all" ? "all" : shortQueryStatusLabel(label);
}

function formatUpdatedAt(updatedAt: number): string {
  if (updatedAt === 0) {
    return "never";
  }

  return `${Math.max(0, Math.round((Date.now() - updatedAt) / 1000)).toString()}s ago`;
}

function queryErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 20);
  }

  return "";
}
