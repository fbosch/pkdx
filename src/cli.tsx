import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { findExactSpecies } from "./search";
import { Root } from "./ui/root";

export const searchScreenTitle = "Search";

export function getInitialSearchQuery(args: readonly string[]): string {
  return args.join(" ").trim();
}

export async function main(args = Bun.argv.slice(2)): Promise<void> {
  const initialQuery = getInitialSearchQuery(args);

  if (process.env.PKDX_SMOKE_EXIT === "1") {
    process.stdout.write(
      `${findExactSpecies(initialQuery) === undefined ? searchScreenTitle : "Detail"}\n`,
    );
    return;
  }

  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
  });
  const root = createRoot(renderer);
  let hasExited = false;

  root.render(
    <Root
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
