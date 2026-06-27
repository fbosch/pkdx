import { RGBA } from "@opentui/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PokemonForm } from "../../pokemon-detail";
import { pokespriteRenderedSpriteQueryOptions } from "../../pokesprite";
import type { SpeciesIndexEntry } from "../../search";
import type { RenderedSprite, SpriteCell } from "../../sprite-rendering";
import { colors, textStyles } from "../design-tokens";

const detailSpriteCanvasHeight = 20;
const detailSpriteCanvasWidth = 40;

type PokemonSpritePanelProps = {
  form: PokemonForm | undefined;
  shiny: boolean;
  species: SpeciesIndexEntry;
};

export function PokemonSpritePanel({
  form,
  shiny,
  species,
}: PokemonSpritePanelProps) {
  const queryClient = useQueryClient();
  const sprite = useQuery(
    pokespriteRenderedSpriteQueryOptions(species, queryClient, shiny, form, {
      maxHeight: detailSpriteCanvasHeight,
      maxWidth: detailSpriteCanvasWidth,
    }),
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
  const top = Math.max(
    0,
    Math.floor((detailSpriteCanvasHeight - sprite.height) / 2),
  );
  const left = Math.max(
    0,
    Math.floor((detailSpriteCanvasWidth - sprite.width) / 2),
  );

  return (
    <box
      style={{
        alignItems: "center",
        flexDirection: "column",
        height: detailSpriteCanvasHeight,
        justifyContent: "center",
        position: "relative",
        width: detailSpriteCanvasWidth,
      }}
    >
      {sprite.rows.flatMap((row, rowIndex) =>
        visibleSpriteCellGroups(row).map((group, groupIndex) => (
          <text
            key={`${rowIndex.toString()}-${groupIndex.toString()}`}
            style={{
              left: left + group.x,
              position: "absolute",
              top: top + rowIndex,
            }}
          >
            {spriteCellGroupSpans(group.cells)}
          </text>
        )),
      )}
    </box>
  );
}

function spriteCellGroupSpans(row: readonly SpriteCell[]) {
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

function visibleSpriteCellGroups(row: readonly SpriteCell[]) {
  const groups: { cells: SpriteCell[]; x: number }[] = [];
  let current: { cells: SpriteCell[]; x: number } | undefined;

  row.forEach((cell, x) => {
    if (isTransparentSpriteCell(cell)) {
      current = undefined;
      return;
    }

    if (current === undefined) {
      current = { cells: [], x };
      groups.push(current);
    }

    current.cells.push(cell);
  });

  return groups;
}

function isTransparentSpriteCell(cell: SpriteCell): boolean {
  return cell.char === " " && cell.fg === undefined && cell.bg === undefined;
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
