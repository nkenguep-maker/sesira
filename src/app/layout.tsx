import type { Metadata } from "next";
import { Archivo, Public_Sans } from "next/font/google";

import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sesira OS",
  description: "Sesira aide votre équipe à suivre les demandes, les devis et les décisions importantes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${archivo.variable} ${publicSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
