import { inflateSync } from "node:zlib";

const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const alphaOpaqueThreshold = 128;

export type SpriteCell = {
  bg?: number;
  char: " " | "▄" | "▀";
  fg?: number;
};

export type RenderedSprite = {
  height: number;
  rows: SpriteCell[][];
  width: number;
};

type DecodedPng = {
  height: number;
  pixels: Uint8Array;
  width: number;
};

type PngChunks = {
  bitDepth: number;
  colorType: number;
  height: number;
  idatChunks: Uint8Array[];
  palette?: Uint8Array;
  transparency?: Uint8Array;
  width: number;
};

type PngChunk = {
  data: Uint8Array;
  endOffset: number;
  type: string;
};

type RgbaReadContext = {
  palette: Uint8Array | undefined;
  scanlineOffset: number;
  source: Uint8Array;
  transparency: Uint8Array | undefined;
};

type PaletteEntry = readonly [red: number, green: number, blue: number];

const xtermPalette = buildXtermPalette();

export async function renderPngSpriteFile(
  filePath: string,
): Promise<RenderedSprite> {
  return renderPngSprite(await Bun.file(filePath).arrayBuffer());
}

export function renderPngSprite(source: ArrayBuffer): RenderedSprite {
  return renderDecodedPng(decodePng(source));
}

function renderDecodedPng(image: DecodedPng): RenderedSprite {
  const bounds = transparentTrimBounds(image);
  if (bounds === undefined) {
    return { height: 0, rows: [], width: 0 };
  }

  const rows: SpriteCell[][] = [];
  for (let y = bounds.top; y <= bounds.bottom; y += 2) {
    const row: SpriteCell[] = [];
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      const top = pixelAt(image, x, y);
      const bottom =
        y + 1 <= bounds.bottom ? pixelAt(image, x, y + 1) : undefined;
      row.push(renderPixelPair(top, bottom));
    }
    rows.push(row);
  }

  return {
    height: rows.length,
    rows,
    width: bounds.right - bounds.left + 1,
  };
}

export function xtermColorIndex(
  red: number,
  green: number,
  blue: number,
): number {
  let bestIndex = 16;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 16; index < xtermPalette.length; index += 1) {
    const [paletteRed, paletteGreen, paletteBlue] = xtermPalette[index] ?? [
      0, 0, 0,
    ];
    const distance =
      (red - paletteRed) ** 2 +
      (green - paletteGreen) ** 2 +
      (blue - paletteBlue) ** 2;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function decodePng(source: ArrayBuffer): DecodedPng {
  const bytes = new Uint8Array(source);
  assertPngSignature(bytes);

  const chunks = parsePngChunks(bytes);
  assertSupportedPng(chunks);

  const channels = channelCount(chunks.colorType);
  const scanlines = unfilterScanlines(
    inflateSync(Buffer.concat(chunks.idatChunks)),
    chunks.width,
    chunks.height,
    channels,
  );

  return {
    height: chunks.height,
    pixels: rgbaPixelsFromScanlines(chunks, scanlines, channels),
    width: chunks.width,
  };
}

function parsePngChunks(bytes: Uint8Array): PngChunks {
  let offset = pngSignature.length;
  const chunks: PngChunks = {
    bitDepth: 0,
    colorType: 0,
    height: 0,
    idatChunks: [],
    width: 0,
  };

  while (offset < bytes.length) {
    const chunk = readPngChunk(bytes, offset);
    applyPngChunk(chunks, chunk);

    if (chunk.type === "IEND") {
      break;
    }

    offset = chunk.endOffset;
  }

  return chunks;
}

function readPngChunk(bytes: Uint8Array, offset: number): PngChunk {
  const length = readUint32(bytes, offset);
  const dataStart = offset + 8;
  const dataEnd = dataStart + length;

  return {
    data: bytes.slice(dataStart, dataEnd),
    endOffset: dataEnd + 4,
    type: readChunkType(bytes, offset + 4),
  };
}

function applyPngChunk(chunks: PngChunks, chunk: PngChunk) {
  const handlers: Record<string, () => void> = {
    IDAT: () => chunks.idatChunks.push(chunk.data),
    IHDR: () => applyHeaderChunk(chunks, chunk.data),
    PLTE: () => {
      chunks.palette = chunk.data;
    },
    tRNS: () => {
      chunks.transparency = chunk.data;
    },
  };

  handlers[chunk.type]?.();
}

function applyHeaderChunk(chunks: PngChunks, data: Uint8Array) {
  chunks.width = readUint32(data, 0);
  chunks.height = readUint32(data, 4);
  chunks.bitDepth = data[8] ?? 0;
  chunks.colorType = data[9] ?? 0;
}

function assertSupportedPng(chunks: PngChunks) {
  if (chunks.width <= 0 || chunks.height <= 0) {
    throw new Error("PNG is missing valid IHDR dimensions");
  }

  if (chunks.bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth: ${chunks.bitDepth}`);
  }
}

function rgbaPixelsFromScanlines(
  chunks: PngChunks,
  scanlines: Uint8Array,
  channels: number,
): Uint8Array {
  const stride = chunks.width * channels;
  const pixels = new Uint8Array(chunks.width * chunks.height * 4);

  for (let y = 0; y < chunks.height; y += 1) {
    for (let x = 0; x < chunks.width; x += 1) {
      pixels.set(
        readRgbaPixel(chunks.colorType, {
          palette: chunks.palette,
          scanlineOffset: y * stride + x * channels,
          source: scanlines,
          transparency: chunks.transparency,
        }),
        (y * chunks.width + x) * 4,
      );
    }
  }

  return pixels;
}

function readRgbaPixel(
  colorType: number,
  context: RgbaReadContext,
): readonly [number, number, number, number] {
  const reader = rgbaPixelReaders[colorType];
  if (reader === undefined) {
    throw new Error(`Unsupported PNG color type: ${colorType}`);
  }

  return reader(context);
}

const rgbaPixelReaders: Record<
  number,
  (context: RgbaReadContext) => readonly [number, number, number, number]
> = {
  0: ({ scanlineOffset, source, transparency }) => {
    const gray = source[scanlineOffset] ?? 0;
    return [gray, gray, gray, alphaForGrayscale(gray, transparency)];
  },
  2: ({ scanlineOffset, source, transparency }) => {
    const red = source[scanlineOffset] ?? 0;
    const green = source[scanlineOffset + 1] ?? 0;
    const blue = source[scanlineOffset + 2] ?? 0;
    return [red, green, blue, alphaForRgb(red, green, blue, transparency)];
  },
  3: ({ palette, scanlineOffset, source, transparency }) => {
    if (palette === undefined) {
      throw new Error("Indexed PNG is missing a palette");
    }

    const paletteIndex = source[scanlineOffset] ?? 0;
    const paletteOffset = paletteIndex * 3;
    return [
      palette[paletteOffset] ?? 0,
      palette[paletteOffset + 1] ?? 0,
      palette[paletteOffset + 2] ?? 0,
      transparency?.[paletteIndex] ?? 255,
    ];
  },
  4: ({ scanlineOffset, source }) => {
    const gray = source[scanlineOffset] ?? 0;
    return [gray, gray, gray, source[scanlineOffset + 1] ?? 255];
  },
  6: ({ scanlineOffset, source }) => [
    source[scanlineOffset] ?? 0,
    source[scanlineOffset + 1] ?? 0,
    source[scanlineOffset + 2] ?? 0,
    source[scanlineOffset + 3] ?? 255,
  ],
};

function unfilterScanlines(
  inflated: Uint8Array,
  width: number,
  height: number,
  channels: number,
): Uint8Array {
  const stride = width * channels;
  const scanlines = new Uint8Array(stride * height);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset] ?? 0;
    unfilterScanlineRow({
      channels,
      filter,
      rowOffset: y * stride,
      scanlines,
      source: inflated,
      sourceOffset: sourceOffset + 1,
      stride,
      y,
    });
    sourceOffset += stride + 1;
  }

  return scanlines;
}

function unfilterScanlineRow({
  channels,
  filter,
  rowOffset,
  scanlines,
  source,
  sourceOffset,
  stride,
  y,
}: {
  channels: number;
  filter: number;
  rowOffset: number;
  scanlines: Uint8Array;
  source: Uint8Array;
  sourceOffset: number;
  stride: number;
  y: number;
}) {
  for (let x = 0; x < stride; x += 1) {
    const context = unfilterContext({
      channels,
      rowOffset,
      scanlines,
      stride,
      x,
      y,
    });
    scanlines[rowOffset + x] = unfilterByte(
      filter,
      source[sourceOffset + x] ?? 0,
      context.left,
      context.up,
      context.upLeft,
    );
  }
}

function unfilterContext({
  channels,
  rowOffset,
  scanlines,
  stride,
  x,
  y,
}: {
  channels: number;
  rowOffset: number;
  scanlines: Uint8Array;
  stride: number;
  x: number;
  y: number;
}) {
  const hasLeft = x >= channels;
  const hasPreviousRow = y > 0;

  return {
    left: hasLeft ? (scanlines[rowOffset + x - channels] ?? 0) : 0,
    up: hasPreviousRow ? (scanlines[rowOffset + x - stride] ?? 0) : 0,
    upLeft:
      hasPreviousRow && hasLeft
        ? (scanlines[rowOffset + x - stride - channels] ?? 0)
        : 0,
  };
}

function unfilterByte(
  filter: number,
  raw: number,
  left: number,
  up: number,
  upLeft: number,
): number {
  if (filter === 0) {
    return raw;
  }

  if (filter === 1) {
    return (raw + left) & 0xff;
  }

  if (filter === 2) {
    return (raw + up) & 0xff;
  }

  if (filter === 3) {
    return (raw + Math.floor((left + up) / 2)) & 0xff;
  }

  if (filter === 4) {
    return (raw + paethPredictor(left, up, upLeft)) & 0xff;
  }

  throw new Error(`Unsupported PNG filter type: ${filter}`);
}

function renderPixelPair(
  top: Uint8Array,
  bottom: Uint8Array | undefined,
): SpriteCell {
  if (!isOpaque(top)) {
    return renderWithoutTopPixel(bottom);
  }

  return renderWithTopPixel(top, bottom);
}

function renderWithoutTopPixel(bottom: Uint8Array | undefined): SpriteCell {
  if (bottom === undefined || !isOpaque(bottom)) {
    return { char: " " };
  }

  return { char: "▄", fg: pixelColorIndex(bottom) };
}

function renderWithTopPixel(
  top: Uint8Array,
  bottom: Uint8Array | undefined,
): SpriteCell {
  const topColor = pixelColorIndex(top);
  if (bottom === undefined || !isOpaque(bottom)) {
    return { char: "▀", fg: topColor };
  }

  return renderOpaquePair(topColor, pixelColorIndex(bottom));
}

function renderOpaquePair(topColor: number, bottomColor: number): SpriteCell {
  if (topColor === bottomColor) {
    return { bg: topColor, char: " " };
  }

  return { bg: topColor, char: "▄", fg: bottomColor };
}

function transparentTrimBounds(image: DecodedPng) {
  let left = image.width;
  let right = -1;
  let top = image.height;
  let bottom = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (!isOpaque(pixelAt(image, x, y))) {
        continue;
      }

      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  return right === -1 ? undefined : { bottom, left, right, top };
}

function pixelAt(image: DecodedPng, x: number, y: number): Uint8Array {
  const offset = (y * image.width + x) * 4;
  return image.pixels.slice(offset, offset + 4);
}

function pixelColorIndex(pixel: Uint8Array): number {
  return xtermColorIndex(pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0);
}

function isOpaque(pixel: Uint8Array): boolean {
  return (pixel[3] ?? 0) >= alphaOpaqueThreshold;
}

function alphaForGrayscale(
  gray: number,
  transparency: Uint8Array | undefined,
): number {
  return transparency !== undefined && transparency[1] === gray ? 0 : 255;
}

function alphaForRgb(
  red: number,
  green: number,
  blue: number,
  transparency: Uint8Array | undefined,
): number {
  if (transparency === undefined) {
    return 255;
  }

  return transparency[1] === red &&
    transparency[3] === green &&
    transparency[5] === blue
    ? 0
    : 255;
}

function channelCount(colorType: number): number {
  const channels: Record<number, number> = {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4,
  };
  const count = channels[colorType];

  if (count === undefined) {
    throw new Error(`Unsupported PNG color type: ${colorType}`);
  }

  return count;
}

function paethPredictor(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
}

function assertPngSignature(bytes: Uint8Array) {
  for (let index = 0; index < pngSignature.length; index += 1) {
    if (bytes[index] !== pngSignature[index]) {
      throw new Error("Invalid PNG signature");
    }
  }
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
}

function readChunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

function buildXtermPalette(): PaletteEntry[] {
  const palette: PaletteEntry[] = [];
  const standardColors: PaletteEntry[] = [
    [0, 0, 0],
    [128, 0, 0],
    [0, 128, 0],
    [128, 128, 0],
    [0, 0, 128],
    [128, 0, 128],
    [0, 128, 128],
    [192, 192, 192],
    [128, 128, 128],
    [255, 0, 0],
    [0, 255, 0],
    [255, 255, 0],
    [0, 0, 255],
    [255, 0, 255],
    [0, 255, 255],
    [255, 255, 255],
  ];
  palette.push(...standardColors);

  const levels = [0, 95, 135, 175, 215, 255];
  for (const red of levels) {
    for (const green of levels) {
      for (const blue of levels) {
        palette.push([red, green, blue]);
      }
    }
  }

  for (let index = 0; index < 24; index += 1) {
    const value = 8 + index * 10;
    palette.push([value, value, value]);
  }

  return palette;
}
