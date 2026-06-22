const output = `${JSON.stringify([], null, 2)}\n`;

await Bun.write("src/search/species-index.json", output);

export {};
