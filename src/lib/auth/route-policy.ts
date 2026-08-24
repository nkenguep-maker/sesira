const protectedPrefixes = ["/app", "/control"];

function isPathWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedRoute(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => isPathWithin(pathname, prefix));
}

export function getAuthRedirect(pathname: string, hasClaims: boolean): "/login" | "/app" | null {
  if (!hasClaims && isProtectedRoute(pathname)) {
    return "/login";
  }

  if (hasClaims && pathname === "/login") {
    return "/app";
  }

  return null;
}
