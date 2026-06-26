import type { DamageTaken, DamageTakenEntry } from "../../type-matchups";
import { TypeTag } from "../components";
import { colors, textStyles } from "../design-tokens";

const damageTakenRowWidth = 44;
const damageTakenRowLabelWidth = 7;
const damageTakenRowsPerSection = 2;
const shortTypeTagWidth = 5;

export function DamageTakenPanel({
  damageTaken,
}: {
  damageTaken: DamageTaken;
}) {
  return (
    <box style={{ flexDirection: "column" }}>
      <text attributes={textStyles.active}>Damage Taken</text>
      <text> </text>
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
  const rows = padRows(
    entries.length === 0 ? [null] : chunkEntriesByWidth(entries),
    damageTakenRowsPerSection,
  );

  return (
    <box style={{ flexDirection: "column" }}>
      {rows.map((row, rowIndex) => (
        <text key={`${label}-${rowIndex.toString()}`}>
          <span fg={colors.muted}>
            {rowIndex === 0
              ? label.padEnd(damageTakenRowLabelWidth)
              : " ".repeat(damageTakenRowLabelWidth)}
          </span>
          <DamageTakenRowEntries entries={row} />
          <span>{" ".repeat(damageTakenRowTrailingSpaceCount(row))}</span>
        </text>
      ))}
    </box>
  );
}

function DamageTakenRowEntries({
  entries,
}: {
  entries: readonly DamageTakenEntry[] | null | undefined;
}) {
  if (entries === null) {
    return <span fg={colors.muted}>none</span>;
  }

  if (entries === undefined) {
    return null;
  }

  return (
    <span>
      {entries.map((entry) => (
        <span key={entry.type}>
          <TypeTag short type={entry.type} />
          <span
            bg={multiplierColor(entry.multiplier)}
            fg={colors.multiplierText}
          >
            {` ${formatMultiplier(entry.multiplier)} `}
          </span>
        </span>
      ))}
    </span>
  );
}

function damageTakenRowTrailingSpaceCount(
  entries: readonly DamageTakenEntry[] | null | undefined,
): number {
  return Math.max(
    0,
    damageTakenRowWidth -
      damageTakenRowLabelWidth -
      damageTakenEntriesWidth(entries),
  );
}

function damageTakenEntriesWidth(
  entries: readonly DamageTakenEntry[] | null | undefined,
): number {
  if (entries === null) {
    return "none".length;
  }

  if (entries === undefined) {
    return 0;
  }

  return entries.reduce(
    (width, entry) =>
      width + shortTypeTagWidth + formatMultiplier(entry.multiplier).length + 2,
    0,
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

function chunkEntriesByWidth(entries: readonly DamageTakenEntry[]) {
  const rows: DamageTakenEntry[][] = [];
  let row: DamageTakenEntry[] = [];
  let rowWidth = 0;
  const availableWidth = damageTakenRowWidth - damageTakenRowLabelWidth;

  for (const entry of entries) {
    const entryWidth = damageTakenEntryWidth(entry);
    if (row.length > 0 && rowWidth + entryWidth > availableWidth) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }

    row.push(entry);
    rowWidth += entryWidth;
  }

  if (row.length > 0) {
    rows.push(row);
  }

  return rows;
}

function damageTakenEntryWidth(entry: DamageTakenEntry): number {
  return shortTypeTagWidth + formatMultiplier(entry.multiplier).length + 2;
}

function padRows<T>(rows: T[], minLength: number): (T | undefined)[] {
  const padding: undefined[] = Array.from({
    length: Math.max(0, minLength - rows.length),
  });

  return [...rows, ...padding];
}
