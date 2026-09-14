import type { Metadata } from "next";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

export const metadata: Metadata = {
  title: "Voyez ce que votre entreprise laisse passer | SESIRA",
  description: "Cinq questions avec vos chiffres pour voir ce qui mérite votre attention entre devis, planning et encaissement. Sans compte, sans promesse de résultat.",
};

export default function DiagnosticPage() {
  return <DiagnosticExperience />;
}
