import type { Metadata } from "next";

import "./standalone.css";

export const metadata: Metadata = {
  title: "SESIRA Terrain — Démo technicien",
  description: "Démonstration autonome de l’application terrain SESIRA pour techniciens.",
  robots: { index: false, follow: false },
};

export default function TerrainDemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="terrain-technician-standalone">{children}</div>;
}
