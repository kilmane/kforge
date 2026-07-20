import { isVisualUiProjectEditIntent } from "./visualEditIntent";

describe("visual UI project edit intent", () => {
  test("recognises the recovered Hajj ritual journey iteration", () => {
    expect(
      isVisualUiProjectEditIntent(
        "Make the Ritual journey much more useful during Hajj. Clearly show which stage is selected. Keep the same calm, warm style and make it work well on a phone.",
      ),
    ).toBe(true);
  });

  test("recognises an explicit responsive visual polish request", () => {
    expect(
      isVisualUiProjectEditIntent(
        "Make the booking app look more polished and responsive on a phone.",
      ),
    ).toBe(true);
  });

  test("does not turn a simple logic or control edit into a styling pass", () => {
    expect(
      isVisualUiProjectEditIntent(
        "Add a reset button that clears the existing form.",
      ),
    ).toBe(false);

    expect(
      isVisualUiProjectEditIntent(
        "Fix the calculator total so the arithmetic is correct.",
      ),
    ).toBe(false);
  });

  test("does not mistake selected-state persistence for visual styling", () => {
    expect(
      isVisualUiProjectEditIntent(
        "Keep the selected app item after reloading the page.",
      ),
    ).toBe(false);
  });
});