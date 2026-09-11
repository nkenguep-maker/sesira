import type { Metadata } from "next";

import "./demo.css";

export const metadata: Metadata = {
  title: "SESIRA Démo — THERMOPRO SERVICES",
  description: "Démonstration publique et interactive de SESIRA avec données fictives CVC.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
