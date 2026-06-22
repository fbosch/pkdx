import type { CliRenderer, KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useState } from "react";
import { applyAppKey, createInitialAppState } from "../app-state";

type AppProps = {
  initialQuery?: string;
  renderer: CliRenderer;
};

export function App({ initialQuery = "", renderer }: AppProps) {
  const [state, setState] = useState(() => createInitialAppState(initialQuery));

  useKeyboard((key: KeyEvent) => {
    setState((current) => {
      const next = applyAppKey(current, key);
      if (next.shouldExit) {
        renderer.destroy();
      }
      return next;
    });
  });

  return (
    <box style={{ flexDirection: "column", padding: 1 }}>
      <text>Terminal Pokedex</text>
      <text>Search</text>
      <text>Query: {state.query}</text>
      <text>Press q, Escape, or Ctrl-C to exit.</text>
    </box>
  );
}
