import type { Metadata } from "next";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

export const metadata: Metadata = {
  title: "Diagnostic CVC | SESIRA",
  description: "En trois minutes, utilisez vos propres chiffres pour voir ce qui reste sans suite dans votre activité CVC.",
};

export default function DiagnosticPage() {
  return <DiagnosticExperience />;
}
