import { describe, expect, it } from "vitest";

import { getAuthRedirect, isProtectedRoute } from "./route-policy";

describe("product route policy", () => {
  it.each(["/app", "/app/customers", "/app/requests/known-id", "/control"])(
    "protects %s for logged-out visitors",
    (pathname) => {
      expect(isProtectedRoute(pathname)).toBe(true);
      expect(getAuthRedirect(pathname, false)).toBe("/login");
    },
  );

  it("does not overmatch similarly named public paths", () => {
    expect(isProtectedRoute("/application")).toBe(false);
    expect(isProtectedRoute("/controller")).toBe(false);
    expect(getAuthRedirect("/application", false)).toBeNull();
  });

  it("keeps authenticated users in the product and out of the login page", () => {
    expect(getAuthRedirect("/app/quotes", true)).toBeNull();
    expect(getAuthRedirect("/login", true)).toBe("/app");
  });
});
