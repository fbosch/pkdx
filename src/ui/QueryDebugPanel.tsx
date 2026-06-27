import { RGBA } from "@opentui/core";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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

type QueryDebugStatus = "fetching" | "fresh" | "inactive" | "paused" | "stale";

type QueryDebugSummary = Record<QueryDebugStatus, number>;

export function QueryDebugPanel() {
  const queryClient = useQueryClient();
  const entries = useQueryDebugEntries(queryClient);

  return <QueryDebugPanelView entries={entries} />;
}

export function QueryDebugPanelView({
  entries,
}: {
  entries: readonly QueryDebugEntry[];
}) {
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
      <text fg={debugPanelTitle} attributes={textStyles.active}>
        Query Debug
      </text>
      <QueryDebugSummaryLine summary={queryDebugSummary(entries)} />
      {entries.map((entry) => (
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

function QueryDebugSummaryLine({ summary }: { summary: QueryDebugSummary }) {
  return (
    <text>
      <QueryDebugSummaryPart label="fresh" summary={summary} />
      <QueryDebugSummaryPart label="fetching" summary={summary} />
      <QueryDebugSummaryPart label="paused" summary={summary} />
      <QueryDebugSummaryPart label="stale" summary={summary} />
      <QueryDebugSummaryPart label="inactive" summary={summary} />
    </text>
  );
}

function QueryDebugSummaryPart({
  label,
  summary,
}: {
  label: QueryDebugStatus;
  summary: QueryDebugSummary;
}) {
  return (
    <span fg={queryStatusColors[label]}>
      {`${shortQueryStatusLabel(label)}:${summary[label].toString()}`.padEnd(
        11,
      )}
    </span>
  );
}

function useQueryDebugEntries(queryClient: QueryClient): QueryDebugEntry[] {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    return queryClient.getQueryCache().subscribe(() => {
      setRevision((current) => current + 1);
    });
  }, [queryClient]);

  return queryDebugEntries(queryClient, revision);
}

function queryDebugEntries(
  queryClient: QueryClient,
  _revision: number,
): QueryDebugEntry[] {
  return queryClient
    .getQueryCache()
    .findAll()
    .toSorted(
      (left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt,
    )
    .slice(0, maxDebugQueries)
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
