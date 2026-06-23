import type { ReactNode } from "react";
import { colors, textStyles } from "./design-tokens";

export const detailCardWidth = 100;
export const detailTitleWidth = 94;

const statBarWidth = 22;

export function DetailScreen({ children }: { children: ReactNode }) {
  return (
    <box
      style={{
        alignItems: "center",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: 1,
        position: "relative",
      }}
    >
      {children}
    </box>
  );
}

export function PokedexCard({ children }: { children: ReactNode }) {
  return (
    <box
      style={{
        flexDirection: "column",
        position: "relative",
        width: detailCardWidth,
      }}
    >
      <box
        border
        borderColor={colors.accent}
        borderStyle="rounded"
        style={{
          flexDirection: "column",
          paddingX: 1,
          width: detailCardWidth,
        }}
      >
        {children}
      </box>
      <PokedexHeader />
    </box>
  );
}

export function PokedexHeader() {
  return (
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
  );
}

export function DetailCardTitle({
  left,
  leftWidth,
  right,
  rightWidth,
}: {
  left: ReactNode;
  leftWidth?: number;
  right: ReactNode;
  rightWidth?: number;
}) {
  const resolvedLeftWidth =
    leftWidth ?? (typeof left === "string" ? left.length : 0);
  const resolvedRightWidth =
    rightWidth ?? (typeof right === "string" ? right.length : 0);
  const spacerWidth = Math.max(
    1,
    detailTitleWidth - resolvedLeftWidth - resolvedRightWidth,
  );

  return (
    <text attributes={textStyles.active}>
      <span>{left}</span>
      <span>{" ".repeat(spacerWidth)}</span>
      {right}
    </text>
  );
}

export function TypeLabels({ types }: { types: string[] }) {
  return (
    <span>
      {types.map((type, index) => (
        <span key={type}>
          {index > 0 ? <span fg={colors.muted}> / </span> : null}
          <span bg={typeColor(type)} fg={typeTextColor(type)}>
            {` ${type} `}
          </span>
        </span>
      ))}
    </span>
  );
}

export function typeLabelsWidth(types: string[]): number {
  return types.reduce((width, type, index) => {
    return width + type.length + 2 + (index > 0 ? 3 : 0);
  }, 0);
}

export function StatBar({ name, value }: { name: string; value: number }) {
  const filled = Math.max(1, Math.min(statBarWidth, Math.round(value / 8)));
  const empty = statBarWidth - filled;

  return (
    <span>
      <span fg={statColor(name)}>{"━".repeat(filled)}</span>
      <span fg={colors.statEmpty}>{"━".repeat(empty)}</span>
    </span>
  );
}

export function InstructionFooter({ children }: { children: string }) {
  return (
    <text
      fg={colors.muted}
      attributes={textStyles.muted}
      style={{ alignSelf: "center", bottom: 1, position: "absolute" }}
    >
      {children}
    </text>
  );
}

function statColor(name: string) {
  const statColors: Record<string, (typeof colors)[keyof typeof colors]> = {
    Attack: colors.statAttack,
    Defense: colors.statDefense,
    HP: colors.statHp,
    "Sp. Attack": colors.statSpecialAttack,
    "Sp. Defense": colors.statSpecialDefense,
    Speed: colors.statSpeed,
  };

  return statColors[name] ?? colors.muted;
}

function typeColor(type: string) {
  const typeColors: Record<string, (typeof colors)[keyof typeof colors]> = {
    Bug: colors.typeBug,
    Dark: colors.typeDark,
    Dragon: colors.typeDragon,
    Electric: colors.typeElectric,
    Fairy: colors.typeFairy,
    Fighting: colors.typeFighting,
    Fire: colors.typeFire,
    Flying: colors.typeFlying,
    Ghost: colors.typeGhost,
    Grass: colors.typeGrass,
    Ground: colors.typeGround,
    Ice: colors.typeIce,
    Normal: colors.typeNormal,
    Poison: colors.typePoison,
    Psychic: colors.typePsychic,
    Rock: colors.typeRock,
    Steel: colors.typeSteel,
    Water: colors.typeWater,
  };

  return typeColors[type] ?? colors.muted;
}

function typeTextColor(type: string) {
  const lightTextTypes = new Set([
    "Dark",
    "Dragon",
    "Fighting",
    "Fire",
    "Ghost",
    "Poison",
    "Psychic",
    "Water",
  ]);

  return lightTextTypes.has(type)
    ? colors.typeTagTextLight
    : colors.typeTagTextDark;
}
