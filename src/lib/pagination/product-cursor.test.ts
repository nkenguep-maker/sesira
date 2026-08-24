import { describe, expect, it } from "vitest";

import {
  buildDescendingProductCursorFilter,
  decodeProductCursor,
  encodeProductCursor,
} from "./product-cursor";

const cursor = {
  createdAt: "2026-08-24T10:15:30.123+00:00",
  id: "10000000-0000-4000-8000-000000000025",
};

describe("product pagination cursor", () => {
  it("round-trips the complete stable sort position", () => {
    expect(decodeProductCursor(encodeProductCursor(cursor))).toEqual(cursor);
  });

  it("rejects malformed, oversized and incomplete cursors", () => {
    expect(decodeProductCursor("not-base64-json")).toBeNull();
    expect(decodeProductCursor("x".repeat(513))).toBeNull();
    expect(
      decodeProductCursor(
        Buffer.from(JSON.stringify({ createdAt: cursor.createdAt }), "utf8").toString("base64url"),
      ),
    ).toBeNull();
  });

  it("keeps rows sharing a timestamp by using the UUID tie-breaker", () => {
    expect(buildDescendingProductCursorFilter(cursor)).toBe(
      "created_at.lt.2026-08-24T10:15:30.123+00:00,and(created_at.eq.2026-08-24T10:15:30.123+00:00,id.lt.10000000-0000-4000-8000-000000000025)",
    );
  });
});
