export const startupMessage = "Pokedex CLI tooling baseline";

export function main(): void {
  process.stdout.write(`${startupMessage}\n`);
}

if (import.meta.main) {
  main();
}
