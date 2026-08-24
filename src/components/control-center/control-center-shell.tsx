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
  { href: "/control/ai-runs", label: "Exécutions IA", icon: Bot },
  { href: "/control/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/control/integrations", label: "Intégrations", icon: PlugZap },
] as const;

export function ControlCenterShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-white lg:grid lg:grid-cols-[288px_1fr]">
      <aside className="border-b border-[var(--border)] bg-[#090d17] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col p-5">
          <Link href="/control" className="flex items-center gap-3 px-2 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--brand)] font-bold">S</span>
            <div>
              <p className="font-semibold tracking-wide">SESIRA CONTROL</p>
              <p className="text-xs text-[var(--muted)]">Opérations internes</p>
            </div>
          </Link>

          <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4">
            <div className="flex items-center gap-2 text-amber-200">
              <ShieldAlert className="size-4" />
              <p className="text-xs font-semibold tracking-[0.12em]">LECTURE SEULE</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Aucun secret, aucune usurpation et aucune action de production ne sont disponibles ici.
            </p>
          </div>

          <nav aria-label="Navigation Control Center" className="mt-5 overflow-x-auto lg:overflow-visible">
            <ul className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
              {navigation.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-[var(--panel)] hover:text-white"
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

      <main className="min-w-0 px-5 py-8 md:px-8 lg:px-12 lg:py-10">{children}</main>
    </div>
  );
}
