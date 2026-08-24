import type { Metadata } from "next";

import { PublicSite } from "@/components/public/public-site";

export const metadata: Metadata = {
  title: "Sesira — Votre entreprise, mieux organisée.",
  description:
    "De la demande reçue au devis signé, Sesira garde chaque dossier, chaque date et chaque décision sous contrôle.",
};

export default function HomePage() {
  return <PublicSite />;
}
