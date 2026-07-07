import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
  PokemonAbilityDetail,
  PokemonDetail,
} from "#src/pokemon-detail.ts";
import { pokemonAbilityDetailsQueryOptions } from "#src/pokemon-detail.ts";
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
      {abilityDetails.data?.map((ability, index) => (
        <AbilityDescription
          key={ability.name}
          ability={ability}
          shortcutNumber={index + 1}
        />
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

function AbilityDescription({
  ability,
  shortcutNumber,
}: {
  ability: PokemonAbilityDetail;
  shortcutNumber: number;
}) {
  return (
    <box style={{ flexDirection: "column", marginBottom: 1 }}>
      <ClickableAbilityTitle
        ability={ability}
        shortcutNumber={shortcutNumber}
      />
      <text>{ability.shortEffect}</text>
      <text fg={colors.muted} attributes={textStyles.muted}>
        {ability.effect}
      </text>
    </box>
  );
}

function ClickableAbilityTitle({
  ability,
  shortcutNumber,
}: {
  ability: Pick<PokemonAbilityDetail, "name">;
  shortcutNumber: number;
}) {
  const [hovered, setHovered] = useState(false);
  const hoverProps = hovered
    ? { bg: colors.selected, fg: colors.selectedText }
    : { fg: colors.keyHint };

  return (
    <text
      attributes={textStyles.active}
      onMouseDown={() => {
        void openPokemonDbAbilityInBrowser(ability);
      }}
      onMouseOut={() => setHovered(false)}
      onMouseOver={() => setHovered(true)}
      {...hoverProps}
    >
      {ability.name}
      <span fg={hovered ? colors.selectedText : colors.muted}>
        {` [${shortcutNumber.toString()}]`}
      </span>
    </text>
  );
}

async function openPokemonDbAbilityInBrowser(ability: { name: string }) {
  const { openPokemonDbAbility } = await import("#src/external-links.ts");
  await openPokemonDbAbility(ability);
}
