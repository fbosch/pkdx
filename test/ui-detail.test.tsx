import { expect, test } from "bun:test";
import { isValidElement } from "react";
import { DamageTakenPanel } from "../src/ui/detail/DamageTakenPanel";
import { EvolutionViewer } from "../src/ui/detail/EvolutionViewer";
import { FormSelector } from "../src/ui/detail/FormSelector";
import {
  PokemonSpriteArtwork,
  PokemonSpriteFallback,
  PokemonSpriteShinyMarker,
} from "../src/ui/detail/PokemonSpritePanel";

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

test("renders recoverable sprite-specific errors", () => {
  const element = PokemonSpriteFallback({ error: new Error("sprite offline") });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});

test("renders shiny Sprite marker", () => {
  const element = PokemonSpriteShinyMarker();

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
    evolutionChain: {
      root: {
        evolvesTo: [
          {
            evolvesTo: [
              {
                evolvesTo: [],
                method: "use item, Thunder Stone",
                name: "Raichu",
                url: "https://pokeapi.co/api/v2/pokemon-species/26/",
              },
            ],
            method: "level up, happiness 220",
            name: "Pikachu",
            url: "https://pokeapi.co/api/v2/pokemon-species/25/",
          },
        ],
        method: undefined,
        name: "Pichu",
        url: "https://pokeapi.co/api/v2/pokemon-species/172/",
      },
    },
  });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
});
