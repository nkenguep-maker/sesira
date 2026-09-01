export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) {
    return new URL(configured).origin;
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (productionHost) {
    return `https://${productionHost}`;
  }

  return "http://localhost:3000";
}
