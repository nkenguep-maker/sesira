// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PublicSite } from "@/components/public/public-site";

describe("PublicSite diagnostic dialog", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => container.remove());

  it("gère le focus, Escape et la restauration du déclencheur", async () => {
    const root = createRoot(container);
    await act(async () => root.render(<PublicSite />));
    const trigger = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.includes("Faire mon diagnostic"));
    expect(trigger).toBeDefined();
    trigger?.focus();
    await act(async () => trigger?.click());

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    const close = container.querySelector<HTMLButtonElement>('.dialog-close');
    expect(dialog).not.toBeNull();
    expect(document.activeElement).toBe(close);

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    await act(async () => root.unmount());
  });
});
