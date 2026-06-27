import type { PokemonForm } from "../../pokemon-detail";
import { KeyHints, Modal, keyHintsWidth } from "../components";
import { colors } from "../design-tokens";

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
  const options = forms.map((form) => ({
    description: "",
    name: `${form.pokemonName === currentForm.pokemonName ? "*" : " "} ${form.displayName}`,
    value: form.pokemonName,
  }));

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
      <select
        height={forms.length}
        options={options}
        selectedBackgroundColor={colors.selected}
        selectedIndex={selectedIndex}
        selectedTextColor={colors.selectedText}
        showDescription={false}
        textColor={colors.keyHint}
        width={36}
      />
    </Modal>
  );
}
