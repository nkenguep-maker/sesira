import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import "./ui-additions.css";
import "./premium-surfaces.css";
import "./cvc-landing.css";
import "./cvc-diagnostic.css";
import "./c21-hardening.css";
import "./app-workspace-dense.css";
import "./app-surfaces-dense.css";
import "./app-accessibility-fix.css";
import "./c32-workspaces.css";
import "./dashboard-command-center.css";
import "./dashboard-stitch-extras.css";
import "./dashboard-legibility-depth.css";
import "./dashboard-simple.css";
import "./product-redesign.css";
import "./product-redesign-extras.css";
import "./product-redesign-patches.css";
import "./product-polish.css";
import "./product-polish-forms.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "SESIRA — L'OS opérationnel de votre entreprise",
  description: "SESIRA rassemble vos clients, devis, suivi et opérations dans un espace clair.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body className={`${hanken.variable} ${jetbrains.variable}`}>{children}</body></html>;
}
