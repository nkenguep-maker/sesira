import type { Metadata } from "next";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

export const metadata: Metadata = {
  title: "Diagnostic opérationnel | SESIRA",
  description: "Identifiez les points de friction de votre suivi avec un diagnostic fondé uniquement sur vos propres chiffres.",
};

export default function DiagnosticPage() {
  return <DiagnosticExperience />;
}
