import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte entreprise | SESIRA",
  description: "Créez votre espace SESIRA pour relier planning, terrain, devis, factures, contrats et équipements.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
