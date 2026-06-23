import Fuse from "fuse.js";
import { buildSpeciesIndex, speciesFuseOptions } from "./build-species-index";

const index = buildSpeciesIndex();
const fuseIndex = Fuse.createIndex(speciesFuseOptions.keys, index).toJSON();

await verifyGeneratedJson("src/search/species-index.json", index);
await verifyGeneratedJson("src/search/species-fuse-index.json", fuseIndex);

async function verifyGeneratedJson(path: string, expectedValue: unknown) {
  const expected = JSON.stringify(expectedValue);
  const actual = JSON.stringify(await Bun.file(path).json());

  if (actual !== expected) {
    process.stderr.write(`${path} is stale. Run bun run generate:index.\n`);
    process.exit(1);
  }
}
