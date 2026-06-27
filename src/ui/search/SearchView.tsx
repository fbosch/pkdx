import { minimumSearchQueryLength, searchResults } from "../../search";
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
              cursorColor={colors.accent}
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
                  {label.padEnd(searchPanelWidth)}
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
            { key: "ctrl-c", action: "exit" },
          ]}
        />
      </InstructionFooter>
    </box>
  );
}
