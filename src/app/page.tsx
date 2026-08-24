import type { Metadata } from "next";

import { PublicSite } from "@/components/public/public-site";

export const metadata: Metadata = {
  title: "Sesira — Votre entreprise, mieux organisée.",
  description:
    "Sesira aide les PME à gagner du temps, mieux suivre leurs demandes et leurs devis, et estimer leur gain potentiel.",
};

export default function HomePage() {
  return <PublicSite />;
}
