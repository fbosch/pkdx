import { RGBA, TextAttributes } from "@opentui/core";

export const colors = {
  accent: RGBA.fromIndex(1),
  indicatorBlue: RGBA.fromIndex(4),
  indicatorGreen: RGBA.fromIndex(2),
  indicatorRed: RGBA.fromIndex(1),
  indicatorYellow: RGBA.fromIndex(3),
  selected: RGBA.fromIndex(4),
  muted: RGBA.fromIndex(8),
} as const;

export const textStyles = {
  active: TextAttributes.BOLD,
  muted: TextAttributes.DIM,
  normal: TextAttributes.NONE,
  selected: TextAttributes.BOLD,
} as const;
