import { expect, test } from "bun:test";
import {
  calculateDamageTaken,
  type DamageTaken,
  pokemonTypes,
} from "../src/type-matchups";

test("calculates single-type Electric damage taken", () => {
  expect(calculateDamageTaken(["Electric"])).toEqual({
    resistances: [
      { multiplier: 0.5, type: "Electric" },
      { multiplier: 0.5, type: "Flying" },
      { multiplier: 0.5, type: "Steel" },
    ],
    weaknesses: [{ multiplier: 2, type: "Ground" }],
  });
});

test("calculates single-type Normal immunity and weakness", () => {
  expect(calculateDamageTaken(["Normal"])).toEqual({
    resistances: [{ multiplier: 0, type: "Ghost" }],
    weaknesses: [{ multiplier: 2, type: "Fighting" }],
  });
});

test("calculates dual-type Water and Flying damage taken", () => {
  expect(calculateDamageTaken(["Water", "Flying"])).toEqual({
    resistances: [
      { multiplier: 0.5, type: "Bug" },
      { multiplier: 0.5, type: "Fighting" },
      { multiplier: 0.5, type: "Fire" },
      { multiplier: 0.5, type: "Steel" },
      { multiplier: 0.5, type: "Water" },
      { multiplier: 0, type: "Ground" },
    ],
    weaknesses: [
      { multiplier: 4, type: "Electric" },
      { multiplier: 2, type: "Rock" },
    ],
  });
});

test("calculates dual-type Fire and Flying neutral cancellations", () => {
  const damageTaken = calculateDamageTaken(["Fire", "Flying"]);

  expect(damageTaken.weaknesses).toEqual([
    { multiplier: 4, type: "Rock" },
    { multiplier: 2, type: "Electric" },
    { multiplier: 2, type: "Water" },
  ]);
  expect(damageTaken.resistances).toEqual([
    { multiplier: 0.5, type: "Fairy" },
    { multiplier: 0.5, type: "Fighting" },
    { multiplier: 0.5, type: "Fire" },
    { multiplier: 0.5, type: "Steel" },
    { multiplier: 0.25, type: "Bug" },
    { multiplier: 0.25, type: "Grass" },
    { multiplier: 0, type: "Ground" },
  ]);
  expect(flatten(damageTaken)).not.toContainEqual(
    expect.objectContaining({ type: "Ice" }),
  );
});

test("normalizes display names case-insensitively", () => {
  expect(calculateDamageTaken(["electric"])).toEqual(
    calculateDamageTaken(["Electric"]),
  );
});

test("returns only non-neutral attacking types", () => {
  const entries = flatten(calculateDamageTaken(["Electric"]));

  expect(entries).toHaveLength(4);
  expect(entries).not.toContainEqual(
    expect.objectContaining({ multiplier: 1 }),
  );
});

test("covers every canonical Pokemon type as an attacking and defensive type", () => {
  expect(pokemonTypes).toHaveLength(18);

  for (const defensiveType of pokemonTypes) {
    const entries = flatten(calculateDamageTaken([defensiveType]));
    const seenTypes = new Set(entries.map((entry) => entry.type));

    expect(entries.every((entry) => pokemonTypes.includes(entry.type))).toBe(
      true,
    );
    expect(seenTypes.size).toBe(entries.length);
  }
});

test("rejects unknown types", () => {
  expect(() => calculateDamageTaken(["Bird"])).toThrow(
    "Unknown Pokemon type: Bird",
  );
});

function flatten(damageTaken: DamageTaken) {
  return [...damageTaken.weaknesses, ...damageTaken.resistances];
}
