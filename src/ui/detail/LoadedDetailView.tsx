import { useState, type ReactNode } from "react";
import type { DetailNavigationDelta } from "#src/app-state.ts";
import {
  hasPokemonEvolutionChain,
  type PokemonDetail,
} from "#src/pokemon-detail.ts";
import {
  getSpeciesByDexDelta,
  type SpeciesIndexEntry,
} from "#src/search/index.ts";
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
import { DetailErrorModal } from "./DetailErrorModal";
import { DetailPanel } from "./DetailPanel";
import { EvolutionViewer } from "./EvolutionViewer";
import { FlavorTextPanel } from "./FlavorTextPanel";
import { FormSelector } from "./FormSelector";
import {
  PokemonSpritePanel,
  PokemonSpriteShinyMarker,
} from "./PokemonSpritePanel";

export const detailInfoPanelWidth = 50;
export const detailSpritePanelHeight = 23;
export const detailSpritePanelWidth = 45;
export const detailFactsPanelHeight = 14;
export const detailFlavorPanelHeight =
  detailSpritePanelHeight - detailFactsPanelHeight;
export const detailStatsPanelWidth = 45;
export const detailDamagePanelWidth = 50;
export const detailLowerPanelHeight = 10;
const detailStatsPanelContentWidth = detailStatsPanelWidth - 4;
const detailStatLabelWidth = 11;
const detailStatValueWidth = 5;
const detailStatBarWidth =
  detailStatsPanelContentWidth - detailStatLabelWidth - detailStatValueWidth;

export type LoadedDetailViewProps = {
  abilityViewerOpen: boolean;
  detail: PokemonDetail;
  descriptionIndex: number;
  errorMessage: string | undefined;
  evolutionViewerOpen: boolean;
  formSelectorSelectedIndex: number | undefined;
  loadedSpecies: SpeciesIndexEntry;
  navigationSpecies: SpeciesIndexEntry;
  onCloseOverlay: () => void;
  onNavigate: (delta: DetailNavigationDelta) => void;
  onSelectSpecies: (name: string) => void;
  shiny: boolean;
  terminalImagesEnabled: boolean;
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
  onCloseOverlay,
  onNavigate,
  onSelectSpecies,
  shiny,
  terminalImagesEnabled,
}: LoadedDetailViewProps) {
  const previousSpecies = getSpeciesByDexDelta(navigationSpecies, -1);
  const nextSpecies = getSpeciesByDexDelta(navigationSpecies, 1);
  const statTotal = detail.stats.reduce((total, stat) => total + stat.base, 0);
  const statTotalLabel = statTotal.toString();

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
          right={
            <span>
              <span> </span>
              <TypeLabels types={detail.types} />
            </span>
          }
          rightWidth={typeLabelsWidth(detail.types)}
        />
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
              terminalImagesEnabled={
                terminalImagesEnabled &&
                errorMessage === undefined &&
                !abilityViewerOpen &&
                !evolutionViewerOpen &&
                formSelectorSelectedIndex === undefined
              }
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
              <FactRow label="Generation" value={detail.generation} />
              <FactRow label="Growth" value={detail.growthRate} />
              <FactRow label="Capture" value={detail.captureRate.toString()} />
              <FactRow label="EV Yield" value={formatEvYield(detail.evYield)} />
              <AbilityRows abilities={detail.abilities} />
            </DetailPanel>
          </box>
        </box>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <DetailPanel
            height={detailLowerPanelHeight}
            width={detailStatsPanelWidth}
          >
            <text attributes={textStyles.active}>
              <span>Stats</span>
              <span>
                {" ".repeat(
                  Math.max(
                    1,
                    detailStatsPanelContentWidth - 5 - statTotalLabel.length,
                  ),
                )}
              </span>
              <span fg={colors.muted}>{statTotalLabel}</span>
            </text>
            <text> </text>
            {detail.stats.map((stat) => (
              <text key={stat.name}>
                <span>{stat.name.padEnd(detailStatLabelWidth)}</span>
                <span> {stat.base.toString().padStart(3)} </span>
                <StatBar
                  name={stat.name}
                  value={stat.base}
                  width={detailStatBarWidth}
                />
              </text>
            ))}
          </DetailPanel>
          <DetailPanel
            key={`damage-${detail.dexNumber}-${detail.form.spriteFormKey}`}
            height={detailLowerPanelHeight}
            width={detailDamagePanelWidth}
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
        onCloseOverlay={onCloseOverlay}
        onSelectSpecies={onSelectSpecies}
      />
      {errorMessage === undefined ? null : (
        <DetailErrorModal
          message={errorMessage}
          title="Could Not Load Detail"
        />
      )}
      <LoadedDetailFooter
        hasAlternateForms={detail.forms.length > 1}
        hasEvolutionChain={hasPokemonEvolutionChain(detail.evolutionChain)}
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
    <AbilityFactRow
      key={ability?.name ?? `empty-ability-${index.toString()}`}
      ability={ability}
      label={index === 0 ? "Ability" : ""}
    />
  ));
}

function AbilityFactRow({
  ability,
  label,
}: {
  ability: PokemonDetail["abilities"][number] | undefined;
  label: string;
}) {
  const [hovered, setHovered] = useState(false);

  if (ability === undefined) {
    return <FactRow label={label} value="" />;
  }

  const mouseProps = {
    onMouseDown: () => {
      void openPokemonDbAbilityInBrowser(ability);
    },
    onMouseOut: () => setHovered(false),
    onMouseOver: () => setHovered(true),
  };
  const hoverProps = hovered
    ? { bg: colors.selected, fg: colors.selectedText }
    : { fg: colors.keyHint };

  return (
    <text {...mouseProps}>
      <span fg={colors.muted}>{label.padEnd(11)}</span>
      <span attributes={textStyles.active} {...hoverProps}>
        {ability.name}
        {ability.isHidden ? " (Hidden)" : ""}
      </span>
    </text>
  );
}

async function openPokemonDbAbilityInBrowser(ability: { name: string }) {
  const { openPokemonDbAbility } = await import("#src/external-links.ts");
  await openPokemonDbAbility(ability);
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
  onCloseOverlay,
  onSelectSpecies,
}: {
  abilityViewerOpen: boolean;
  detail: PokemonDetail;
  evolutionViewerOpen: boolean;
  formSelectorSelectedIndex: number | undefined;
  onCloseOverlay: () => void;
  onSelectSpecies: (name: string) => void;
}) {
  return (
    <>
      {abilityViewerOpen ? (
        <AbilityViewer abilities={detail.abilities} onClose={onCloseOverlay} />
      ) : null}
      {evolutionViewerOpen ? (
        <EvolutionViewer
          evolutionChain={detail.evolutionChain}
          onClose={onCloseOverlay}
          onSelectSpecies={onSelectSpecies}
        />
      ) : null}
      {formSelectorSelectedIndex === undefined ? null : (
        <FormSelector
          currentForm={detail.form}
          forms={detail.forms}
          onClose={onCloseOverlay}
          selectedIndex={formSelectorSelectedIndex}
        />
      )}
    </>
  );
}

function LoadedDetailFooter({
  hasAlternateForms,
  hasEvolutionChain,
  shiny,
}: {
  hasAlternateForms: boolean;
  hasEvolutionChain: boolean;
  shiny: boolean;
}) {
  return (
    <InstructionFooter>
      <KeyHints
        hints={[
          { key: "h/l", action: "prev/next" },
          { key: "a", action: "abilities" },
          ...(hasEvolutionChain ? [{ key: "e", action: "evolution" }] : []),
          ...(hasAlternateForms ? [{ key: "f", action: "forms" }] : []),
          { key: "d/D", action: "desc" },
          { key: "o", action: "web" },
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

function formatEvYield(evYield: PokemonDetail["evYield"]): string {
  if (evYield.length === 0) {
    return "None";
  }

  return evYield.map((entry) => `${entry.name} ${entry.effort}`).join(" / ");
}

function FactRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <text>
      <span fg={colors.muted}>{label.padEnd(11)}</span>
      {value}
    </text>
  );
}
