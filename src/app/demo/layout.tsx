import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DemoShell } from "@/components/sesira/demo-shell";
import { getDemoContext } from "@/lib/demo/context";

import "./demo.css";

export const metadata: Metadata = {
  title: "SESIRA Démo — THERMOPRO SERVICES",
  robots: { index: false, follow: false },
};

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const context = await getDemoContext();
  if (!context) redirect("/login?next=/demo");
  return <DemoShell>{children}</DemoShell>;
}
