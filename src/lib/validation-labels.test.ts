import { describe, expect, it } from "vitest";

import * as labels from "./validation-labels";
import {
  PLATFORM_MATURITY_LABELS,
  REAL_WORLD_CALIBRATION_PENDING,
  TECHNICALLY_VALIDATED,
} from "./validation-labels";

describe("validation labels", () => {
  it("exposes the two default posture labels", () => {
    expect(PLATFORM_MATURITY_LABELS).toEqual([
      TECHNICALLY_VALIDATED,
      REAL_WORLD_CALIBRATION_PENDING,
    ]);
  });

  it("MUST NOT export a constant that implies market validation or automatic-mode unlock", () => {
    // Doctrine: no code path emits MARKET_VALIDATED / ROI_PROVEN /
    //   CONVERSION_IMPROVED / AUTOMATIC_MODE_UNLOCKED. Such a claim
    //   requires a human PR that documents real evidence.
    for (const key of Object.keys(labels)) {
      expect(key).not.toMatch(/MARKET_VALIDATED/i);
      expect(key).not.toMatch(/ROI_PROVEN/i);
      expect(key).not.toMatch(/CONVERSION_IMPROVED/i);
      expect(key).not.toMatch(/AUTOMATIC_MODE_UNLOCKED/i);
    }
  });

  it("label values are stable strings usable in JSON payloads", () => {
    expect(TECHNICALLY_VALIDATED).toBe("TECHNICALLY_VALIDATED");
    expect(REAL_WORLD_CALIBRATION_PENDING).toBe("REAL_WORLD_CALIBRATION_PENDING");
  });
});
