import { useState, type ReactNode } from "react";
import type { DetailNavigationDelta } from "../../app-state";
import type { PokemonDetail } from "../../pokemon-detail";
import { getSpeciesByDexDelta, type SpeciesIndexEntry } from "../../search";
import {
  DetailCardTitle,
  DetailScreen,
  InstructionFooter,
  KeyHints,
  PokedexCard,
  StatBar,
  TypeLabels,
  detailCardWidth,
  typeLabelsWidth,
} from "../components";
import { colors, textStyles } from "../design-tokens";
import { AbilityViewer } from "./AbilityViewer";
import { DamageTakenPanel } from "./DamageTakenPanel";
import { DetailPanel } from "./DetailPanel";
import { EvolutionViewer } from "./EvolutionViewer";
import { FlavorTextPanel } from "./FlavorTextPanel";
import { FormSelector } from "./FormSelector";
import {
  PokemonSpritePanel,
  PokemonSpriteShinyMarker,
} from "./PokemonSpritePanel";

const detailInfoPanelWidth = 50;
const detailSpritePanelHeight = 23;
const detailSpritePanelWidth = 45;
const detailFactsPanelHeight = 10;
const detailFlavorPanelHeight =
  detailSpritePanelHeight - detailFactsPanelHeight;

export type LoadedDetailViewProps = {
  abilityViewerOpen: boolean;
  detail: PokemonDetail;
  descriptionIndex: number;
  errorMessage: string | undefined;
  evolutionViewerOpen: boolean;
  formSelectorSelectedIndex: number | undefined;
  loadedSpecies: SpeciesIndexEntry;
  navigationSpecies: SpeciesIndexEntry;
  onNavigate: (delta: DetailNavigationDelta) => void;
  onSelectSpecies: (name: string) => void;
  shiny: boolean;
};

export function LoadedDetailView({
  abilityViewerOpen,
  detail,
  descriptionIndex,
  errorMessage,
  evolutionViewerOpen,
  formSelectorSelectedIndex,
  loadedSpecies,
  navigationSpecies,
  onNavigate,
  onSelectSpecies,
  shiny,
}: LoadedDetailViewProps) {
  const previousSpecies = getSpeciesByDexDelta(navigationSpecies, -1);
  const nextSpecies = getSpeciesByDexDelta(navigationSpecies, 1);

  return (
    <DetailScreen>
      <PokedexCard>
        <DetailCardTitle
          left={
            <span>
              <span fg={colors.muted}>
                #{detail.dexNumber.toString().padStart(3, "0")}
              </span>
              <span> {detail.name}</span>
            </span>
          }
          leftWidth={
            `#${detail.dexNumber.toString().padStart(3, "0")} ${detail.name}`
              .length
          }
          right={<TypeLabels types={detail.types} />}
          rightWidth={typeLabelsWidth(detail.types)}
        />
        {errorMessage !== undefined ? (
          <text fg={colors.muted} attributes={textStyles.muted}>
            Could not load next Detail: {errorMessage}. Press r to retry or / to
            search.
          </text>
        ) : null}
        <box style={{ alignItems: "flex-start", flexDirection: "row", gap: 1 }}>
          <box
            border
            borderColor={colors.panelSecondary}
            borderStyle="rounded"
            style={{
              alignItems: "center",
              flexDirection: "column",
              height: detailSpritePanelHeight,
              justifyContent: "center",
              paddingX: 1,
              position: "relative",
              width: detailSpritePanelWidth,
            }}
          >
            {shiny ? <PokemonSpriteShinyMarker /> : null}
            <PokemonSpritePanel
              form={detail.form}
              shiny={shiny}
              species={loadedSpecies}
            />
          </box>
          <box style={{ flexDirection: "column", width: detailInfoPanelWidth }}>
            <DetailPanel
              height={detailFlavorPanelHeight}
              width={detailInfoPanelWidth}
            >
              <FlavorTextPanel
                detail={detail}
                selectedIndex={descriptionIndex}
              />
            </DetailPanel>
            <DetailPanel
              height={detailFactsPanelHeight}
              width={detailInfoPanelWidth}
            >
              <FactRow label="Species" value={detail.species} />
              <FactRow label="Egg Group" value={detail.eggGroups.join(" / ")} />
              <FactRow
                label="Gender"
                value={<GenderRatio ratio={detail.genderRatio} />}
              />
              <FactRow
                label="Height"
                value={`${detail.heightMeters.toFixed(1)} m`}
              />
              <FactRow
                label="Weight"
                value={`${detail.weightKilograms.toFixed(1)} kg`}
              />
              <AbilityRows abilities={detail.abilities} />
            </DetailPanel>
          </box>
        </box>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <DetailPanel minHeight={10} width={45}>
            <text attributes={textStyles.active}>Stats</text>
            <text> </text>
            {detail.stats.map((stat) => (
              <text key={stat.name}>
                <span>{stat.name.padEnd(11)}</span>
                <span> {stat.base.toString().padStart(3)} </span>
                <StatBar name={stat.name} value={stat.base} />
              </text>
            ))}
          </DetailPanel>
          <DetailPanel
            key={`damage-${detail.dexNumber}-${detail.form.spriteFormKey}`}
            minHeight={10}
            width={50}
          >
            <DamageTakenPanel damageTaken={detail.damageTaken} />
          </DetailPanel>
        </box>
      </PokedexCard>
      <DexNavigationButtons
        nextSpecies={nextSpecies}
        onNavigate={onNavigate}
        previousSpecies={previousSpecies}
      />
      <DetailOverlays
        abilityViewerOpen={abilityViewerOpen}
        detail={detail}
        evolutionViewerOpen={evolutionViewerOpen}
        formSelectorSelectedIndex={formSelectorSelectedIndex}
        onSelectSpecies={onSelectSpecies}
      />
      <LoadedDetailFooter
        hasAlternateForms={detail.forms.length > 1}
        shiny={shiny}
      />
    </DetailScreen>
  );
}

export function DexNavigationButtons({
  nextSpecies,
  onNavigate,
  previousSpecies,
}: {
  nextSpecies: SpeciesIndexEntry | undefined;
  onNavigate?: (delta: DetailNavigationDelta) => void;
  previousSpecies: SpeciesIndexEntry | undefined;
}) {
  return (
    <box
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        width: detailCardWidth,
      }}
    >
      <DexNavigationButton
        label={
          previousSpecies === undefined
            ? ""
            : `< ${formatDexNavigationSpecies(previousSpecies)}`
        }
        onPress={
          previousSpecies === undefined || onNavigate === undefined
            ? undefined
            : () => onNavigate(-1)
        }
      />
      <DexNavigationButton
        label={
          nextSpecies === undefined
            ? ""
            : `${formatDexNavigationSpecies(nextSpecies)} >`
        }
        onPress={
          nextSpecies === undefined || onNavigate === undefined
            ? undefined
            : () => onNavigate(1)
        }
      />
    </box>
  );
}

function formatDexNavigationSpecies(species: SpeciesIndexEntry): string {
  return `#${species.dexNumber.toString().padStart(3, "0")} ${species.name}`;
}

function DexNavigationButton({
  label,
  onPress,
}: {
  label: string;
  onPress: (() => void) | undefined;
}) {
  const [hovered, setHovered] = useState(false);
  const clickProps =
    onPress === undefined
      ? {}
      : {
          onMouseDown: onPress,
          onMouseOut: () => setHovered(false),
          onMouseOver: () => setHovered(true),
        };
  const active = onPress !== undefined;
  const highlighted = active && hovered;

  return (
    <text
      attributes={textStyles.active}
      bg={
        active === false
          ? colors.statEmpty
          : highlighted
            ? colors.selected
            : colors.panelSecondary
      }
      fg={
        active === false
          ? colors.muted
          : highlighted
            ? colors.selectedText
            : colors.keyHint
      }
      {...clickProps}
    >
      <DexNavigationButtonLabel highlighted={highlighted} label={label} />
    </text>
  );
}

function DexNavigationButtonLabel({
  highlighted,
  label,
}: {
  highlighted: boolean;
  label: string;
}) {
  const dexNumberMatch = /#\d{3}/.exec(label);
  if (dexNumberMatch === null) {
    return <span>{label}</span>;
  }

  const before = label.slice(0, dexNumberMatch.index);
  const dexNumber = dexNumberMatch[0];
  const after = label.slice(dexNumberMatch.index + dexNumber.length);

  return (
    <span>
      {before}
      <span fg={highlighted ? colors.selectedText : colors.muted}>
        {dexNumber}
      </span>
      {after}
    </span>
  );
}

function AbilityRows({ abilities }: { abilities: PokemonDetail["abilities"] }) {
  return padAbilities(abilities, 3).map((ability, index) => (
    <FactRow
      key={ability?.name ?? `empty-ability-${index.toString()}`}
      label={index === 0 ? "Ability" : ""}
      value={
        ability === undefined
          ? ""
          : `${ability.name}${ability.isHidden ? " (Hidden)" : ""}`
      }
    />
  ));
}

function padAbilities(
  abilities: PokemonDetail["abilities"],
  minLength: number,
): Array<PokemonDetail["abilities"][number] | undefined> {
  const padding: undefined[] = Array.from({
    length: Math.max(0, minLength - abilities.length),
  });

  return [...abilities, ...padding];
}

function DetailOverlays({
  abilityViewerOpen,
  detail,
  evolutionViewerOpen,
  formSelectorSelectedIndex,
  onSelectSpecies,
}: {
  abilityViewerOpen: boolean;
  detail: PokemonDetail;
  evolutionViewerOpen: boolean;
  formSelectorSelectedIndex: number | undefined;
  onSelectSpecies: (name: string) => void;
}) {
  return (
    <>
      {abilityViewerOpen ? (
        <AbilityViewer abilities={detail.abilities} />
      ) : null}
      {evolutionViewerOpen ? (
        <EvolutionViewer
          evolutionChain={detail.evolutionChain}
          onSelectSpecies={onSelectSpecies}
        />
      ) : null}
      {formSelectorSelectedIndex === undefined ? null : (
        <FormSelector
          currentForm={detail.form}
          forms={detail.forms}
          selectedIndex={formSelectorSelectedIndex}
        />
      )}
    </>
  );
}

function LoadedDetailFooter({
  hasAlternateForms,
  shiny,
}: {
  hasAlternateForms: boolean;
  shiny: boolean;
}) {
  return (
    <InstructionFooter>
      <KeyHints
        hints={[
          { key: "h/l", action: "prev/next" },
          { key: "a", action: "abilities" },
          { key: "e", action: "evolution" },
          ...(hasAlternateForms ? [{ key: "f", action: "forms" }] : []),
          { key: "d/D", action: "desc" },
          { key: "s", action: shiny ? "regular" : "shiny" },
          { key: "/", action: "search" },
          { key: "q/esc", action: "exit" },
        ]}
      />
    </InstructionFooter>
  );
}

function GenderRatio({ ratio }: { ratio: PokemonDetail["genderRatio"] }) {
  if (ratio.kind === "genderless") {
    return <span fg={colors.muted}>Genderless</span>;
  }

  return (
    <span>
      {ratio.malePercent > 0 ? (
        <span>
          <span fg={colors.genderMale}>♂</span>
          <span>{` ${formatPercent(ratio.malePercent)}`}</span>
        </span>
      ) : null}
      {ratio.malePercent > 0 && ratio.femalePercent > 0 ? (
        <span fg={colors.muted}> / </span>
      ) : null}
      {ratio.femalePercent > 0 ? (
        <span>
          <span fg={colors.genderFemale}>♀</span>
          <span>{` ${formatPercent(ratio.femalePercent)}`}</span>
        </span>
      ) : null}
    </span>
  );
}

function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value.toString() : value.toFixed(1)}%`;
}

function FactRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <text>
      <span fg={colors.muted}>{label.padEnd(11)}</span>
      {value}
    </text>
  );
}
