import { expect, test } from "bun:test";
import { createElement } from "react";
import { isValidElement } from "react";
import type { PokemonDetail } from "../src/pokemon-detail";
import type { SpeciesIndexEntry } from "../src/search";
import { QueryDebugPanelView } from "../src/ui/QueryDebugPanel";
import { DamageTakenPanel } from "../src/ui/detail/DamageTakenPanel";
import { DetailErrorModal } from "../src/ui/detail/DetailErrorModal";
import { DetailPanel } from "../src/ui/detail/DetailPanel";
import {
  EvolutionViewer,
  buildEvolutionFlowchartLinks,
  buildEvolutionFlowchartLines,
  buildEvolutionShortcutIndicators,
} from "../src/ui/detail/EvolutionViewer";
import { FormSelector } from "../src/ui/detail/FormSelector";
import { FlavorTextPanel } from "../src/ui/detail/FlavorTextPanel";
import {
  DexNavigationButtons,
  LoadedDetailView,
} from "../src/ui/detail/LoadedDetailView";
import {
  PokemonSpriteArtwork,
  PokemonSpriteFallback,
  PokemonSpriteInlineImage,
  PokemonSpriteShinyMarker,
} from "../src/ui/detail/PokemonSpritePanel";
import {
  eeveePokemonEvolutionChain,
  pikachuPokemonEvolutionChain,
} from "./support/pokeapi-fixtures";

test("renders Damage Taken panel with matchup entries", () => {
  const element = DamageTakenPanel({
    damageTaken: {
      resistances: [
        { multiplier: 0.5, type: "Electric" },
        { multiplier: 0.25, type: "Grass" },
      ],
      weaknesses: [
        { multiplier: 2, type: "Fire" },
        { multiplier: 4, type: "Rock" },
      ],
    },
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);

  if (!isValidElement(element)) {
    throw new Error("DamageTakenPanel did not return a React element");
  }

  expect(element.type).toBe("box");
});

test("renders terminal sprite artwork rows", () => {
  const element = PokemonSpriteArtwork({
    sprite: {
      height: 1,
      rows: [
        [
          { bg: 196, char: "▄", fg: 21 },
          { char: "▀", fg: 46 },
        ],
      ],
      width: 2,
    },
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("renders inline image sprite artwork", () => {
  const element = createElement(PokemonSpriteInlineImage, {
    filePath: "/tmp/pikachu.png",
    support: { protocol: "kitty" },
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("renders recoverable sprite-specific errors", () => {
  const element = PokemonSpriteFallback();

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("renders shiny Sprite marker", () => {
  const element = PokemonSpriteShinyMarker();

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("renders query debug panel entries", () => {
  const element = QueryDebugPanelView({
    entries: [
      {
        error: "",
        id: "pokemon-detail-25",
        key: "detail pikachu default",
        observers: 1,
        status: "fresh",
        updated: "0s ago",
      },
    ],
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("renders detail errors in a modal", () => {
  const element = DetailErrorModal({
    message: "Invalid input",
    title: "Could Not Load Detail",
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("renders basic Detail panel sizing", () => {
  const element = DetailPanel({
    children: "content",
    height: 4,
    minHeight: 3,
    width: 20,
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);

  expect(isValidElement(element)).toBe(true);
});

test("renders flavor text source metadata", () => {
  const element = FlavorTextPanel({
    detail: pikachuDetail,
    selectedIndex: 1,
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("renders dex navigation button container", () => {
  const element = DexNavigationButtons({
    nextSpecies: raichuSpeciesIndexEntry,
    onNavigate: () => {},
    previousSpecies: pichuSpeciesIndexEntry,
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);

  expect(isValidElement(element)).toBe(true);
});

test("renders loaded Detail view shell", () => {
  const element = LoadedDetailView({
    abilityViewerOpen: false,
    descriptionIndex: 0,
    detail: pikachuDetail,
    errorMessage: undefined,
    evolutionViewerOpen: false,
    formSelectorSelectedIndex: undefined,
    loadedSpecies: pikachuSpeciesIndexEntry,
    navigationSpecies: pikachuSpeciesIndexEntry,
    onCloseOverlay: () => {},
    onNavigate: () => {},
    onSelectSpecies: () => {},
    shiny: false,
    terminalImagesEnabled: false,
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("renders form selector modal", () => {
  const forms = [
    {
      displayName: "Pikachu (Default)",
      isDefault: true,
      pokemonName: "pikachu",
      pokemonUrl: "https://pokeapi.co/api/v2/pokemon/25/",
      spriteFormKey: "$",
    },
    {
      displayName: "Pikachu Rock Star",
      isDefault: false,
      pokemonName: "pikachu-rock-star",
      pokemonUrl: "https://pokeapi.co/api/v2/pokemon/pikachu-rock-star/",
      spriteFormKey: "rock-star",
    },
  ];
  const currentForm = forms[0];

  if (currentForm === undefined) {
    throw new Error("Missing current form fixture");
  }

  const element = FormSelector({
    currentForm,
    forms,
    selectedIndex: 1,
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("renders evolution viewer modal", () => {
  const element = EvolutionViewer({
    evolutionChain: pikachuPokemonEvolutionChain,
    onSelectSpecies: () => {},
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("formats evolution flowchart lines with methods", () => {
  expect(buildEvolutionFlowchartLines(pikachuPokemonEvolutionChain)).toEqual([
    "Pichu ─[level up + happiness 220]─▶ Pikachu ─[Thunder Stone]─▶ Raichu",
  ]);
});

test("numbers evolution shortcut indicators in species order", () => {
  expect(
    buildEvolutionShortcutIndicators(pikachuPokemonEvolutionChain),
  ).toEqual([
    { indicator: "[1]", targetName: "Pichu" },
    { indicator: "[2]", targetName: "Pikachu" },
    { indicator: "[3]", targetName: "Raichu" },
  ]);
});

test("formats branching Eevee evolution flowchart without clipping labels", () => {
  const lines = buildEvolutionFlowchartLines(eeveePokemonEvolutionChain);
  const output = lines.join("\n");

  expect(lines.length).toBeLessThanOrEqual(40);
  expect(Math.max(...lines.map((line) => line.length))).toBeLessThanOrEqual(90);
  expect(output).toContain("Eevee");
  expect(output).toContain("▶ Vaporeon");
  expect(output).toContain("▶ Jolteon");
  expect(output).toContain("▶ Flareon");
  expect(output).toContain("▶ Espeon");
  expect(output).toContain("▶ Umbreon");
  expect(output).toContain("▶ Leafeon");
  expect(output).toContain("▶ Glaceon");
  expect(output).toContain("▶ Sylveon");
  expect(output).toContain("[level up + happiness 220 + night]");
});

test("formats shared intermediate branching evolutions", () => {
  const lines = buildEvolutionFlowchartLines({
    root: {
      evolvesTo: [
        {
          evolvesTo: [
            {
              evolvesTo: [],
              method: "level-up, min-level 30",
              name: "Gardevoir",
            },
            {
              evolvesTo: [],
              method: "use-item, Dawn Stone",
              name: "Gallade",
            },
          ],
          method: "level-up, min-level 20",
          name: "Kirlia",
        },
      ],
      method: undefined,
      name: "Ralts",
    },
  });
  const output = lines.join("\n");

  expect(output).toContain("Ralts");
  expect(output).toContain("Kirlia");
  expect(output).toContain("Gardevoir");
  expect(output).toContain("Gallade");
});

test("links form-specific evolution labels to base species names", () => {
  const chain = {
    root: {
      evolvesTo: [
        {
          evolvesTo: [],
          method: "use item, Ice Stone",
          name: "Ninetales Alola",
          speciesName: "Ninetales",
        },
      ],
      method: undefined,
      name: "Vulpix Alola",
      speciesName: "Vulpix",
    },
  };

  expect(buildEvolutionFlowchartLines(chain)).toEqual([
    "Vulpix Alola ─[Ice Stone]─▶ Ninetales Alola",
  ]);
  expect(buildEvolutionFlowchartLinks(chain)).toEqual([
    { name: "Vulpix Alola", targetName: "Vulpix" },
    { name: "Ninetales Alola", targetName: "Ninetales" },
  ]);
});

const pichuSpeciesIndexEntry: SpeciesIndexEntry = {
  aliases: [],
  dexNumber: 172,
  dexNumbers: ["172"],
  name: "Pichu",
  slug: "pichu",
};

const pikachuSpeciesIndexEntry: SpeciesIndexEntry = {
  aliases: ["pika"],
  dexNumber: 25,
  dexNumbers: ["025", "25"],
  name: "Pikachu",
  slug: "pikachu",
};

const raichuSpeciesIndexEntry: SpeciesIndexEntry = {
  aliases: [],
  dexNumber: 26,
  dexNumbers: ["026", "26"],
  name: "Raichu",
  slug: "raichu",
};

const pikachuForm = {
  displayName: "Pikachu",
  isDefault: true,
  pokemonName: "pikachu",
  pokemonUrl: "https://pokeapi.co/api/v2/pokemon/25/",
  spriteFormKey: "$",
};

const pikachuDetail: PokemonDetail = {
  abilities: [
    {
      isHidden: false,
      name: "Static",
      url: "https://pokeapi.co/api/v2/ability/9/",
    },
    {
      isHidden: true,
      name: "Lightning Rod",
      url: "https://pokeapi.co/api/v2/ability/31/",
    },
  ],
  captureRate: 190,
  damageTaken: {
    resistances: [{ multiplier: 0.5, type: "Flying" }],
    weaknesses: [{ multiplier: 2, type: "Ground" }],
  },
  dexNumber: 25,
  eggGroups: ["Field", "Fairy"],
  evYield: [{ effort: 2, name: "Speed" }],
  evolutionChain: pikachuPokemonEvolutionChain,
  flavorText: "When several Pikachu gather, lightning can strike.",
  flavorTexts: [
    { source: "Red", text: "It has small electric sacs on both its cheeks." },
    {
      source: "Yellow",
      text: "It keeps its tail raised to monitor its surroundings.",
    },
  ],
  form: pikachuForm,
  forms: [pikachuForm],
  genderRatio: { femalePercent: 50, kind: "gendered", malePercent: 50 },
  generation: "Generation I (Kanto)",
  growthRate: "Medium",
  heightMeters: 0.4,
  name: "Pikachu",
  species: "Mouse Pokemon",
  sprite: { kind: "placeholder", label: "Pikachu" },
  stats: [
    { base: 35, name: "HP" },
    { base: 55, name: "Attack" },
    { base: 40, name: "Defense" },
    { base: 50, name: "Sp. Attack" },
    { base: 50, name: "Sp. Defense" },
    { base: 90, name: "Speed" },
  ],
  types: ["Electric"],
  weightKilograms: 6,
};
