import type { Metadata } from "next";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

export const metadata: Metadata = {
  title: "Diagnostic opérationnel | Sesira",
  description: "Identifiez vos priorités opérationnelles avec un diagnostic déterministe fondé sur vos propres chiffres.",
};

export default function DiagnosticPage() {
  return <DiagnosticExperience />;
}
