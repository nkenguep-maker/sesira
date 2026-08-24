// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/settings/actions", () => ({
  updateOrganizationSettingsAction: vi.fn(),
}));

import { CompanySettingsForm } from "@/components/settings/company-settings-form";

const organization = {
  name: "Clima Rhône",
  sectorKey: "CVC",
  status: "ACTIVE",
  timezone: "Europe/Paris",
  language: "fr",
  currency: "EUR",
};

describe("CompanySettingsForm", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    container.remove();
  });

  it("enables saving and exposes dirty state after an edit", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<CompanySettingsForm organization={organization} canManage />);
    });

    const input = container.querySelector<HTMLInputElement>("#name");
    const button = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(input).not.toBeNull();
    expect(button?.disabled).toBe(true);

    await act(async () => {
      if (input) {
        input.value = "Clima Rhône Services";
        input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      }
    });

    expect(button?.disabled).toBe(false);
    expect(container.textContent).toContain("Modifications non enregistrées");

    await act(async () => root.unmount());
  });

  it("keeps all editable fields disabled without permission", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<CompanySettingsForm organization={organization} canManage={false} />);
    });

    const fieldset = container.querySelector("fieldset");
    const button = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(fieldset?.disabled).toBe(true);
    expect(button?.disabled).toBe(true);
    expect(container.textContent).toContain("Seuls le propriétaire et les administrateurs");

    await act(async () => root.unmount());
  });
});
