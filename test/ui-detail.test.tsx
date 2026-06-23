import { expect, test } from "bun:test";
import { isValidElement } from "react";
import { findExactSpecies } from "../src/search";
import {
  DamageTakenPanel,
  DetailLoadingSkeleton,
  PokemonSpriteArtwork,
  PokemonSpriteFallback,
} from "../src/ui/app";

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

test("renders full-size Detail loading skeleton", () => {
  const pikachu = findExactSpecies("pikachu");

  if (pikachu === undefined) {
    throw new Error("Missing Pikachu species fixture");
  }

  const element = DetailLoadingSkeleton({ species: pikachu });

  expect(element).toBeDefined();
  expect(isValidElement(element)).toBe(true);
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
