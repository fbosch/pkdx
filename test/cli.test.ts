import { expect, test } from "bun:test";
import { startupMessage } from "../src/cli";

test("exposes the tooling baseline startup message", () => {
  expect(startupMessage).toBe("Pokedex CLI tooling baseline");
});
