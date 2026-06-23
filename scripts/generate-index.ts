import Fuse from "fuse.js";
import { buildSpeciesIndex, speciesFuseOptions } from "./build-species-index";

const index = buildSpeciesIndex();
const fuseIndex = Fuse.createIndex(speciesFuseOptions.keys, index).toJSON();

const output = `${JSON.stringify(index, null, 2)}\n`;
const fuseOutput = `${JSON.stringify(fuseIndex, null, 2)}\n`;

await Bun.write("src/search/species-index.json", output);
await Bun.write("src/search/species-fuse-index.json", fuseOutput);
