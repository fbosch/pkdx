const expected = `${JSON.stringify([], null, 2)}\n`;
const actual = await Bun.file("src/search/species-index.json").text();

if (actual !== expected) {
  process.stderr.write(
    "src/search/species-index.json is stale. Run bun run generate:index.\n",
  );
  process.exit(1);
}

export {};
