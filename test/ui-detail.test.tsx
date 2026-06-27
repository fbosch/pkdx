import { expect, test } from "bun:test";
import { createElement } from "react";
import { isValidElement } from "react";
import { QueryDebugPanelView } from "../src/ui/QueryDebugPanel";
import { DamageTakenPanel } from "../src/ui/detail/DamageTakenPanel";
import { DetailErrorModal } from "../src/ui/detail/DetailErrorModal";
import {
  EvolutionViewer,
  buildEvolutionFlowchartLinks,
  buildEvolutionFlowchartLines,
} from "../src/ui/detail/EvolutionViewer";
import { FormSelector } from "../src/ui/detail/FormSelector";
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
