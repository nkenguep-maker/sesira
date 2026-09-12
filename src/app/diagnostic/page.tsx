import type { Metadata } from "next";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

export const metadata: Metadata = {
  title: "Diagnostic entreprise d’intervention | SESIRA",
  description: "En trois minutes, utilisez vos propres chiffres pour voir ce qui reste sans suite entre devis, planning et facturation.",
};

export default function DiagnosticPage() {
  return <DiagnosticExperience />;
}
