import {
  Activity,
  Bot,
  Building2,
  CircleGauge,
  PlugZap,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/control", label: "Vue d’ensemble", icon: CircleGauge },
  { href: "/control/organizations", label: "Organisations", icon: Building2 },
  { href: "/control/runs", label: "Exécutions", icon: Activity },
  { href: "/control/ai-runs", label: "Traitements Sesira", icon: Bot },
  { href: "/control/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/control/integrations", label: "Intégrations", icon: PlugZap },
] as const;

export function ControlCenterShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="flex h-10 items-center justify-between bg-[var(--ink)] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-white md:px-8">
        <span>Espace interne</span>
        <span className="text-white/50">Lecture seule</span>
      </div>
      <div className="lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="border-b border-white/15 bg-[var(--ink)] text-white lg:sticky lg:top-0 lg:h-[calc(100vh-40px)] lg:border-b-0 lg:border-r lg:border-r-white/15">
        <div className="flex h-full flex-col">
          <Link href="/control" className="flex h-[66px] items-center border-b border-white/15 px-[1.375rem]">
            <div>
              <p className="font-[family-name:var(--font-display)] font-bold tracking-[0.16em]">SESIRA</p>
              <p className="text-xs text-white/50">Centre de contrôle</p>
            </div>
          </Link>

          <div className="border-b border-white/15 px-[1.375rem] py-5">
            <div className="flex items-center gap-2 text-[var(--blue-light)]">
              <ShieldAlert className="size-4" />
              <p className="text-xs font-semibold tracking-[0.12em]">LECTURE SEULE</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/55">
              Aucun secret, aucune usurpation et aucune action de production ne sont disponibles ici.
            </p>
          </div>

          <nav aria-label="Navigation du centre de contrôle" className="overflow-x-auto py-2 lg:overflow-visible lg:py-3">
            <ul className="flex min-w-max gap-px lg:min-w-0 lg:flex-col">
              {navigation.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex min-h-11 items-center gap-3 px-[1.375rem] py-2.5 text-sm text-white/65 transition hover:bg-[var(--blue)] hover:text-white"
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <main className="sesira-page min-w-0">{children}</main>
      </div>
    </div>
  );
}
