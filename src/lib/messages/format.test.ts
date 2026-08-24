import { describe, expect, it } from "vitest";

import { messageChannelLabel } from "@/lib/messages/format";

describe("messageChannelLabel", () => {
  it("keeps message channels simple and French", () => {
    expect(messageChannelLabel("EMAIL")).toBe("Email");
    expect(messageChannelLabel("PHONE")).toBe("Téléphone");
    expect(messageChannelLabel("unknown-provider")).toBe("Autre canal");
  });
});
