import Link from "next/link";

import { UpdatePasswordForm } from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-center bg-[var(--ink)] px-6 py-12 text-white md:px-12 lg:px-16">
        <Link href="/" className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.16em] text-white">SESIRA</Link>
        <p className="mt-16 text-sm font-medium text-[var(--blue-light)]">Accès sécurisé</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.03em] md:text-6xl">Choisissez un nouveau mot de passe.</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">Huit caractères minimum. Le lien reçu par e-mail ne peut servir qu’à cette opération.</p>
      </section>
      <section className="flex items-center justify-center bg-[var(--paper)] px-6 py-12 md:px-12">
        <div className="w-full max-w-md border border-[var(--line)] bg-[var(--surface)] p-7 md:p-9">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">Nouveau mot de passe</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Une fois enregistré, vous serez connecté à votre espace Sesira.</p>
          <UpdatePasswordForm />
        </div>
      </section>
    </main>
  );
}
