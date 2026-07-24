import React, { act } from "react";
import { createRoot } from "react-dom/client";
import PersistentWorkspaceToolbar from "./PersistentWorkspaceToolbar.jsx";

describe("PersistentWorkspaceToolbar", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
    jest.restoreAllMocks();
  });

  test("disables Copy all when there is no readable output", () => {
    act(() => {
      root.render(<PersistentWorkspaceToolbar copyText="   " />);
    });

    const copyButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Copy all",
    );

    expect(copyButton).toBeTruthy();
    expect(copyButton.disabled).toBe(true);
  });

  test("copies redacted output and shows success feedback", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    act(() => {
      root.render(
        <PersistentWorkspaceToolbar copyText="API_KEY=sk-proj-abcdefghijk" />,
      );
    });

    const copyButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Copy all",
    );

    await act(async () => {
      copyButton.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("API_KEY=[REDACTED]");
    expect(copyButton.textContent).toBe("Copied");
  });

  test("shows a small error when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: jest.fn().mockRejectedValue(new Error("Blocked")),
      },
    });

    act(() => {
      root.render(<PersistentWorkspaceToolbar copyText="Readable output" />);
    });

    const copyButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Copy all",
    );

    await act(async () => {
      copyButton.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[role="status"]').textContent).toBe(
      "Copy failed",
    );
  });

  test("uses the supplied existing close handler", () => {
    const onClose = jest.fn();

    act(() => {
      root.render(
        <PersistentWorkspaceToolbar copyText="Output" onClose={onClose} />,
      );
    });

    const closeButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Close",
    );

    act(() => {
      closeButton.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
