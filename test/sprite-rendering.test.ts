import { expect, test } from "bun:test";
import { deflateSync } from "node:zlib";
import { renderPngSprite, xtermColorIndex } from "../src/sprite-rendering";

test("quantizes RGB colors to xterm 256-color indexes", () => {
  expect(xtermColorIndex(255, 0, 0)).toBe(196);
  expect(xtermColorIndex(0, 255, 0)).toBe(46);
  expect(xtermColorIndex(0, 0, 255)).toBe(21);
});

test("renders trimmed PNG pixels as terminal half-block cells", () => {
  const transparent = [0, 0, 0, 0] satisfies Rgba;
  const red = [255, 0, 0, 255] satisfies Rgba;
  const blue = [0, 0, 255, 255] satisfies Rgba;
  const green = [0, 255, 0, 255] satisfies Rgba;
  const png = createRgbaPng(4, 5, [
    transparent,
    transparent,
    transparent,
    transparent,
    transparent,
    red,
    red,
    transparent,
    transparent,
    red,
    blue,
    transparent,
    transparent,
    green,
    transparent,
    transparent,
    transparent,
    transparent,
    transparent,
    transparent,
  ]);

  expect(renderPngSprite(png)).toEqual({
    height: 2,
    rows: [
      [
        { bg: 196, char: " " },
        { bg: 196, char: "▄", fg: 21 },
      ],
      [{ char: "▀", fg: 46 }, { char: " " }],
    ],
    width: 2,
  });
});

test("renders fully transparent PNGs as empty sprites", () => {
  const transparent = [0, 0, 0, 0] satisfies Rgba;
  const png = createRgbaPng(2, 2, [
    transparent,
    transparent,
    transparent,
    transparent,
  ]);

  expect(renderPngSprite(png)).toEqual({ height: 0, rows: [], width: 0 });
});

type Rgba = readonly [red: number, green: number, blue: number, alpha: number];

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
      const pixel = pixels[y * width + x] ?? [0, 0, 0, 0];
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
