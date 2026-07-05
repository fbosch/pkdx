import { createCliRenderer, type CliRendererConfig } from "@opentui/core";
import { createRoot } from "@opentui/react";
import packageJson from "../package.json";
import { findExactSpecies } from "./search";
import { Root } from "./ui/root";

export const searchScreenTitle = "Search";
export const appVersion = packageJson.version;

export type CliImageMode = "ascii" | "builtin";

export type CliOptions = {
  debug: boolean;
  imageMode: CliImageMode;
  initialQuery: string;
  showVersion: boolean;
};

export const appExitSignals = [
  "SIGTERM",
  "SIGQUIT",
  "SIGABRT",
  "SIGHUP",
  "SIGBREAK",
  "SIGPIPE",
  "SIGBUS",
] satisfies NonNullable<CliRendererConfig["exitSignals"]>;

export function getInitialSearchQuery(args: readonly string[]): string {
  return parseCliOptions(args).initialQuery;
}

export function parseCliOptions(args: readonly string[]): CliOptions {
  const queryArgs: string[] = [];
  let debug = false;
  let imageMode: CliImageMode = "builtin";
  let showVersion = false;

  for (const arg of args) {
    if (arg === "--version") {
      showVersion = true;
      continue;
    }

    if (arg === "--debug") {
      debug = true;
      continue;
    }

    if (arg === "--images=ascii") {
      imageMode = "ascii";
      continue;
    }

    if (arg === "--images=builtin") {
      imageMode = "builtin";
      continue;
    }

    queryArgs.push(arg);
  }

  return {
    debug,
    imageMode,
    initialQuery: queryArgs.join(" ").trim(),
    showVersion,
  };
}

export async function main(args = Bun.argv.slice(2)): Promise<void> {
  const { debug, imageMode, initialQuery, showVersion } = parseCliOptions(args);

  if (showVersion) {
    process.stdout.write(`pkdx ${appVersion}\n`);
    return;
  }

  if (process.env.PKDX_SMOKE_EXIT === "1") {
    process.stdout.write(
      `${findExactSpecies(initialQuery) === undefined ? searchScreenTitle : "Detail"}\n`,
    );
    return;
  }

  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    exitSignals: appExitSignals,
    openConsoleOnError: debug,
  });
  if (debug) {
    renderer.toggleDebugOverlay();
  }

  const root = createRoot(renderer);
  let hasExited = false;

  root.render(
    <Root
      debug={debug}
      imageMode={imageMode}
      initialQuery={initialQuery}
      onExit={() => {
        if (hasExited) {
          return;
        }

        hasExited = true;
        root.unmount();
        renderer.destroy();
        setTimeout(() => process.exit(0), 0);
      }}
    />,
  );
}

if (import.meta.main) {
  await main();
}
