import type { Metadata } from "next";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

export const metadata: Metadata = {
  title: "Calcul de rentabilité CVC | SESIRA",
  description: "Estimez en un clic votre volume annuel de devis, puis calculez le seuil de rentabilité de SESIRA avec seulement deux chiffres facultatifs.",
};

export default function DiagnosticPage() {
  return <DiagnosticExperience />;
}
