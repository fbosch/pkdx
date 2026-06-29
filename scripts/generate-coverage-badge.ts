import { mkdir } from "node:fs/promises";

const coverageColors = [
  { minimum: 90, color: "#4c1" },
  { minimum: 80, color: "#97ca00" },
  { minimum: 70, color: "#a4a61d" },
  { minimum: 60, color: "#dfb317" },
  { minimum: 50, color: "#fe7d37" },
  { minimum: 0, color: "#e05d44" },
];

const proc = Bun.spawn(["bun", "--config=bunfig.coverage.toml", "test"], {
  stderr: "pipe",
  stdout: "pipe",
});

const [stdout, stderr, exitCode] = await Promise.all([
  new Response(proc.stdout).text(),
  new Response(proc.stderr).text(),
  proc.exited,
]);

process.stdout.write(stdout);
process.stderr.write(stderr);

if (exitCode !== 0) {
  process.exit(exitCode);
}

const lineCoverageText = readAggregateLineCoverage(`${stdout}\n${stderr}`);

if (!lineCoverageText) {
  process.stderr.write(
    "Could not read aggregate line coverage from Bun output.\n",
  );
  process.exit(1);
}

const lineCoverage = Number(lineCoverageText);

if (!Number.isFinite(lineCoverage)) {
  process.stderr.write(
    `Invalid aggregate line coverage: ${lineCoverageText}\n`,
  );
  process.exit(1);
}

const badge = renderBadge(
  "coverage",
  `${lineCoverage.toFixed(2)}%`,
  coverageColor(lineCoverage),
);

await mkdir("docs", { recursive: true });
await Bun.write("docs/coverage.svg", badge);
process.stdout.write(
  `Wrote docs/coverage.svg (${lineCoverage.toFixed(2)}% line coverage).\n`,
);

function coverageColor(coverage: number) {
  return (
    coverageColors.find(({ minimum }) => coverage >= minimum)?.color ??
    "#e05d44"
  );
}

function readAggregateLineCoverage(output: string): string | undefined {
  const allFilesLine = stripAnsi(output)
    .split("\n")
    .find((line) => line.trimStart().startsWith("All files"));

  return allFilesLine?.split("|")[2]?.trim();
}

function stripAnsi(value: string): string {
  return value.replaceAll(
    new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g"),
    "",
  );
}

function renderBadge(label: string, value: string, valueColor: string) {
  const labelWidth = textWidth(label);
  const valueWidth = textWidth(value);
  const width = labelWidth + valueWidth;
  const labelCenter = labelWidth / 2;
  const valueCenter = labelWidth + valueWidth / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escapeXml(
    label,
  )}: ${escapeXml(value)}">
  <title>${escapeXml(label)}: ${escapeXml(value)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${valueColor}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelCenter}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelCenter}" y="14">${escapeXml(label)}</text>
    <text x="${valueCenter}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${valueCenter}" y="14">${escapeXml(value)}</text>
  </g>
</svg>
`;
}

function textWidth(text: string) {
  return text.length * 7 + 10;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
