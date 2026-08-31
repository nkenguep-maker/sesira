import type { Metadata } from "next";
import { Hanken_Grotesk, Spline_Sans_Mono, Young_Serif } from "next/font/google";

import "./globals.css";

const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spline = Spline_Sans_Mono({
  variable: "--font-spline",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SESIRA — Suivi des devis pour entreprises CVC",
  description: "Sesira surveille vos devis, prépare les relances et vous laisse les décisions importantes.",
  metadataBase: new URL("https://sesira.fr"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "SESIRA — Suivi des devis pour entreprises CVC",
    description: "Ne laissez plus vos devis dormir dans votre boîte mail.",
    type: "website",
    locale: "fr_FR",
  },
  twitter: { card: "summary", title: "SESIRA — Suivi des devis pour entreprises CVC", description: "Suivez vos devis sans perdre la main." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${youngSerif.variable} ${hanken.variable} ${spline.variable}`}>
      <body>{children}</body>
    </html>
  );
}
