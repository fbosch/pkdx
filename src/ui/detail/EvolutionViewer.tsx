import type {
  PokemonEvolution,
  PokemonEvolutionChain,
} from "../../pokemon-detail";
import { useState } from "react";
import { KeyHints, Modal, keyHintsWidth } from "../components";
import { colors, textStyles } from "../design-tokens";

const closeHints = [{ key: "e/esc", action: "close" }] as const;
const evolutionModalHorizontalPadding = 4;
const evolutionModalMaxWidth = 96;
const evolutionModalMinWidth = 56;

type EvolutionChartLink = {
  end: number;
  name: string;
  start: number;
  targetName: string;
};

type EvolutionChartRow = {
  links: EvolutionChartLink[];
  text: string;
};
type EvolutionRouteStep = {
  method: string;
  name: string;
  targetName: string;
};
type EvolutionRoute = {
  root: string;
  rootTargetName: string;
  steps: EvolutionRouteStep[];
};

export function EvolutionViewer({
  evolutionChain,
  onClose,
  onSelectSpecies,
}: {
  evolutionChain: PokemonEvolutionChain;
  onClose?: () => void;
  onSelectSpecies: (name: string) => void;
}) {
  const rows = buildEvolutionChartRows(evolutionChain);
  const contentWidth = chartWidth(rows) + evolutionModalHorizontalPadding * 2;
  const modalWidth = Math.min(evolutionModalMaxWidth, contentWidth + 4);

  return (
    <Modal
      minWidth={evolutionModalMinWidth}
      right={<KeyHints hints={closeHints} />}
      rightWidth={keyHintsWidth(closeHints)}
      title="Evolution"
      width={modalWidth}
      {...(onClose === undefined ? {} : { onClose })}
    >
      <box
        style={{
          alignSelf: "center",
          flexDirection: "column",
          paddingX: evolutionModalHorizontalPadding,
          width: Math.min(contentWidth, evolutionModalMaxWidth - 4),
        }}
      >
        {rows.map((row, index) => (
          <EvolutionChartTextRow
            key={index.toString()}
            onSelectSpecies={onSelectSpecies}
            row={row}
          />
        ))}
        <text> </text>
      </box>
    </Modal>
  );
}

function EvolutionChartTextRow({
  onSelectSpecies,
  row,
}: {
  onSelectSpecies: (name: string) => void;
  row: EvolutionChartRow;
}) {
  const chunks = splitEvolutionChartRow(row);

  return (
    <box style={{ flexDirection: "row" }}>
      {chunks.map((chunk, index) => {
        const name = chunk.name;
        if (name === undefined) {
          return (
            <text key={index.toString()} fg={colors.muted}>
              {chunk.text}
            </text>
          );
        }

        return (
          <ClickableEvolutionName
            key={index.toString()}
            name={chunk.targetName ?? name}
            onSelectSpecies={onSelectSpecies}
            text={chunk.text}
          />
        );
      })}
    </box>
  );
}

function ClickableEvolutionName({
  name,
  onSelectSpecies,
  text,
}: {
  name: string;
  onSelectSpecies: (name: string) => void;
  text: string;
}) {
  const [hovered, setHovered] = useState(false);
  const mouseProps = {
    onMouseDown: () => onSelectSpecies(name),
    onMouseOut: () => setHovered(false),
    onMouseOver: () => setHovered(true),
  };
  const hoverProps = hovered
    ? { bg: colors.selected, fg: colors.selectedText }
    : { fg: colors.keyHint };

  return (
    <text attributes={textStyles.active} {...hoverProps} {...mouseProps}>
      {text}
    </text>
  );
}

export function buildEvolutionFlowchartLines(
  evolutionChain: PokemonEvolutionChain,
): string[] {
  return buildEvolutionChartRows(evolutionChain).map((row) => row.text);
}

export function buildEvolutionFlowchartLinks(
  evolutionChain: PokemonEvolutionChain,
): Array<{ name: string; targetName: string }> {
  return buildEvolutionChartRows(evolutionChain).flatMap((row) =>
    row.links.map((link) => ({
      name: link.name,
      targetName: link.targetName,
    })),
  );
}

function buildEvolutionChartRows(
  evolutionChain: PokemonEvolutionChain,
): EvolutionChartRow[] {
  const routes = buildEvolutionRoutes(evolutionChain.root);
  if (routes.length === 0) {
    return [
      pokemonNameRow(
        evolutionChain.root.name,
        "",
        evolutionChain.root.speciesName ?? evolutionChain.root.name,
      ),
    ];
  }

  if (routes.length === 1) {
    return [routePathRow(routes[0] ?? throwMissingRoute())];
  }

  return branchingRouteRows(routes);
}

function buildEvolutionRoutes(evolution: PokemonEvolution): EvolutionRoute[] {
  if (evolution.evolvesTo.length === 0) {
    return [];
  }

  return evolution.evolvesTo.flatMap((child) =>
    childEvolutionRoutes(
      evolution.name,
      evolution.speciesName ?? evolution.name,
      child,
      [],
    ),
  );
}

function childEvolutionRoutes(
  root: string,
  rootTargetName: string,
  evolution: PokemonEvolution,
  ancestors: EvolutionRouteStep[],
): EvolutionRoute[] {
  const steps = [
    ...ancestors,
    {
      method: evolutionMethodLabel(evolution),
      name: evolution.name,
      targetName: evolution.speciesName ?? evolution.name,
    },
  ];

  if (evolution.evolvesTo.length === 0) {
    return [{ root, rootTargetName, steps }];
  }

  return evolution.evolvesTo.flatMap((child) =>
    childEvolutionRoutes(root, rootTargetName, child, steps),
  );
}

function routePathRow(route: EvolutionRoute): EvolutionChartRow {
  let text = route.root;
  const links: EvolutionChartLink[] = [
    nameLink(route.root, route.rootTargetName, 0),
  ];

  for (const step of route.steps) {
    text = `${text} ─${step.method}─▶ `;
    links.push(nameLink(step.name, step.targetName, text.length));
    text = `${text}${step.name}`;
  }

  return { links, text };
}

function branchingRouteRows(
  routes: readonly EvolutionRoute[],
): EvolutionChartRow[] {
  const firstRoute = routes[0];
  if (firstRoute === undefined) {
    throwMissingRoute();
  }

  const root = firstRoute.root;
  const rootTargetName = firstRoute.rootTargetName;
  const rootWidth = root.length;
  const methodWidth = Math.max(
    ...routes.map(
      (route) => route.steps.map((step) => step.method).join(" / ").length,
    ),
  );

  return routes.map((route, index) => {
    const isFirst = index === 0;
    const isLast = index === routes.length - 1;
    const rootText = isFirst ? root : " ".repeat(rootWidth);
    const branch = isFirst ? "┬" : isLast ? "└" : "├";
    const method = route.steps
      .map((step) => step.method)
      .join(" / ")
      .padEnd(methodWidth);
    const target = route.steps.at(-1)?.name ?? root;
    const prefix = `${rootText} ${branch}─${method}─▶ `;

    return {
      links: [
        ...(isFirst ? [nameLink(root, rootTargetName, 0)] : []),
        nameLink(
          target,
          route.steps.at(-1)?.targetName ?? target,
          prefix.length,
        ),
      ],
      text: `${prefix}${target}`,
    };
  });
}

function evolutionMethodLabel(evolution: PokemonEvolution): string {
  const method = evolution.method ?? "evolves";

  if (method.startsWith("use item, ")) {
    return `[${method.slice("use item, ".length)}]`;
  }

  return `[${method.replaceAll(", ", " + ")}]`;
}

function pokemonNameRow(
  name: string,
  prefix: string,
  targetName = name,
): EvolutionChartRow {
  return {
    links: [nameLink(name, targetName, prefix.length)],
    text: `${prefix}${name}`,
  };
}

function nameLink(
  name: string,
  targetName: string,
  start: number,
): EvolutionChartLink {
  return { end: start + name.length, name, start, targetName };
}

function throwMissingRoute(): never {
  throw new Error("Evolution chart has no routes");
}

function splitEvolutionChartRow(row: EvolutionChartRow) {
  const chunks: { name?: string; targetName?: string; text: string }[] = [];
  let cursor = 0;

  for (const link of row.links.toSorted(
    (left, right) => left.start - right.start,
  )) {
    if (cursor < link.start) {
      chunks.push({ text: row.text.slice(cursor, link.start) });
    }

    chunks.push({
      name: link.name,
      targetName: link.targetName,
      text: row.text.slice(link.start, link.end),
    });
    cursor = link.end;
  }

  if (cursor < row.text.length) {
    chunks.push({ text: row.text.slice(cursor) });
  }

  return chunks.length === 0 ? [{ text: row.text }] : chunks;
}

function chartWidth(rows: readonly EvolutionChartRow[]): number {
  return Math.max(1, ...rows.map((row) => row.text.length));
}
