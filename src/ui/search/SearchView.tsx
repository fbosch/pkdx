import { minimumSearchQueryLength, searchResults } from "#src/search/index.ts";
import { InstructionFooter, KeyHints, PokedexHeader } from "../components";
import { colors, textStyles } from "../design-tokens";

const searchPanelWidth = 56;
const searchInputWidth = searchPanelWidth - 4;

export function SearchView({
  query,
  selectedIndex,
}: {
  query: string;
  selectedIndex: number;
}) {
  const results = searchResults(query, selectedIndex);
  const hasSearchableQuery = query.trim().length >= minimumSearchQueryLength;
  const resultOptions = results.map((result) => ({
    description: "",
    name: `#${result.dexNumbers[1] ?? result.dexNumbers[0]} ${result.name}`,
    value: result.slug,
  }));
  const selectedResultIndex = Math.max(
    0,
    results.findIndex((result) => result.selected),
  );

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
      <box style={{ position: "relative", width: searchPanelWidth }}>
        <box
          border
          borderColor={colors.accent}
          borderStyle="rounded"
          style={{
            flexDirection: "column",
            height: 3,
            paddingX: 1,
            width: searchPanelWidth,
          }}
        >
          <box style={{ flexDirection: "row", height: 1 }}>
            <input
              cursorColor={colors.keyboardCursor}
              focused
              placeholder="Search Pokemon species..."
              textColor={colors.keyHint}
              value={query}
              width={searchInputWidth}
            />
          </box>
        </box>
        <PokedexHeader />
        {hasSearchableQuery ? (
          <box
            style={{
              flexDirection: "column",
              left: 0,
              position: "absolute",
              top: 3,
              width: searchPanelWidth,
              zIndex: 100,
            }}
          >
            {results.length === 0 ? (
              <text fg={colors.muted} attributes={textStyles.muted}>
                No species match this query.
              </text>
            ) : null}
            {results.length > 0 ? (
              <select
                height={results.length}
                options={resultOptions}
                selectedBackgroundColor={colors.selected}
                selectedIndex={selectedResultIndex}
                selectedTextColor={colors.selectedText}
                showDescription={false}
                textColor={colors.keyHint}
                width={searchPanelWidth}
              />
            ) : null}
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
