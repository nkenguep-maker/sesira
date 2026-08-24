// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

describe("DiagnosticExperience flow", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    container.remove();
  });

  it("shows results before contact details after the complete three-step input", async () => {
    const root = createRoot(container);
    await act(async () => root.render(<DiagnosticExperience />));

    await click(container.querySelector<HTMLInputElement>('input[value="CVC"]'));
    await click(findButton("Continuer"));
    expect(container.textContent).toContain("Quelle est la taille de votre équipe");

    await fill("employees", "12");
    await fill("technicians", "8");
    await click(findButton("Continuer"));
    expect(container.textContent).toContain("Quelques chiffres pour cadrer le potentiel");

    await fill("monthlyRequests", "40");
    await fill("monthlyQuotes", "24");
    await fill("averageQuoteAmount", "18450");
    await fill("approximateMarginPercent", "30");
    await fill("weeklyAdminHours", "20");
    await click(findButton("Voir mes résultats"));

    const text = container.textContent ?? "";
    expect(text).toContain("Trois leviers à examiner en priorité");
    expect(text).toContain("Prudent");
    expect(text).toContain("Probable");
    expect(text).toContain("Potentiel élevé");
    expect(text.indexOf("VOS RÉSULTATS")).toBeLessThan(text.indexOf("ALLER PLUS LOIN"));
    expect(text).toContain("Aucune donnée de ce formulaire n’est envoyée");

    await act(async () => root.unmount());
  });

  function findButton(label: string) {
    return Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.includes(label)) ?? null;
  }

  async function fill(name: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    expect(input).not.toBeNull();
    await act(async () => {
      if (input) {
        input.value = value;
        input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      }
    });
  }
});

async function click(element: HTMLElement | null) {
  expect(element).not.toBeNull();
  await act(async () => element?.click());
}
