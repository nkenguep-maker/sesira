const protectedPrefixes = ["/app", "/control"];

function isPathWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedRoute(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => isPathWithin(pathname, prefix));
}

export function getAuthRedirect(pathname: string, hasClaims: boolean): "/login" | null {
  if (!hasClaims && isProtectedRoute(pathname)) {
    return "/login";
  }

  // Deliberately keep /login reachable even when a valid session cookie exists.
  // A user clicking "Connexion" should always see an authentication screen and
  // explicitly choose how to authenticate instead of being silently forwarded.
  return null;
}
