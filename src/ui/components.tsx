import { useState, type ReactNode } from "react";
import { colors, textStyles } from "./design-tokens";

export const detailCardWidth = 100;
const detailTitleWidth = 94;

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
      <span> </span>
    </text>
  );
}

export function DetailCardTitle({
  left,
  leftWidth,
  right,
  titleWidth = detailTitleWidth,
  rightWidth,
}: {
  left: ReactNode;
  leftWidth?: number;
  right: ReactNode;
  titleWidth?: number;
  rightWidth?: number;
}) {
  const resolvedLeftWidth =
    leftWidth ?? (typeof left === "string" ? left.length : 0);
  const resolvedRightWidth =
    rightWidth ?? (typeof right === "string" ? right.length : 0);
  const spacerWidth = Math.max(
    1,
    titleWidth - resolvedLeftWidth - resolvedRightWidth,
  );

  return (
    <text attributes={textStyles.active}>
      <span>{left}</span>
      <span>{" ".repeat(spacerWidth)}</span>
      {right}
    </text>
  );
}

export function Modal({
  children,
  minWidth,
  onClose,
  right,
  rightWidth,
  title,
  width = 84,
}: {
  children: ReactNode;
  minWidth?: number;
  onClose?: () => void;
  right: ReactNode;
  rightWidth?: number;
  title: string;
  width?: number;
}) {
  const resolvedWidth = Math.max(minWidth ?? 0, width);

  return (
    <>
      <box
        backgroundColor={colors.modalBackdrop}
        style={{
          height: "100%",
          left: 0,
          opacity: 0.45,
          position: "absolute",
          top: 0,
          width: "100%",
          zIndex: 199,
        }}
      />
      <box
        style={{
          alignItems: "center",
          height: "100%",
          justifyContent: "center",
          position: "absolute",
          width: "100%",
          zIndex: 200,
        }}
      >
        <box
          backgroundColor={colors.modalBackground}
          border
          borderColor={colors.accent}
          borderStyle="rounded"
          style={{
            flexDirection: "column",
            paddingX: 1,
            position: "relative",
            width: resolvedWidth,
          }}
        >
          <ModalTitle
            closeWidth={onClose === undefined ? 0 : 6}
            right={right}
            rightWidth={rightWidth}
            title={title}
            width={resolvedWidth - 4}
          />
          {onClose === undefined ? null : (
            <ModalCloseButton left={resolvedWidth - 8} onClose={onClose} />
          )}
          <text> </text>
          {children}
        </box>
      </box>
    </>
  );
}

function ModalTitle({
  closeWidth,
  right,
  rightWidth,
  title,
  width,
}: {
  closeWidth: number;
  right: ReactNode;
  rightWidth: number | undefined;
  title: string;
  width: number;
}) {
  const resolvedRightWidth =
    rightWidth ?? (typeof right === "string" ? right.length : 0);
  const spacerWidth = Math.max(
    1,
    width - title.length - resolvedRightWidth - closeWidth,
  );

  return (
    <box style={{ flexDirection: "row" }}>
      <text attributes={textStyles.active}>{title}</text>
      <text>{" ".repeat(spacerWidth)}</text>
      <text>{right}</text>
    </box>
  );
}

function ModalCloseButton({
  left,
  onClose,
}: {
  left: number;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <text
      attributes={textStyles.active}
      bg={hovered ? colors.selected : colors.panelSecondary}
      fg={hovered ? colors.selectedText : colors.keyHint}
      onMouseDown={onClose}
      onMouseOut={() => setHovered(false)}
      onMouseOver={() => setHovered(true)}
      style={{ left, position: "absolute", top: 0 }}
    >
      [ X ]
    </text>
  );
}

export function TypeLabels({ types }: { types: string[] }) {
  return (
    <span>
      {types.map((type, index) => (
        <span key={type}>
          {index > 0 ? <span fg={colors.muted}> / </span> : null}
          <TypeTag type={type} />
        </span>
      ))}
    </span>
  );
}

export function TypeTag({
  short = false,
  type,
}: {
  short?: boolean;
  type: string;
}) {
  return (
    <span bg={typeColor(type)} fg={typeTextColor(type)}>
      {` ${short ? shortTypeLabel(type) : type} `}
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

export type KeyHint = {
  action: string;
  key: string;
};

export function KeyHints({ hints }: { hints: readonly KeyHint[] }) {
  return (
    <span>
      {hints.map((hint, index) => (
        <span key={`${hint.key}-${hint.action}`}>
          {index > 0 ? <span fg={colors.muted}> | </span> : null}
          <KeyHintView hint={hint} />
        </span>
      ))}
    </span>
  );
}

export function keyHintsWidth(hints: readonly KeyHint[]): number {
  return hints.reduce((width, hint, index) => {
    return (
      width + hint.key.length + 1 + hint.action.length + (index > 0 ? 3 : 0)
    );
  }, 0);
}

export function InstructionFooter({ children }: { children: ReactNode }) {
  return (
    <text
      attributes={textStyles.muted}
      style={{ alignSelf: "center", bottom: 1, position: "absolute" }}
    >
      {children}
    </text>
  );
}

function KeyHintView({ hint }: { hint: KeyHint }) {
  return (
    <span>
      <span fg={colors.keyHint}>{hint.key}</span>
      <span fg={colors.muted}> {hint.action}</span>
    </span>
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

function shortTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    Bug: "BUG",
    Dark: "DAR",
    Dragon: "DRA",
    Electric: "ELE",
    Fairy: "FAI",
    Fighting: "FIG",
    Fire: "FIR",
    Flying: "FLY",
    Ghost: "GHO",
    Grass: "GRA",
    Ground: "GRO",
    Ice: "ICE",
    Normal: "NOR",
    Poison: "POI",
    Psychic: "PSY",
    Rock: "ROC",
    Steel: "STE",
    Water: "WAT",
  };

  return labels[type] ?? type.slice(0, 3).toUpperCase();
}
