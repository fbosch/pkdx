import { spawn } from "node:child_process";
import type { SpeciesIndexEntry } from "./search";

type SpawnCommand = typeof spawn;

export function pokemonDbPokedexUrl(
  species: Pick<SpeciesIndexEntry, "slug">,
): string {
  return `https://pokemondb.net/pokedex/${species.slug}`;
}

export function pokemonDbAbilityUrl(ability: { name: string }): string {
  return `https://pokemondb.net/ability/${pokemonDbSlug(ability.name)}`;
}

export function pokemonDbEggGroupUrl(eggGroup: { name: string }): string {
  return `https://pokemondb.net/egg-group/${pokemonDbEggGroupSlug(eggGroup.name)}`;
}

export function openPokemonDbPokedexEntry(
  species: Pick<SpeciesIndexEntry, "slug">,
): Promise<void> {
  return openExternalUrl(pokemonDbPokedexUrl(species));
}

export function openPokemonDbAbility(ability: { name: string }): Promise<void> {
  return openExternalUrl(pokemonDbAbilityUrl(ability));
}

export function openPokemonDbEggGroup(eggGroup: {
  name: string;
}): Promise<void> {
  return openExternalUrl(pokemonDbEggGroupUrl(eggGroup));
}

function pokemonDbEggGroupSlug(value: string): string {
  if (value === "No Eggs") {
    return "undiscovered";
  }

  return pokemonDbSlug(value);
}

function pokemonDbSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function openExternalUrl(
  url: string,
  options: {
    platform?: NodeJS.Platform;
    spawnCommand?: SpawnCommand;
  } = {},
): Promise<void> {
  const { args, command } = openerCommand(
    url,
    options.platform ?? process.platform,
  );

  return new Promise((resolve, reject) => {
    const child = (options.spawnCommand ?? spawn)(command, args, {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function openerCommand(
  url: string,
  platform: NodeJS.Platform,
): { args: string[]; command: string } {
  if (platform === "darwin") {
    return { args: [url], command: "open" };
  }

  if (platform === "win32") {
    return { args: ["/c", "start", "", url], command: "cmd" };
  }

  return { args: [url], command: "xdg-open" };
}
