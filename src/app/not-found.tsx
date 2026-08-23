import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--accent)]">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Cette page n’existe pas.</h1>
        <Link href="/" className="mt-7 inline-flex rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold">
          Revenir à l’accueil
        </Link>
      </div>
    </main>
  );
}
