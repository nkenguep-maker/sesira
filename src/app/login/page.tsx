import Link from "next/link";

import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-center bg-[var(--ink)] px-6 py-12 text-white md:px-12 lg:px-16">
        <Link href="/" className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.16em] text-white">
          SESIRA
        </Link>
        <p className="mt-16 text-sm font-medium text-[var(--blue-light)]">Votre entreprise, mieux organisée.</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.03em] md:text-6xl">
          Voyez ce qui mérite vraiment votre attention.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
          Sesira rassemble les demandes et les devis, puis montre à votre équipe ce qu’elle doit décider.
        </p>
      </section>

      <section className="flex items-center justify-center bg-[var(--paper)] px-6 py-12 md:px-12">
        <div className="w-full max-w-md"><AuthForm /></div>
      </section>
    </main>
  );
}
