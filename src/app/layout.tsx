import type { Metadata } from "next";
import "./globals.css";
import "./ui-additions.css";
import "./premium-surfaces.css";
import "./cvc-landing.css";
import "./cvc-diagnostic.css";
import "./c21-hardening.css";
import "./app-workspace-dense.css";
import "./app-surfaces-dense.css";
import "./app-accessibility-fix.css";

export const metadata: Metadata = {
  title: "SESIRA — L'OS opérationnel de votre entreprise",
  description: "SESIRA rassemble vos clients, devis, suivi et opérations dans un espace clair.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
