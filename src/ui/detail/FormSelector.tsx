import type { PokemonForm } from "../../pokemon-detail";
import { KeyHints, Modal, keyHintsWidth } from "../components";
import { colors, textStyles } from "../design-tokens";

export function FormSelector({
  currentForm,
  forms,
  onClose,
  selectedIndex,
}: {
  currentForm: PokemonForm;
  forms: readonly PokemonForm[];
  onClose?: () => void;
  selectedIndex: number;
}) {
  return (
    <Modal
      right={
        <KeyHints
          hints={[
            { key: "j/k", action: "move" },
            { key: "enter", action: "select" },
            { key: "esc", action: "close" },
          ]}
        />
      }
      rightWidth={keyHintsWidth([
        { key: "j/k", action: "move" },
        { key: "enter", action: "select" },
        { key: "esc", action: "close" },
      ])}
      title="Forms"
      {...(onClose === undefined ? {} : { onClose })}
    >
      {forms.map((form, index) => {
        const selected = index === selectedIndex;
        const current = form.pokemonName === currentForm.pokemonName;
        const label = `${current ? "*" : " "} ${form.displayName}`;

        return (
          <text
            key={form.pokemonName}
            attributes={selected ? textStyles.selected : textStyles.normal}
            {...(selected
              ? { bg: colors.selected, fg: colors.selectedText }
              : {})}
          >
            {selected ? label.padEnd(36) : label}
          </text>
        );
      })}
    </Modal>
  );
}
