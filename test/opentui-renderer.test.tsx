import { createTestRenderer } from "@opentui/core/testing";
import { createRoot } from "@opentui/react";
import { expect, test } from "bun:test";
import { QueryDebugPanelView } from "../src/ui/QueryDebugPanel";
import { App } from "../src/ui/app";

test("OpenTUI renderer draws the Search screen", async () => {
  const { renderer, captureCharFrame, renderOnce, resize } =
    await createTestRenderer({ height: 20, width: 80 });
  const root = createRoot(renderer);

  try {
    root.render(<App initialQuery="pika" onExit={() => {}} />);

    const initialFrame = await renderUntil(
      renderOnce,
      captureCharFrame,
      "#025 Pikachu",
    );
    expect(initialFrame).toContain("pika");

    resize(60, 12);
    expect(
      await renderUntil(renderOnce, captureCharFrame, "#025 Pikachu"),
    ).toContain("#025 Pikachu");
  } finally {
    root.unmount();
    renderer.destroy();
  }
});

test("OpenTUI renderer draws the query debug panel", async () => {
  const { renderer, renderOnce, captureCharFrame } = await createTestRenderer({
    height: 10,
    width: 80,
  });
  const root = createRoot(renderer);

  try {
    root.render(
      <QueryDebugPanelView
        entries={[
          {
            error: "",
            id: "pokemon-detail-25",
            key: "detail pikachu default",
            observers: 1,
            status: "fresh",
            updated: "0s ago",
          },
        ]}
      />,
    );

    const frame = await renderUntil(
      renderOnce,
      captureCharFrame,
      "Query Debug",
    );
    expect(frame).toContain("Query Debug");
    expect(frame).toContain("detail pikachu default");
  } finally {
    root.unmount();
    renderer.destroy();
  }
});

async function renderUntil(
  renderOnce: () => Promise<void>,
  captureCharFrame: () => string,
  expectedText: string,
) {
  let frame = "";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await renderOnce();
    frame = captureCharFrame();
    if (frame.includes(expectedText)) {
      return frame;
    }
  }

  return frame;
}
