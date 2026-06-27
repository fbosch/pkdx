import { deflateSync, inflateSync } from "node:zlib";

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

export type RenderPngSpriteOptions = {
  maxHeight?: number;
  maxWidth?: number;
};

export type PngOpaqueBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type CroppedPngSprite = PngOpaqueBounds & {
  source: ArrayBuffer;
};

type DecodedPng = {
  height: number;
  pixels: Uint8Array;
  width: number;
};

type SpriteBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
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

type PaletteEntry = readonly [red: number, green: number, blue: number];

const xtermPalette = buildXtermPalette();

export async function renderPngSpriteFile(
  filePath: string,
  options: RenderPngSpriteOptions = {},
): Promise<RenderedSprite> {
  return renderPngSprite(await Bun.file(filePath).arrayBuffer(), options);
}

export function renderPngSprite(
  source: ArrayBuffer,
  options: RenderPngSpriteOptions = {},
): RenderedSprite {
  return renderDecodedPng(decodePng(source), options);
}

export function cropPngSpriteToOpaqueBounds(
  source: ArrayBuffer,
): CroppedPngSprite | undefined {
  const image = decodePng(source);
  const bounds = transparentTrimBounds(image);
  if (bounds === undefined) {
    return undefined;
  }

  const width = bounds.right - bounds.left + 1;
  const height = bounds.bottom - bounds.top + 1;
  return {
    height,
    source: encodeRgbaPng(croppedRgbaPixels(image, bounds), width, height),
    width,
    x: bounds.left,
    y: bounds.top,
  };
}

export function fitPngSpriteToTerminalCanvas(
  image: { height: number; width: number },
  options: RenderPngSpriteOptions = {},
): { height: number; width: number } {
  const native = { height: Math.ceil(image.height / 2), width: image.width };
  if (spriteFits(native, options)) {
    return native;
  }

  const dimensions = fittedSpriteDimensions(
    {
      bottom: image.height - 1,
      left: 0,
      right: image.width - 1,
      top: 0,
    },
    options,
  );
  return {
    height: Math.ceil(dimensions.pixelHeight / 2),
    width: dimensions.width,
  };
}

function renderDecodedPng(
  image: DecodedPng,
  options: RenderPngSpriteOptions,
): RenderedSprite {
  const bounds = transparentTrimBounds(image);
  if (bounds === undefined) {
    return { height: 0, rows: [], width: 0 };
  }

  // Keep rows on one aligned grid. Trimming each text row independently shifts
  // centered rows against each other and visually breaks the sprite.
  return renderSpriteRows(
    image,
    bounds,
    fittedSpriteDimensions(bounds, options),
  );
}

function renderSpriteRows(
  image: DecodedPng,
  bounds: SpriteBounds,
  dimensions: { pixelHeight: number; scale: number; width: number },
): RenderedSprite {
  const colorIndexes = new Map<number, number>();
  const rows: SpriteCell[][] = [];
  if (dimensions.scale === 1) {
    return renderNativeSpriteRows(image, bounds, dimensions, colorIndexes);
  }

  for (let y = 0; y < dimensions.pixelHeight; y += 2) {
    const row: SpriteCell[] = [];
    for (let x = 0; x < dimensions.width; x += 1) {
      const top = fittedPixelOffset(image, bounds, dimensions.scale, x, y);
      const bottom =
        y + 1 < dimensions.pixelHeight
          ? fittedPixelOffset(image, bounds, dimensions.scale, x, y + 1)
          : undefined;
      row.push(renderPixelPair(image.pixels, top, bottom, colorIndexes));
    }
    rows.push(row);
  }

  return {
    height: rows.length,
    rows,
    width: dimensions.width,
  };
}

function fittedSpriteDimensions(
  bounds: SpriteBounds,
  options: RenderPngSpriteOptions,
): { pixelHeight: number; scale: number; width: number } {
  const width = bounds.right - bounds.left + 1;
  const pixelHeight = bounds.bottom - bounds.top + 1;
  const height = Math.ceil(pixelHeight / 2);
  if (
    (options.maxWidth === undefined || width <= options.maxWidth) &&
    (options.maxHeight === undefined || height <= options.maxHeight)
  ) {
    return { pixelHeight, scale: 1, width };
  }

  const maxPixelHeight =
    options.maxHeight === undefined ? undefined : options.maxHeight * 2;
  const scale = Math.min(
    options.maxWidth === undefined ? 1 : options.maxWidth / width,
    maxPixelHeight === undefined ? 1 : maxPixelHeight / pixelHeight,
  );

  return {
    pixelHeight: Math.max(1, Math.floor(pixelHeight * scale)),
    scale,
    width: Math.max(1, Math.floor(width * scale)),
  };
}

function spriteFits(
  sprite: Pick<RenderedSprite, "height" | "width">,
  options: RenderPngSpriteOptions,
): boolean {
  return (
    (options.maxWidth === undefined || sprite.width <= options.maxWidth) &&
    (options.maxHeight === undefined || sprite.height <= options.maxHeight)
  );
}

function renderNativeSpriteRows(
  image: DecodedPng,
  bounds: SpriteBounds,
  dimensions: { pixelHeight: number; width: number },
  colorIndexes: Map<number, number>,
): RenderedSprite {
  const rows: SpriteCell[][] = [];
  for (let y = 0; y < dimensions.pixelHeight; y += 2) {
    const row: SpriteCell[] = [];
    const sourceY = bounds.top + y;
    const nextSourceY = sourceY + 1;
    for (let x = 0; x < dimensions.width; x += 1) {
      const sourceX = bounds.left + x;
      const top = pixelOffset(image, sourceX, sourceY);
      const bottom =
        y + 1 < dimensions.pixelHeight
          ? pixelOffset(image, sourceX, nextSourceY)
          : undefined;
      row.push(renderPixelPair(image.pixels, top, bottom, colorIndexes));
    }
    rows.push(row);
  }

  return {
    height: rows.length,
    rows,
    width: dimensions.width,
  };
}

function fittedPixelOffset(
  image: DecodedPng,
  bounds: SpriteBounds,
  scale: number,
  x: number,
  y: number,
): number {
  const sourceX = bounds.left + Math.floor(x / scale);
  const sourceY = bounds.top + Math.floor(y / scale);
  return pixelOffset(image, sourceX, sourceY);
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
    chunks.height,
    scanlineByteWidth(chunks, channels),
    filterByteWidth(chunks, channels),
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
    data: bytes.subarray(dataStart, dataEnd),
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

  if (chunks.bitDepth === 8) {
    return;
  }

  if (chunks.colorType === 3 && [1, 2, 4].includes(chunks.bitDepth)) {
    return;
  }

  if (chunks.colorType === 0 && [1, 2, 4].includes(chunks.bitDepth)) {
    return;
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
  if (chunks.colorType === 6) {
    return scanlines;
  }

  const stride = scanlineByteWidth(chunks, channels);
  const pixels = new Uint8Array(chunks.width * chunks.height * 4);

  if (chunks.colorType === 0) {
    writeGrayscalePixels(chunks, scanlines, pixels, stride);
    return pixels;
  }

  if (chunks.colorType === 2) {
    writeRgbPixels(chunks, scanlines, pixels, stride);
    return pixels;
  }

  if (chunks.colorType === 3) {
    writeIndexedPixels(chunks, scanlines, pixels, stride);
    return pixels;
  }

  if (chunks.colorType === 4) {
    writeGrayscaleAlphaPixels(chunks, scanlines, pixels, stride);
    return pixels;
  }

  throw new Error(`Unsupported PNG color type: ${chunks.colorType}`);
}

function writeGrayscalePixels(
  chunks: PngChunks,
  scanlines: Uint8Array,
  pixels: Uint8Array,
  stride: number,
) {
  for (let y = 0; y < chunks.height; y += 1) {
    for (let x = 0; x < chunks.width; x += 1) {
      const gray = scaleSampleToByte(
        readPackedSample(
          scanlines,
          scanlineOffset(chunks, 1, stride, x, y),
          x,
          chunks.bitDepth,
        ),
        chunks.bitDepth,
      );
      const target = (y * chunks.width + x) * 4;
      pixels[target] = gray;
      pixels[target + 1] = gray;
      pixels[target + 2] = gray;
      pixels[target + 3] = alphaForGrayscale(gray, chunks.transparency);
    }
  }
}

function writeRgbPixels(
  chunks: PngChunks,
  scanlines: Uint8Array,
  pixels: Uint8Array,
  stride: number,
) {
  for (let y = 0; y < chunks.height; y += 1) {
    const rowOffset = y * stride;
    for (let x = 0; x < chunks.width; x += 1) {
      const source = rowOffset + x * 3;
      const red = scanlines[source] ?? 0;
      const green = scanlines[source + 1] ?? 0;
      const blue = scanlines[source + 2] ?? 0;
      const target = (y * chunks.width + x) * 4;
      pixels[target] = red;
      pixels[target + 1] = green;
      pixels[target + 2] = blue;
      pixels[target + 3] = alphaForRgb(red, green, blue, chunks.transparency);
    }
  }
}

function writeIndexedPixels(
  chunks: PngChunks,
  scanlines: Uint8Array,
  pixels: Uint8Array,
  stride: number,
) {
  if (chunks.palette === undefined) {
    throw new Error("Indexed PNG is missing a palette");
  }

  for (let y = 0; y < chunks.height; y += 1) {
    for (let x = 0; x < chunks.width; x += 1) {
      const paletteIndex = readPackedSample(
        scanlines,
        scanlineOffset(chunks, 1, stride, x, y),
        x,
        chunks.bitDepth,
      );
      const paletteOffset = paletteIndex * 3;
      const target = (y * chunks.width + x) * 4;
      pixels[target] = chunks.palette[paletteOffset] ?? 0;
      pixels[target + 1] = chunks.palette[paletteOffset + 1] ?? 0;
      pixels[target + 2] = chunks.palette[paletteOffset + 2] ?? 0;
      pixels[target + 3] = chunks.transparency?.[paletteIndex] ?? 255;
    }
  }
}

function writeGrayscaleAlphaPixels(
  chunks: PngChunks,
  scanlines: Uint8Array,
  pixels: Uint8Array,
  stride: number,
) {
  for (let y = 0; y < chunks.height; y += 1) {
    const rowOffset = y * stride;
    for (let x = 0; x < chunks.width; x += 1) {
      const source = rowOffset + x * 2;
      const gray = scanlines[source] ?? 0;
      const target = (y * chunks.width + x) * 4;
      pixels[target] = gray;
      pixels[target + 1] = gray;
      pixels[target + 2] = gray;
      pixels[target + 3] = scanlines[source + 1] ?? 255;
    }
  }
}

function unfilterScanlines(
  inflated: Uint8Array,
  height: number,
  stride: number,
  bytesPerPixel: number,
): Uint8Array {
  const scanlines = new Uint8Array(stride * height);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset] ?? 0;
    unfilterScanlineRow({
      bytesPerPixel,
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
  bytesPerPixel,
  filter,
  rowOffset,
  scanlines,
  source,
  sourceOffset,
  stride,
  y,
}: {
  bytesPerPixel: number;
  filter: number;
  rowOffset: number;
  scanlines: Uint8Array;
  source: Uint8Array;
  sourceOffset: number;
  stride: number;
  y: number;
}) {
  if (filter === 0) {
    scanlines.set(
      source.subarray(sourceOffset, sourceOffset + stride),
      rowOffset,
    );
    return;
  }

  for (let x = 0; x < stride; x += 1) {
    const context = unfilterContext({
      bytesPerPixel,
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
  bytesPerPixel,
  rowOffset,
  scanlines,
  stride,
  x,
  y,
}: {
  bytesPerPixel: number;
  rowOffset: number;
  scanlines: Uint8Array;
  stride: number;
  x: number;
  y: number;
}) {
  const hasLeft = x >= bytesPerPixel;
  const hasPreviousRow = y > 0;

  return {
    left: hasLeft ? (scanlines[rowOffset + x - bytesPerPixel] ?? 0) : 0,
    up: hasPreviousRow ? (scanlines[rowOffset + x - stride] ?? 0) : 0,
    upLeft:
      hasPreviousRow && hasLeft
        ? (scanlines[rowOffset + x - stride - bytesPerPixel] ?? 0)
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
  pixels: Uint8Array,
  top: number,
  bottom: number | undefined,
  colorIndexes: Map<number, number>,
): SpriteCell {
  if (!isOpaque(pixels, top)) {
    return renderWithoutTopPixel(pixels, bottom, colorIndexes);
  }

  return renderWithTopPixel(pixels, top, bottom, colorIndexes);
}

function renderWithoutTopPixel(
  pixels: Uint8Array,
  bottom: number | undefined,
  colorIndexes: Map<number, number>,
): SpriteCell {
  if (bottom === undefined || !isOpaque(pixels, bottom)) {
    return { char: " " };
  }

  return { char: "▄", fg: pixelColorIndex(pixels, bottom, colorIndexes) };
}

function renderWithTopPixel(
  pixels: Uint8Array,
  top: number,
  bottom: number | undefined,
  colorIndexes: Map<number, number>,
): SpriteCell {
  const topColor = pixelColorIndex(pixels, top, colorIndexes);
  if (bottom === undefined || !isOpaque(pixels, bottom)) {
    return { char: "▀", fg: topColor };
  }

  return renderOpaquePair(
    topColor,
    pixelColorIndex(pixels, bottom, colorIndexes),
  );
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
      if (!isOpaque(image.pixels, pixelOffset(image, x, y))) {
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

function croppedRgbaPixels(
  image: DecodedPng,
  bounds: SpriteBounds,
): Uint8Array {
  const width = bounds.right - bounds.left + 1;
  const height = bounds.bottom - bounds.top + 1;
  const pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const sourceOffset = pixelOffset(image, bounds.left, bounds.top + y);
    const targetOffset = y * width * 4;
    pixels.set(
      image.pixels.subarray(sourceOffset, sourceOffset + width * 4),
      targetOffset,
    );
  }

  return pixels;
}

function encodeRgbaPng(
  pixels: Uint8Array,
  width: number,
  height: number,
): ArrayBuffer {
  const scanlines = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const scanlineOffset = y * (1 + width * 4);
    scanlines[scanlineOffset] = 0;
    scanlines.set(
      pixels.subarray(y * width * 4, (y + 1) * width * 4),
      scanlineOffset + 1,
    );
  }

  const encoded = concatByteArrays([
    pngSignature,
    encodePngChunk("IHDR", pngHeaderData(width, height)),
    encodePngChunk("IDAT", deflateSync(scanlines)),
    encodePngChunk("IEND", new Uint8Array()),
  ]);
  const result = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(result).set(encoded);
  return result;
}

function pngHeaderData(width: number, height: number): Uint8Array {
  const data = Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 8, 6, 0, 0, 0);
  const view = new DataView(data.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  return data;
}

function encodePngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  const typeBytes = pngChunkTypeBytes(type);
  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32PngChunk(typeBytes, data));
  return chunk;
}

function pngChunkTypeBytes(type: string): Uint8Array {
  return Uint8Array.of(
    type.charCodeAt(0),
    type.charCodeAt(1),
    type.charCodeAt(2),
    type.charCodeAt(3),
  );
}

function concatByteArrays(chunks: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function crc32PngChunk(typeBytes: Uint8Array, data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of typeBytes) {
    crc = crc32Byte(crc, byte);
  }
  for (const byte of data) {
    crc = crc32Byte(crc, byte);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function crc32Byte(crc: number, byte: number): number {
  let next = crc ^ byte;
  for (let bit = 0; bit < 8; bit += 1) {
    next = next & 1 ? 0xedb88320 ^ (next >>> 1) : next >>> 1;
  }
  return next;
}

function pixelOffset(image: DecodedPng, x: number, y: number): number {
  return (y * image.width + x) * 4;
}

function pixelColorIndex(
  pixels: Uint8Array,
  offset: number,
  colorIndexes: Map<number, number>,
): number {
  const red = pixels[offset] ?? 0;
  const green = pixels[offset + 1] ?? 0;
  const blue = pixels[offset + 2] ?? 0;
  const key = (red << 16) | (green << 8) | blue;
  const cached = colorIndexes.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const colorIndex = xtermColorIndex(red, green, blue);
  colorIndexes.set(key, colorIndex);
  return colorIndex;
}

function isOpaque(pixels: Uint8Array, offset: number): boolean {
  return (pixels[offset + 3] ?? 0) >= alphaOpaqueThreshold;
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

function scanlineByteWidth(chunks: PngChunks, channels: number): number {
  return Math.ceil((chunks.width * chunks.bitDepth * channels) / 8);
}

function filterByteWidth(chunks: PngChunks, channels: number): number {
  return Math.max(1, Math.ceil((chunks.bitDepth * channels) / 8));
}

function scanlineOffset(
  chunks: PngChunks,
  channels: number,
  stride: number,
  x: number,
  y: number,
): number {
  const rowOffset = y * stride;
  if (chunks.bitDepth === 8) {
    return rowOffset + x * channels;
  }

  return rowOffset + Math.floor((x * chunks.bitDepth * channels) / 8);
}

function readPackedSample(
  source: Uint8Array,
  byteOffset: number,
  x: number,
  bitDepth: number,
): number {
  if (bitDepth === 8) {
    return source[byteOffset] ?? 0;
  }

  const samplesPerByte = 8 / bitDepth;
  const shift = (samplesPerByte - 1 - (x % samplesPerByte)) * bitDepth;
  const mask = (1 << bitDepth) - 1;
  return ((source[byteOffset] ?? 0) >> shift) & mask;
}

function scaleSampleToByte(sample: number, bitDepth: number): number {
  if (bitDepth === 8) {
    return sample;
  }

  return Math.round((sample * 255) / ((1 << bitDepth) - 1));
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
