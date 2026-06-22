import { expect, test } from "bun:test";
import { applyAppKey, createInitialAppState } from "../src/app-state";
import { getInitialSearchQuery, searchScreenTitle } from "../src/cli";

test("launches into the Search state without arguments", () => {
  expect(createInitialAppState()).toEqual({
    screen: "search",
    query: "",
    shouldExit: false,
  });
  expect(searchScreenTitle).toBe("Search");
});

test("uses launch arguments as the initial Search query", () => {
  expect(getInitialSearchQuery(["mr", "mime"])).toBe("mr mime");
});

test.each([
  { key: { name: "q" }, label: "q" },
  { key: { name: "escape" }, label: "Escape" },
  { key: { name: "c", ctrl: true }, label: "Ctrl-C" },
])("exits cleanly on $label", ({ key }) => {
  const next = applyAppKey(createInitialAppState(), key);

  expect(next.shouldExit).toBe(true);
});

test("ignores non-exit keys in the Search state", () => {
  const state = createInitialAppState("pika");

  expect(applyAppKey(state, { name: "j" })).toBe(state);
});
