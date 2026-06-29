import { deflateSync } from "node:zlib";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { renderPngSprite, xtermColorIndex } from "../../src/sprite-rendering";
import { prepareTerminalSpriteImage } from "../../src/terminal-images";
import { benchmarkResult } from "../support/benchmark";

const iterations = Number(Bun.env.PKDX_SPRITE_BENCH_ITERATIONS ?? 500);
const coldIterations = Number(
  Bun.env.PKDX_SPRITE_BENCH_COLD_ITERATIONS ?? Math.min(iterations, 100),
);
const realSpriteAssetDirectory =
  Bun.env.PKDX_SPRITE_BENCH_ASSET_DIR ??
  join(Bun.env.HOME ?? ".", ".cache", "pkdx", "pokesprite-assets");
const terminalImageCanvas = { height: 20, width: 40 };
const transparent = [0, 0, 0, 0] satisfies Rgba;
const red = [255, 0, 0, 255] satisfies Rgba;
const blue = [0, 0, 255, 255] satisfies Rgba;
const green = [0, 255, 0, 255] satisfies Rgba;
const yellow = [255, 255, 0, 255] satisfies Rgba;

const smallSprite = createPatternPng(16, 16);
const mediumSprite = createPatternPng(64, 64);
const paddedMediumSprite = createPaddedPatternPng(80, 72, {
  bottom: 8,
  left: 6,
  right: 6,
  top: 8,
});

const benchmarks = [
  {
    name: "xterm-color-index",
    run: () => xtermColorIndex(128, 64, 192),
  },
  {
    name: "ascii-render-small-16x16",
    run: () => renderPngSprite(smallSprite).rows.length,
  },
  {
    name: "ascii-render-medium-64x64",
    run: () => renderPngSprite(mediumSprite).rows.length,
  },
] as const;

for (const benchmark of benchmarks) {
  for (let index = 0; index < 100; index += 1) {
    benchmark.run();
  }
}

const results = benchmarks.map((benchmark) => {
  let checksum = 0;
  const start = Bun.nanoseconds();

  for (let index = 0; index < iterations; index += 1) {
    checksum += benchmark.run();
  }

  return benchmarkResult(benchmark.name, iterations, start, checksum);
});

const temporaryDirectory = await mkdtemp(join(tmpdir(), "pkdx-sprite-bench-"));
try {
  const realSprites = await loadRealSpriteBenchAssets(realSpriteAssetDirectory);
  const eventLoopDelayResults = await benchmarkSpritePreparationEventLoopDelay(
    temporaryDirectory,
    realSprites,
  );
  const rapidNavigationResults = await benchmarkRapidNavigationSpritePrewarm(
    temporaryDirectory,
    realSprites,
  );
  results.push(
    await benchmarkColdTerminalImagePreparation(temporaryDirectory),
    await benchmarkWarmTerminalImagePreparation(temporaryDirectory),
    ...(await benchmarkRealSprites(temporaryDirectory, realSprites)),
  );
  console.table(results);
  if (eventLoopDelayResults.length > 0) {
    console.table(eventLoopDelayResults);
  }
  console.table(rapidNavigationResults);
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}

async function benchmarkColdTerminalImagePreparation(directory: string) {
  const filePaths = await Promise.all(
    Array.from({ length: coldIterations }, async (_, index) => {
      const filePath = join(directory, `cold-${index.toString()}.png`);
      await Bun.write(filePath, paddedMediumSprite);
      return filePath;
    }),
  );

  let checksum = 0;
  const start = Bun.nanoseconds();
  for (const filePath of filePaths) {
    checksum += await prepareTerminalImageChecksum(filePath);
  }

  return benchmarkResult(
    "builtin-image-prepare-cold-80x72",
    coldIterations,
    start,
    checksum,
  );
}

async function benchmarkWarmTerminalImagePreparation(directory: string) {
  const filePath = join(directory, "warm.png");
  await Bun.write(filePath, paddedMediumSprite);
  await prepareTerminalImageChecksum(filePath);

  let checksum = 0;
  const start = Bun.nanoseconds();
  for (let index = 0; index < iterations; index += 1) {
    checksum += await prepareTerminalImageChecksum(filePath);
  }

  return benchmarkResult(
    "builtin-image-prepare-warm-80x72",
    iterations,
    start,
    checksum,
  );
}

async function benchmarkRealSprites(
  directory: string,
  sprites: readonly RealSpriteBenchAsset[],
) {
  const results = [];

  for (const sprite of sprites) {
    const buffer = await Bun.file(sprite.filePath).arrayBuffer();
    const asciiBenchmark = {
      name: `real-ascii-render-${sprite.kind}`,
      run: () => renderPngSprite(buffer).rows.length,
    };

    for (let index = 0; index < 100; index += 1) {
      asciiBenchmark.run();
    }

    let checksum = 0;
    let start = Bun.nanoseconds();
    for (let index = 0; index < iterations; index += 1) {
      checksum += asciiBenchmark.run();
    }
    results.push(
      benchmarkResult(asciiBenchmark.name, iterations, start, checksum),
    );

    checksum = 0;
    start = Bun.nanoseconds();
    for (let index = 0; index < coldIterations; index += 1) {
      const filePath = join(
        directory,
        `real-cold-${sprite.kind}-${index.toString()}.png`,
      );
      await Bun.write(filePath, buffer);
      checksum += await prepareTerminalImageChecksum(filePath);
    }
    results.push(
      benchmarkResult(
        `real-image-prepare-cold-${sprite.kind}`,
        coldIterations,
        start,
        checksum,
      ),
    );

    const warmFilePath = join(directory, `real-warm-${sprite.kind}.png`);
    await Bun.write(warmFilePath, buffer);
    await prepareTerminalImageChecksum(warmFilePath);

    checksum = 0;
    start = Bun.nanoseconds();
    for (let index = 0; index < iterations; index += 1) {
      checksum += await prepareTerminalImageChecksum(warmFilePath);
    }
    results.push(
      benchmarkResult(
        `real-image-prepare-warm-${sprite.kind}`,
        iterations,
        start,
        checksum,
      ),
    );
  }

  return results;
}

async function benchmarkSpritePreparationEventLoopDelay(
  directory: string,
  sprites: readonly RealSpriteBenchAsset[],
) {
  return await Promise.all([
    measurePreparationEventLoopDelay(
      "event-loop-delay-cold-synthetic-80x72",
      directory,
      paddedMediumSprite,
    ),
    ...sprites.map(async (sprite) =>
      measurePreparationEventLoopDelay(
        `event-loop-delay-cold-${sprite.kind}`,
        directory,
        await Bun.file(sprite.filePath).arrayBuffer(),
      ),
    ),
  ]);
}

async function benchmarkRapidNavigationSpritePrewarm(
  directory: string,
  sprites: readonly RealSpriteBenchAsset[],
) {
  const [previousSprite, nextSprite] = await loadAdjacentSpriteSources(sprites);
  return [
    await measureRapidNavigationSpritePrewarm(
      "rapid-nav-old-eager-adjacent-sprite-prewarm",
      directory,
      [previousSprite, nextSprite],
      true,
    ),
    await measureRapidNavigationSpritePrewarm(
      "rapid-nav-new-loading-gated-adjacent-sprite-prewarm",
      directory,
      [previousSprite, nextSprite],
      false,
    ),
  ];
}

async function loadAdjacentSpriteSources(
  sprites: readonly RealSpriteBenchAsset[],
): Promise<readonly [ArrayBuffer, ArrayBuffer]> {
  const buffers = await Promise.all(
    sprites
      .slice(0, 2)
      .map((sprite) => Bun.file(sprite.filePath).arrayBuffer()),
  );
  return [
    buffers[0] ?? paddedMediumSprite,
    buffers[1] ?? buffers[0] ?? paddedMediumSprite,
  ];
}

async function measureRapidNavigationSpritePrewarm(
  name: string,
  directory: string,
  sources: readonly [ArrayBuffer, ArrayBuffer],
  prewarmAdjacentSprites: boolean,
) {
  const probe = startEventLoopDelayProbe();
  let checksum = 0;
  const start = Bun.nanoseconds();

  for (let index = 0; index < coldIterations; index += 1) {
    if (prewarmAdjacentSprites === false) {
      continue;
    }

    const previousPath = join(
      directory,
      `${name}-previous-${index.toString()}.png`,
    );
    const nextPath = join(directory, `${name}-next-${index.toString()}.png`);
    await Bun.write(previousPath, sources[0]);
    await Bun.write(nextPath, sources[1]);
    checksum += await prepareTerminalImageChecksum(previousPath);
    checksum += await prepareTerminalImageChecksum(nextPath);
  }

  const durationMs = Number(
    ((Bun.nanoseconds() - start) / 1_000_000).toFixed(2),
  );
  const delay = await probe.stop();

  return {
    averageDelayMs: delay.averageDelayMs,
    checksum,
    durationMs,
    iterations: coldIterations,
    maxDelayMs: delay.maxDelayMs,
    name,
    perNavigationMs: Number((durationMs / coldIterations).toFixed(2)),
    prewarmCount: prewarmAdjacentSprites ? coldIterations * 2 : 0,
    samples: delay.samples,
  };
}

async function measurePreparationEventLoopDelay(
  name: string,
  directory: string,
  source: ArrayBuffer,
) {
  const filePaths = await Promise.all(
    Array.from({ length: coldIterations }, async (_, index) => {
      const filePath = join(directory, `${name}-${index.toString()}.png`);
      await Bun.write(filePath, source);
      return filePath;
    }),
  );

  const probe = startEventLoopDelayProbe();
  let checksum = 0;
  const start = Bun.nanoseconds();
  for (const filePath of filePaths) {
    checksum += await prepareTerminalImageChecksum(filePath);
  }
  const durationMs = Number(
    ((Bun.nanoseconds() - start) / 1_000_000).toFixed(2),
  );
  const delay = await probe.stop();

  return {
    averageDelayMs: delay.averageDelayMs,
    checksum,
    durationMs,
    iterations: coldIterations,
    maxDelayMs: delay.maxDelayMs,
    name,
    samples: delay.samples,
  };
}

function startEventLoopDelayProbe(intervalMs = 1) {
  let active = true;
  let expected = performance.now() + intervalMs;
  let maxDelayMs = 0;
  let sampleCount = 0;
  let totalDelayMs = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const tick = () => {
    if (active === false) {
      return;
    }

    const now = performance.now();
    const delayMs = Math.max(0, now - expected);
    maxDelayMs = Math.max(maxDelayMs, delayMs);
    totalDelayMs += delayMs;
    sampleCount += 1;
    expected = now + intervalMs;
    timeout = setTimeout(tick, intervalMs);
  };

  timeout = setTimeout(tick, intervalMs);

  return {
    async stop() {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      active = false;
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }

      return {
        averageDelayMs: Number(
          (sampleCount === 0 ? 0 : totalDelayMs / sampleCount).toFixed(2),
        ),
        maxDelayMs: Number(maxDelayMs.toFixed(2)),
        samples: sampleCount,
      };
    },
  };
}

async function prepareTerminalImageChecksum(filePath: string): Promise<number> {
  const image = await prepareTerminalSpriteImage(filePath, terminalImageCanvas);
  return image.filePath.length + image.height + image.width;
}

type Rgba = readonly [red: number, green: number, blue: number, alpha: number];

type RealSpriteBenchAsset = {
  filePath: string;
  kind: "gen8" | "modern";
};

async function loadRealSpriteBenchAssets(
  directory: string,
): Promise<RealSpriteBenchAsset[]> {
  const filePaths = (await listPngFiles(directory).catch(() => [])).toSorted();

  return [
    selectRealSpriteAsset(filePaths, "gen8"),
    selectRealSpriteAsset(filePaths, "modern"),
  ].filter((asset) => asset !== undefined);
}

function selectRealSpriteAsset(
  filePaths: readonly string[],
  kind: RealSpriteBenchAsset["kind"],
): RealSpriteBenchAsset | undefined {
  const sourceMarker =
    kind === "gen8"
      ? "raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8"
      : "raw.githubusercontent.com/fbosch/pokemon-sprites/main/pokemon";
  const filePath = filePaths.find((candidate) => {
    const decoded = decodeURIComponent(basename(candidate));
    return decoded.includes(sourceMarker) && decoded.endsWith(".png");
  });

  return filePath === undefined ? undefined : { filePath, kind };
}

async function listPngFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const filePaths: string[] = [];

  for (const entry of entries) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      filePaths.push(...(await listPngFiles(filePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".png")) {
      filePaths.push(filePath);
    }
  }

  return filePaths.filter(
    (filePath) => filePath.endsWith(".opaque.png") === false,
  );
}

function createPatternPng(width: number, height: number): ArrayBuffer {
  const palette = [red, blue, green, yellow] as const;
  const pixels = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    return palette[(x + y) % palette.length] ?? transparent;
  });

  return createRgbaPng(width, height, pixels);
}

function createPaddedPatternPng(
  width: number,
  height: number,
  padding: { bottom: number; left: number; right: number; top: number },
): ArrayBuffer {
  const palette = [red, blue, green, yellow] as const;
  const pixels: Rgba[] = Array.from(
    { length: width * height },
    () => transparent,
  );
  const bottom = height - padding.bottom;
  const right = width - padding.right;

  for (let y = padding.top; y < bottom; y += 1) {
    for (let x = padding.left; x < right; x += 1) {
      pixels[y * width + x] = palette[(x + y) % palette.length] ?? red;
    }
  }

  return createRgbaPng(width, height, pixels);
}

function createRgbaPng(
  width: number,
  height: number,
  pixels: readonly Rgba[],
): ArrayBuffer {
  const scanlines = new Uint8Array(height * (1 + width * 4));

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (1 + width * 4);
    scanlines[rowOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const pixel = pixels[y * width + x] ?? transparent;
      scanlines.set(pixel, rowOffset + 1 + x * 4);
    }
  }

  const png = concatChunks([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdrData(width, height)),
    pngChunk("IDAT", deflateSync(scanlines)),
    pngChunk("IEND", new Uint8Array()),
  ]);

  const result = new ArrayBuffer(png.byteLength);
  new Uint8Array(result).set(png);
  return result;
}

function ihdrData(width: number, height: number): Uint8Array {
  const data = new Uint8Array(13);
  const view = new DataView(data.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(
    [...type].map((character) => character.charCodeAt(0)),
    4,
  );
  chunk.set(data, 8);
  return chunk;
}

function concatChunks(chunks: readonly Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}
