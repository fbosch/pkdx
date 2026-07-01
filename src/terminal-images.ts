import { Buffer } from "node:buffer";
import type { TerminalCapabilities } from "@opentui/core";
import {
  cropPngSpriteToOpaqueBounds,
  fitPngSpriteToTerminalCanvas,
} from "./sprite-rendering";

export type TerminalImageSupport = {
  protocol: "kitty";
};

export type TerminalImageOptions = {
  height: number;
  width: number;
};

export type PreparedTerminalImage = TerminalImageOptions & {
  filePath: string;
};

type PreparedTerminalImageMetadata = TerminalImageOptions;

type TerminalEnvironment = Record<string, string | undefined>;
type TerminalImageCapabilities = Pick<
  TerminalCapabilities,
  "kitty_graphics" | "multiplexer" | "remote"
>;

const kittyTerminalImageSupport: TerminalImageSupport = { protocol: "kitty" };
const maxPreparedTerminalImageCacheEntries = 128;
const preparedImagePromises = new Map<string, Promise<PreparedTerminalImage>>();
const preparedImages = new Map<string, PreparedTerminalImage>();

export function detectTerminalImageSupport(
  env: TerminalEnvironment = Bun.env,
  capabilities?: TerminalImageCapabilities | null,
): TerminalImageSupport | undefined {
  if (capabilities !== undefined && capabilities !== null) {
    return capabilities.kitty_graphics &&
      capabilities.remote === false &&
      capabilities.multiplexer === "none"
      ? kittyTerminalImageSupport
      : undefined;
  }

  if (env.SSH_CONNECTION !== undefined || env.SSH_TTY !== undefined) {
    return undefined;
  }

  if (env.KITTY_WINDOW_ID !== undefined || env.TERM?.includes("kitty")) {
    return kittyTerminalImageSupport;
  }

  if (env.TERM_PROGRAM === "WezTerm" || env.WEZTERM_EXECUTABLE !== undefined) {
    return kittyTerminalImageSupport;
  }

  return undefined;
}

export function terminalImageEscapeSequence(
  filePath: string,
  support: TerminalImageSupport,
  options: TerminalImageOptions & { imageId: number; placementId: number },
): string {
  switch (support.protocol) {
    case "kitty": {
      const payload = Buffer.from(filePath).toString("base64");
      return `\u001b_Ga=T,t=f,f=100,C=1,q=2,i=${options.imageId.toString()},p=${options.placementId.toString()},c=${options.width.toString()},r=${options.height.toString()};${payload}\u001b\\`;
    }
  }
}

export async function prepareTerminalSpriteImage(
  filePath: string,
  canvas: TerminalImageOptions,
): Promise<PreparedTerminalImage> {
  const cacheKey = terminalImageCacheKey(filePath, canvas);
  const cached = preparedImagePromises.get(cacheKey);
  if (Bun.env.NODE_ENV !== "development" && cached !== undefined) {
    refreshCacheEntry(preparedImagePromises, cacheKey, cached);
    return cached;
  }

  const promise = prepareTerminalSpriteImageUncached(filePath, canvas)
    .then((image) => {
      preparedImages.set(cacheKey, image);
      evictOldestEntries(preparedImages, maxPreparedTerminalImageCacheEntries);
      return image;
    })
    .catch((error: unknown) => {
      preparedImagePromises.delete(cacheKey);
      preparedImages.delete(cacheKey);
      throw error;
    });
  preparedImagePromises.set(cacheKey, promise);
  evictOldestEntries(
    preparedImagePromises,
    maxPreparedTerminalImageCacheEntries,
  );
  return promise;
}

export function getPreparedTerminalSpriteImage(
  filePath: string,
  canvas: TerminalImageOptions,
): PreparedTerminalImage | undefined {
  if (Bun.env.NODE_ENV === "development") {
    return undefined;
  }

  const cacheKey = terminalImageCacheKey(filePath, canvas);
  const cached = preparedImages.get(cacheKey);
  if (cached !== undefined) {
    refreshCacheEntry(preparedImages, cacheKey, cached);
  }

  return cached;
}

function refreshCacheEntry<T>(cache: Map<string, T>, key: string, value: T) {
  cache.delete(key);
  cache.set(key, value);
}

function evictOldestEntries<T>(cache: Map<string, T>, maxEntries: number) {
  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) {
      return;
    }

    cache.delete(oldestKey);
  }
}

function terminalImageCacheKey(
  filePath: string,
  canvas: TerminalImageOptions,
): string {
  return `${filePath}:${canvas.width.toString()}x${canvas.height.toString()}`;
}

async function prepareTerminalSpriteImageUncached(
  filePath: string,
  canvas: TerminalImageOptions,
): Promise<PreparedTerminalImage> {
  const croppedFilePath = `${filePath}.opaque.png`;
  const metadataFilePath = `${croppedFilePath}.json`;
  const cachedMetadata =
    await readPreparedTerminalImageMetadata(metadataFilePath);
  if (
    Bun.env.NODE_ENV !== "development" &&
    cachedMetadata !== undefined &&
    (await Bun.file(croppedFilePath).exists())
  ) {
    return {
      ...fitPngSpriteToTerminalCanvas(cachedMetadata, {
        maxHeight: canvas.height,
        maxWidth: canvas.width,
      }),
      filePath: croppedFilePath,
    };
  }

  const source = await Bun.file(filePath).arrayBuffer();
  const cropped = cropPngSpriteToOpaqueBounds(source);
  if (cropped === undefined) {
    return { ...canvas, filePath };
  }

  await Bun.write(croppedFilePath, cropped.source);
  await Bun.write(
    metadataFilePath,
    JSON.stringify({ height: cropped.height, width: cropped.width }),
  );

  return {
    ...fitPngSpriteToTerminalCanvas(cropped, {
      maxHeight: canvas.height,
      maxWidth: canvas.width,
    }),
    filePath: croppedFilePath,
  };
}

async function readPreparedTerminalImageMetadata(
  filePath: string,
): Promise<PreparedTerminalImageMetadata | undefined> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return undefined;
  }

  const metadata = await file.json().catch(() => undefined);
  if (isPreparedTerminalImageMetadata(metadata)) {
    return metadata;
  }

  return undefined;
}

function isPreparedTerminalImageMetadata(
  value: unknown,
): value is PreparedTerminalImageMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    hasPositiveFiniteNumber(value, "height") &&
    hasPositiveFiniteNumber(value, "width")
  );
}

function hasPositiveFiniteNumber(
  value: object,
  key: "height" | "width",
): boolean {
  const field = Object.getOwnPropertyDescriptor(value, key)?.value;
  return typeof field === "number" && Number.isFinite(field) && field > 0;
}

export function terminalImagePlacementSequence({
  column,
  filePath,
  imageId,
  placementId,
  row,
  support,
  ...options
}: TerminalImageOptions & {
  column: number;
  filePath: string;
  imageId: number;
  placementId: number;
  row: number;
  support: TerminalImageSupport;
}): string {
  return `\u001b[${row.toString()};${column.toString()}H${terminalImageEscapeSequence(filePath, support, { ...options, imageId, placementId })}`;
}

export function deleteTerminalImageSequence(
  support: TerminalImageSupport,
  imageId: number,
  placementId: number,
): string {
  switch (support.protocol) {
    case "kitty": {
      return `\u001b_Ga=d,d=i,q=2,i=${imageId.toString()},p=${placementId.toString()}\u001b\\`;
    }
  }
}
