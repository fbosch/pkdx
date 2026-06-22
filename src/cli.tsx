import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./ui/app";

export const searchScreenTitle = "Search";

export function getInitialSearchQuery(args: readonly string[]): string {
  return args.join(" ").trim();
}

export async function main(args = Bun.argv.slice(2)): Promise<void> {
  const initialQuery = getInitialSearchQuery(args);

  if (process.env.POKEDEX_SMOKE_EXIT === "1") {
    process.stdout.write(`${searchScreenTitle}\n`);
    return;
  }

  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
  });

  createRoot(renderer).render(
    <App initialQuery={initialQuery} renderer={renderer} />,
  );
}

if (import.meta.main) {
  await main();
}
