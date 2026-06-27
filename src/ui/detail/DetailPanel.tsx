import type { ReactNode } from "react";
import { colors } from "../design-tokens";

export function DetailPanel({
  children,
  height,
  minHeight,
  width,
}: {
  children: ReactNode;
  height?: number;
  minHeight?: number;
  width: number;
}) {
  return (
    <box
      border
      borderColor={colors.panelSecondary}
      borderStyle="rounded"
      style={{
        flexDirection: "column",
        ...(height === undefined ? {} : { height }),
        ...(minHeight === undefined ? {} : { minHeight }),
        paddingX: 1,
        position: "relative",
        width,
      }}
    >
      {children}
    </box>
  );
}
