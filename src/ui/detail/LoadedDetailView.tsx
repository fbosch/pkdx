import type { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { DetailNavigationDelta, DetailState } from "../../app-state";
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
  typeLabelsWidth,
} from "../components";
import { colors, textStyles } from "../design-tokens";
import { AbilityViewer } from "./AbilityViewer";
import { DamageTakenPanel } from "./DamageTakenPanel";
import { DetailPanel } from "./DetailPanel";
import { FlavorTextPanel } from "./FlavorTextPanel";
import { FormSelector } from "./FormSelector";
import {
  PokemonSpritePanel,
  PokemonSpriteShinyMarker,
} from "./PokemonSpritePanel";

const detailInfoPanelWidth = 53;
const detailSpritePanelHeight = 17;
const detailSpritePanelWidth = 42;

export type LoadedDetailViewProps = {
  abilityViewerOpen: boolean;
  detail: PokemonDetail;
  descriptionIndex: number;
  errorMessage: string | undefined;
  formSelectorSelectedIndex: number | undefined;
  loadedSpecies: SpeciesIndexEntry;
  loadingSpecies: DetailState["species"] | undefined;
  navigationSpecies: SpeciesIndexEntry;
  onNavigate: (delta: DetailNavigationDelta) => void;
  queryClient: ReturnType<typeof useQueryClient>;
  shiny: boolean;
};

export function LoadedDetailView({
  abilityViewerOpen,
  detail,
  descriptionIndex,
  errorMessage,
  formSelectorSelectedIndex,
  loadedSpecies,
  loadingSpecies,
  navigationSpecies,
  onNavigate,
  queryClient,
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
        {loadingSpecies !== undefined || errorMessage === undefined ? (
          <text> </text>
        ) : null}
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
              queryClient={queryClient}
              shiny={shiny}
              species={loadedSpecies}
            />
          </box>
          <box style={{ flexDirection: "column", width: detailInfoPanelWidth }}>
            <DetailPanel minHeight={7} width={detailInfoPanelWidth}>
              <FlavorTextPanel
                detail={detail}
                selectedIndex={descriptionIndex}
              />
            </DetailPanel>
            <DetailPanel width={detailInfoPanelWidth}>
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
              {detail.abilities.map((ability, index) => (
                <FactRow
                  key={ability.name}
                  label={index === 0 ? "Ability" : ""}
                  value={`${ability.name}${ability.isHidden ? " (Hidden)" : ""}`}
                />
              ))}
            </DetailPanel>
          </box>
        </box>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <DetailPanel width={45}>
            <text attributes={textStyles.active}>Stats</text>
            {detail.stats.map((stat) => (
              <text key={stat.name}>
                <span>{stat.name.padEnd(11)}</span>
                <span> {stat.base.toString().padStart(3)} </span>
                <StatBar name={stat.name} value={stat.base} />
              </text>
            ))}
          </DetailPanel>
          <DetailPanel width={50}>
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
        formSelectorSelectedIndex={formSelectorSelectedIndex}
        queryClient={queryClient}
      />
      <LoadedDetailFooter
        hasAlternateForms={detail.forms.length > 1}
        shiny={shiny}
      />
    </DetailScreen>
  );
}

function DexNavigationButtons({
  nextSpecies,
  onNavigate,
  previousSpecies,
}: {
  nextSpecies: SpeciesIndexEntry | undefined;
  onNavigate: (delta: DetailNavigationDelta) => void;
  previousSpecies: SpeciesIndexEntry | undefined;
}) {
  return (
    <box
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        width: 100,
      }}
    >
      <DexNavigationButton
        label={
          previousSpecies === undefined
            ? ""
            : `< ${formatDexNavigationSpecies(previousSpecies)}`
        }
        onPress={
          previousSpecies === undefined ? undefined : () => onNavigate(-1)
        }
      />
      <DexNavigationButton
        label={
          nextSpecies === undefined
            ? ""
            : `${formatDexNavigationSpecies(nextSpecies)} >`
        }
        onPress={nextSpecies === undefined ? undefined : () => onNavigate(1)}
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
  const clickProps = onPress === undefined ? {} : { onMouseDown: onPress };

  return (
    <text
      attributes={textStyles.active}
      bg={onPress === undefined ? colors.statEmpty : colors.panelSecondary}
      fg={onPress === undefined ? colors.muted : colors.keyHint}
      {...clickProps}
    >
      <DexNavigationButtonLabel label={label} />
    </text>
  );
}

function DexNavigationButtonLabel({ label }: { label: string }) {
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
      <span fg={colors.muted}>{dexNumber}</span>
      {after}
    </span>
  );
}

function DetailOverlays({
  abilityViewerOpen,
  detail,
  formSelectorSelectedIndex,
  queryClient,
}: {
  abilityViewerOpen: boolean;
  detail: PokemonDetail;
  formSelectorSelectedIndex: number | undefined;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  return (
    <>
      {abilityViewerOpen ? (
        <AbilityViewer abilities={detail.abilities} queryClient={queryClient} />
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
