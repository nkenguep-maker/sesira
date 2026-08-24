import { Building2, LogOut } from "lucide-react";
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
    <div className="min-h-screen bg-[var(--background)] text-white lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="border-b border-[var(--border)] bg-[var(--background)] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col p-4 lg:p-5">
          <div className="flex items-center justify-between gap-3 px-2 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand)] font-bold">S</span>
              <div className="min-w-0">
                <p className="font-semibold tracking-wide">SESIRA</p>
                <p className="text-xs text-[var(--muted)]">Pilotage d’activité</p>
              </div>
            </div>
            <form action={logoutAction} className="lg:hidden">
              <button
                aria-label="Se déconnecter"
                className="grid size-11 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-white"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>

          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 lg:mt-6">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 size-4 text-[var(--accent)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{viewer.organization.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{organizationStatusLabel(viewer.organization.status)}</p>
              </div>
            </div>
          </div>

          <AppNavigation />

          <div className="mt-auto hidden border-t border-[var(--border)] pt-5 lg:block">
            <p className="truncate px-2 text-xs text-[var(--muted)]">{viewer.email}</p>
            <form action={logoutAction} className="mt-2">
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-white">
                <LogOut className="size-4" />
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-5 py-8 md:px-8 lg:px-12 lg:py-10">{children}</main>
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
