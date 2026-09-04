import type { Metadata } from "next";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

export const metadata: Metadata = {
  title: "Diagnostic CVC | Devis, chantiers et factures | SESIRA",
  description: "En trois minutes, mettez vos propres chiffres sur les devis sans relance, les chantiers signés sans date et les factures échues non encaissées.",
};

export default function DiagnosticPage() {
  return <DiagnosticExperience />;
}
