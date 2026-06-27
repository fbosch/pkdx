import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PokemonAbilityDetail, PokemonDetail } from "../../pokemon-detail";
import { pokemonAbilityDetailsQueryOptions } from "../../pokemon-detail";
import { KeyHints, Modal, keyHintsWidth } from "../components";
import { colors, textStyles } from "../design-tokens";

export function AbilityViewer({
  abilities,
  onClose,
}: {
  abilities: PokemonDetail["abilities"];
  onClose?: () => void;
}) {
  const queryClient = useQueryClient();
  const abilityDetails = useQuery(
    pokemonAbilityDetailsQueryOptions(abilities, queryClient),
  );

  return (
    <Modal
      right={<KeyHints hints={[{ key: "a/esc", action: "close" }]} />}
      rightWidth={keyHintsWidth([{ key: "a/esc", action: "close" }])}
      title="Abilities"
      {...(onClose === undefined ? {} : { onClose })}
    >
      {abilityDetails.isError ? (
        <text fg={colors.muted} attributes={textStyles.muted}>
          {abilityErrorMessage(abilityDetails.error)}
        </text>
      ) : null}
      {abilityDetails.data?.map((ability) => (
        <AbilityDescription key={ability.name} ability={ability} />
      ))}
    </Modal>
  );
}

function abilityErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return `Could not load ability descriptions: ${error.message}`;
  }

  return "Could not load ability descriptions. If offline, they may not be cached yet.";
}

function AbilityDescription({ ability }: { ability: PokemonAbilityDetail }) {
  return (
    <box style={{ flexDirection: "column", marginBottom: 1 }}>
      <text attributes={textStyles.active}>{ability.name}</text>
      <text>{ability.shortEffect}</text>
      <text fg={colors.muted} attributes={textStyles.muted}>
        {ability.effect}
      </text>
    </box>
  );
}
