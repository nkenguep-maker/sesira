import type { Metadata } from "next";

import { PublicSite } from "@/components/public/public-site";

export const metadata: Metadata = {
  title: "Sesira — Votre entreprise, mieux organisée.",
  description:
    "Sesira rassemble les nouvelles demandes, le suivi des devis et les décisions importantes dans un espace clair.",
};

export default function HomePage() {
  return <PublicSite />;
}
