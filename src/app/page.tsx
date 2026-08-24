import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
      <section className="w-full rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-2xl shadow-black/20 md:p-14">
        <div className="mb-10 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-[0.22em] text-[var(--accent)]">SESIRA OS</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-violet-400/50"
          >
            Ouvrir Sesira <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium text-[var(--muted)]">Pilotage quotidien</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Automatiser le normal.
            <span className="mt-2 block text-[var(--accent)]">Faire remonter les exceptions.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Sesira surveille l’activité courante, prépare les actions utiles et montre à votre équipe
            ce qui demande vraiment une décision.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 font-semibold text-white transition hover:bg-violet-500"
          >
            Accéder à la plateforme <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { label: "Vos données restent isolées", icon: ShieldCheck },
            { label: "Les actions sensibles restent humaines", icon: CheckCircle2 },
            { label: "Le produit s’adapte à votre activité", icon: ArrowRight },
          ].map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-5 text-sm text-[var(--muted)]"
              >
                <Icon className="mb-3 size-4 text-[var(--accent)]" />
                {label}
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}
