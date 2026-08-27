import { Building2, LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ViewerContext } from "@/lib/auth/viewer";

import { logoutAction } from "@/app/app/logout-action";
import { AppNavigation } from "@/components/sesira/app-navigation";

export function AppShell({
  viewer,
  children,
}: {
  viewer: ViewerContext;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="border-b border-white/15 bg-[var(--ink)] text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-r-white/15">
        <div className="flex h-full flex-col lg:min-h-screen">
          <div className="flex h-[66px] items-center justify-between gap-3 border-b border-white/15 px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-display)] text-base font-bold tracking-[0.16em]">SESIRA</p>
                <p className="text-xs text-white/50">Votre activité</p>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <Link href="/app/attention" className="inline-flex min-h-11 items-center bg-[var(--blue)] px-3 text-sm font-semibold text-white">
                À traiter
              </Link>
              <form action={logoutAction}>
                <button
                  aria-label="Se déconnecter"
                  className="grid size-11 place-items-center border border-white/25 text-white/70 transition hover:border-white hover:text-white"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
          </div>

          <div className="hidden border-b border-white/15 px-[1.375rem] py-5 lg:block">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 size-4 text-[var(--blue-light)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{viewer.organization.name}</p>
                <p className="mt-1 text-xs text-white/50">{organizationStatusLabel(viewer.organization.status)}</p>
              </div>
            </div>
          </div>

          <AppNavigation />

          <div className="mt-auto hidden border-t border-white/15 px-3 py-5 lg:block">
            <div className="mb-4 border-b border-white/10 px-2 pb-4">
              <p className="sesira-eyebrow !text-[var(--blue-light)]">Niveau actuel</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-white/70"><span className="sesira-status-dot size-1.5 bg-[var(--blue-light)]" />Observation</p>
            </div>
            <p className="truncate px-2 text-xs text-white/50">{viewer.email}</p>
            <form action={logoutAction} className="mt-2">
              <button className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-white/65 transition hover:bg-white/5 hover:text-white">
                <LogOut className="size-4" />
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="sesira-page min-w-0">{children}</main>
    </div>
  );
}

function organizationStatusLabel(status: string): string {
  return ({
    TRIAL: "Essai",
    ACTIVE: "Actif",
    SUSPENDED: "Suspendu",
    ARCHIVED: "Archivé",
  } as Record<string, string>)[status] ?? "État non renseigné";
}
