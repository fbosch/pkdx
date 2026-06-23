import { expect, test } from "bun:test";
import { DamageTakenPanel } from "../src/ui/app";

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
  expect(element.type).toBe("box");
});
