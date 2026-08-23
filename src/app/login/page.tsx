import Link from "next/link";

import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <Link href="/" className="text-sm font-semibold tracking-[0.22em] text-[var(--accent)]">
          SESIRA OS
        </Link>
        <p className="mt-16 text-sm font-medium text-[var(--muted)]">Votre entreprise, mieux organisée.</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
          Voyez ce qui mérite vraiment votre attention.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
          Sesira surveille l’activité courante, prépare les actions utiles et laisse les décisions
          sensibles à votre équipe.
        </p>
      </section>

      <AuthForm />
    </main>
  );
}
