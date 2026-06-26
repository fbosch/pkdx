import type { PokemonEvolutionChain } from "../../pokemon-detail";
import { KeyHints, Modal, keyHintsWidth } from "../components";
import { textStyles } from "../design-tokens";

const closeHints = [{ key: "e/esc", action: "close" }] as const;

export function EvolutionViewer({
  evolutionChain,
}: {
  evolutionChain: PokemonEvolutionChain;
}) {
  const lines = buildEvolutionFlowchartLines(evolutionChain);

  return (
    <Modal
      right={<KeyHints hints={closeHints} />}
      rightWidth={keyHintsWidth(closeHints)}
      title="Evolution"
    >
      <box style={{ flexDirection: "column" }}>
        {lines.map((line) => (
          <text key={line} attributes={textStyles.active}>
            <span>{line}</span>
          </text>
        ))}
      </box>
    </Modal>
  );
}

export function buildEvolutionFlowchartLines(
  evolutionChain: PokemonEvolutionChain,
): string[] {
  return buildEvolutionFlowchartPaths(evolutionChain.root, [
    formatEvolutionNode(evolutionChain.root.name),
  ]);
}

function buildEvolutionFlowchartPaths(
  evolution: PokemonEvolutionChain["root"],
  path: string[],
): string[] {
  if (evolution.evolvesTo.length === 0) {
    return [path.join("")];
  }

  return evolution.evolvesTo.flatMap((child) =>
    buildEvolutionFlowchartPaths(child, [
      ...path,
      ` -- ${child.method ?? "evolves"} --> ${formatEvolutionNode(child.name)}`,
    ]),
  );
}

function formatEvolutionNode(name: string): string {
  return `[ ${name} ]`;
}
