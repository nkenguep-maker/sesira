import type { Metadata } from "next";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

export const metadata: Metadata = {
  title: "Ce qui se perd chez moi | SESIRA",
  description: "Cinq réponses, une estimation, puis un calcul transparent de ce qui reste sans suite entre devis, planning et facturation.",
};

export default function DiagnosticPage() {
  return <DiagnosticExperience />;
}
