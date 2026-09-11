import type { Metadata } from "next";

import { DemoShell } from "@/components/sesira/demo-shell";
import "./demo.css";

export const metadata: Metadata = {
  title: "SESIRA Démo — THERMOPRO SERVICES",
  description: "Démonstration publique de SESIRA avec la même interface que l’application principale et des données fictives CVC.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoShell>{children}</DemoShell>;
}
