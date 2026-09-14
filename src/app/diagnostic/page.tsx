import type { Metadata } from "next";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

export const metadata: Metadata = {
  title: "Ce que mon entreprise laisse passer | SESIRA",
  description: "Cinq réponses avec vos chiffres, puis un calcul transparent de ce qui peut rester sans suite entre devis, planning et facturation. Les hypothèses restent visibles et modifiables.",
};

export default function DiagnosticPage() {
  return <DiagnosticExperience />;
}
