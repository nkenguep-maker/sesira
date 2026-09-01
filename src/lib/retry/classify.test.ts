import { describe, expect, it } from "vitest";

import {
  PermanentError,
  TransientError,
  classifyFailure,
  extractErrorClass,
  extractErrorMessage,
} from "./classify";

describe("classifyFailure", () => {
  it("classifies PermanentError as PERMANENT", () => {
    expect(classifyFailure(new PermanentError("bad_input", "boom"))).toBe("PERMANENT");
  });

  it("classifies TransientError as TRANSIENT", () => {
    expect(classifyFailure(new TransientError("timeout", "boom"))).toBe("TRANSIENT");
  });

  it.each([400, 401, 403, 404, 405, 409, 410, 413, 415, 422, 451])(
    "classifies HTTP %i as PERMANENT",
    (status) => {
      expect(classifyFailure({ status })).toBe("PERMANENT");
    },
  );

  it.each([408, 429, 500, 502, 503, 504])(
    "classifies HTTP %i as TRANSIENT (default)",
    (status) => {
      expect(classifyFailure({ status })).toBe("TRANSIENT");
    },
  );

  it("reads nested response.status", () => {
    expect(classifyFailure({ response: { status: 401 } })).toBe("PERMANENT");
  });

  it.each(["22023", "22P02", "23502", "23503", "23505", "23514", "42501", "42P01", "42703", "42883", "P0001"])(
    "classifies SQLSTATE %s as PERMANENT",
    (code) => {
      expect(classifyFailure({ code })).toBe("PERMANENT");
    },
  );

  it("classifies SQLSTATE 40001 (serialization) as TRANSIENT", () => {
    expect(classifyFailure({ code: "40001" })).toBe("TRANSIENT");
  });

  it("defaults to TRANSIENT for unknown errors", () => {
    expect(classifyFailure(new Error("some random"))).toBe("TRANSIENT");
    expect(classifyFailure(null)).toBe("TRANSIENT");
    expect(classifyFailure("string error")).toBe("TRANSIENT");
    expect(classifyFailure(undefined)).toBe("TRANSIENT");
  });

  it("prefers the explicit typed error over heuristics", () => {
    // Typed TRANSIENT wins over an HTTP 401 signal
    const error = new TransientError("provider_flaky", "retry me");
    Object.assign(error, { status: 401 });
    expect(classifyFailure(error)).toBe("TRANSIENT");
  });
});

describe("extractErrorClass", () => {
  it("returns the errorClass of a typed error", () => {
    expect(extractErrorClass(new PermanentError("customer_not_found", "…"))).toBe(
      "customer_not_found",
    );
    expect(extractErrorClass(new TransientError("provider_timeout", "…"))).toBe(
      "provider_timeout",
    );
  });

  it("prefers .code over .name", () => {
    expect(extractErrorClass({ code: "ECONNRESET", name: "SystemError" })).toBe("ECONNRESET");
  });

  it("falls back to .name for classic errors", () => {
    expect(extractErrorClass(new TypeError("boom"))).toBe("TypeError");
  });

  it("returns 'unknown_error' when nothing usable is present", () => {
    expect(extractErrorClass(new Error("boom"))).toBe("unknown_error");
    expect(extractErrorClass(null)).toBe("unknown_error");
    expect(extractErrorClass({})).toBe("unknown_error");
  });
});

describe("extractErrorMessage", () => {
  it("returns Error.message", () => {
    expect(extractErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns strings as-is", () => {
    expect(extractErrorMessage("boom")).toBe("boom");
  });

  it("stringifies opaque objects safely", () => {
    expect(extractErrorMessage({ a: 1 })).toBe('{"a":1}');
  });
});
