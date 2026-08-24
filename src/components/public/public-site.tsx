import Link from "next/link";
import type { ReactNode } from "react";

const FOREGROUND = "#F6F7FB";

const benefits = [
  {
    number: "01",
    title: "Ne plus perdre une demande",
    description: "Chaque demande est reliée au bon client, au bon besoin et à la bonne personne.",
  },
  {
    number: "02",
    title: "Toujours savoir quel devis suivre",
    description: "Chaque devis garde un état, une prochaine date et un responsable.",
  },
  {
    number: "03",
    title: "Garder les décisions importantes",
    description: "Une objection prix ou un cas sensible attend votre équipe au lieu de se perdre dans les messages.",
  },
] as const;

const setupSteps = [
  ["01", "Comprendre", "Nous regardons vos demandes, vos devis et les points de blocage."],
  ["02", "Organiser", "Nous préparons un espace simple qui suit votre fonctionnement."],
  ["03", "Démarrer", "Votre équipe voit immédiatement ce qu’elle doit traiter."],
] as const;

export function PublicSite() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] [font-family:var(--font-geist-sans)]">
      <PublicHeader />

      <main>
        <Hero />
        <Benefits />
        <Potential />
        <Setup />
        <HumanControl />
      </main>

      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)] px-5 sm:px-8">
      <div className="mx-auto flex h-[4.75rem] max-w-7xl items-center justify-between gap-5">
        <Link href="/" aria-label="Sesira — accueil" className="flex min-w-0 items-center gap-4">
          <span className="text-xl font-bold tracking-[0.18em] text-[var(--foreground)]">SESIRA</span>
          <span className="hidden border-l border-[var(--border)] pl-4 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)] sm:block">
            Pour les PME
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
          <HeaderLink href="#benefices">Ce que vous gagnez</HeaderLink>
          <HeaderLink href="#potentiel">Potentiel</HeaderLink>
          <HeaderLink href="#fonctionnement">Mise en place</HeaderLink>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden text-sm sm:block" style={{ color: "var(--muted)" }}>
            Se connecter
          </Link>
          <DiagnosticLink compact />
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="border-b border-transparent py-2 text-sm transition hover:border-[var(--brand-soft)]" style={{ color: "var(--muted)" }}>
      {children}
    </Link>
  );
}

function Hero() {
  return (
    <section className="border-b border-[var(--border)] px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(29rem,0.82fr)] lg:items-center lg:gap-20">
        <div>
          <Eyebrow>Conçu pour les PME</Eyebrow>
          <h1 className="mt-7 max-w-4xl text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--foreground)] sm:text-6xl lg:text-[4.6rem]">
            Moins de tâches administratives. Plus de demandes et de devis suivis.
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            Sesira réunit vos clients, leurs demandes et vos devis dans un seul espace. Votre équipe sait quoi faire, quand et pour quel client.
          </p>
          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <DiagnosticLink />
            <Link
              href="#benefices"
              className="group inline-flex min-h-11 items-center gap-3 border-b border-[var(--border)] text-sm font-semibold transition hover:border-[var(--brand-soft)]"
              style={{ color: FOREGROUND }}
            >
              Voir comment Sesira aide
              <span aria-hidden="true" className="text-[var(--brand-soft)] transition group-hover:translate-y-0.5">↓</span>
            </Link>
          </div>
        </div>

        <DailyRegister />
      </div>
    </section>
  );
}

function DailyRegister() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-[#313B53] bg-[var(--panel)] shadow-[0_24px_70px_rgb(0_0_0/0.28)]"
      aria-label="Exemple d’une journée dans Sesira"
    >
      <div className="flex items-center justify-between gap-5 border-b border-[var(--border)] px-5 py-5 sm:px-7">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--muted)]">Vue du jour</p>
          <p className="mt-2 text-xl font-semibold tracking-tight">Trois dossiers, trois actions claires</p>
        </div>
        <span className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--accent)]">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--accent)]" />
          À jour
        </span>
      </div>

      <div className="divide-y divide-[var(--border)] px-5 sm:px-7">
        <RegisterLine number="01" title="Nouvelle demande" detail="Vérifier le besoin" status="À qualifier" />
        <RegisterLine number="02" title="Devis envoyé" detail="Préparer la prochaine action" status="À suivre" />
        <RegisterLine number="03" title="Le client demande une remise" detail="Votre accord est nécessaire" status="À décider" warning />
      </div>
    </div>
  );
}

function RegisterLine({
  number,
  title,
  detail,
  status,
  warning = false,
}: {
  number: string;
  title: string;
  detail: string;
  status: string;
  warning?: boolean;
}) {
  return (
    <div className="grid gap-3 py-5 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-center">
      <span className="font-mono text-xs text-[#65708A]">{number}</span>
      <div className="min-w-0">
        <p className="font-medium text-[var(--foreground)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p>
      </div>
      <StatusLabel warning={warning}>{status}</StatusLabel>
    </div>
  );
}

function Benefits() {
  return (
    <section id="benefices" className="scroll-mt-20 border-b border-[var(--border)] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="01"
          label="Au quotidien"
          title="Trois améliorations simples pour votre équipe."
          description="Plus besoin de reconstruire l’historique dans les emails, les notes ou la mémoire de chacun."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.number}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 transition hover:border-[#3A4561] sm:p-7"
            >
              <p className={`font-mono text-xs font-semibold tracking-[0.14em] ${
                benefit.number === "03" ? "text-[var(--warning)]" : "text-[var(--brand-soft)]"
              }`}>
                {benefit.number}
              </p>
              <h3 className="mt-10 text-xl font-semibold tracking-tight">{benefit.title}</h3>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Potential() {
  return (
    <section id="potentiel" className="scroll-mt-20 border-b border-[var(--border)] bg-[var(--panel)]/45 px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="02"
          label="Potentiel financier"
          title="Le gain potentiel se calcule avec vos chiffres."
          description="Deux sources de valeur sont prises en compte : le temps administratif récupéré et la marge potentielle issue de devis mieux suivis."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.76fr_1.24fr] lg:items-start lg:gap-12">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 sm:p-7">
            <p className="text-sm font-semibold">Le calcul reste lisible</p>
            <div className="mt-6 border-t border-[var(--border)]">
              <Formula number="01" title="Temps récupéré" formula="Heures économisées × coût horaire" />
              <Formula number="02" title="Marge potentielle" formula="Devis additionnels × devis moyen × marge" />
            </div>
            <p className="mt-6 text-sm leading-6 text-[var(--muted)]">
              Le résultat dépend de votre activité réelle. Les hypothèses restent toujours visibles.
            </p>
          </div>

          <RoiExample />
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 md:flex-row md:items-center md:p-7">
          <div>
            <p className="font-semibold">Vous voulez un chiffre adapté à votre entreprise ?</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Le résultat apparaît avant le formulaire de contact.</p>
          </div>
          <Link
            href="/diagnostic"
            className="inline-flex min-h-12 items-center gap-4 rounded-xl bg-[var(--foreground)] px-6 py-3 text-sm font-bold transition hover:bg-white"
            style={{ color: "#111827" }}
          >
            Calculer avec mes chiffres
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Formula({ number, title, formula }: { number: string; title: string; formula: string }) {
  return (
    <div className="grid gap-3 border-b border-[var(--border)] py-5 last:border-b-0 sm:grid-cols-[2rem_0.8fr_1.2fr] sm:items-center">
      <span className="font-mono text-xs text-[#65708A]">{number}</span>
      <p className="font-medium">{title}</p>
      <p className="font-mono text-[0.68rem] uppercase leading-5 tracking-[0.07em] text-[var(--muted)]">{formula}</p>
    </div>
  );
}

function RoiExample() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#3A4561] bg-[var(--background)]" aria-label="Exemple de calcul du gain potentiel">
      <div className="flex items-start justify-between gap-5 border-b border-[var(--border)] px-5 py-5 sm:px-7">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--muted)]">Exemple fictif</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">Une PME sur un mois</h3>
        </div>
        <span className="rounded-md border border-[var(--warning)]/45 bg-[var(--warning)]/8 px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--warning)]">
          Hypothèse
        </span>
      </div>

      <div className="px-5 sm:px-7">
        <ExampleLine label="Temps récupéré" assumption="10 h × 35 €" value="350 €" />
        <ExampleLine label="Marge additionnelle potentielle" assumption="1 devis × 3 500 € × 30 %" value="1 050 €" />
      </div>

      <div className="grid border-t border-[#284B52] bg-[#0B2027] px-5 py-6 sm:grid-cols-[1fr_auto] sm:items-end sm:px-7">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--accent)]">Potentiel mensuel estimé</p>
          <p className="mt-2 text-sm text-[#9AB7BC]">Temps récupéré + marge potentielle</p>
        </div>
        <p className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-[var(--accent)] sm:mt-0">1 400 €</p>
      </div>

      <p className="border-t border-[var(--border)] px-5 py-4 text-xs leading-5 text-[var(--muted)] sm:px-7">
        Cet exemple explique la méthode. Ce n’est ni une promesse, ni du chiffre d’affaires déjà généré.
      </p>
    </div>
  );
}

function ExampleLine({ label, assumption, value }: { label: string; assumption: string; value: string }) {
  return (
    <div className="grid gap-2 border-b border-[var(--border)] py-5 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
      <p className="font-medium">{label}</p>
      <p className="font-mono text-xs text-[var(--muted)]">{assumption}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Setup() {
  return (
    <section id="fonctionnement" className="scroll-mt-20 border-b border-[var(--border)] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="03"
          label="Mise en place"
          title="On organise votre fonctionnement sans bouleverser votre entreprise."
          description="Vous commencez par les modules réellement utiles et un cadre compris par votre équipe."
        />

        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] lg:grid-cols-3">
          {setupSteps.map(([number, title, description]) => (
            <li key={number} className="bg-[var(--panel)] p-6 sm:p-7">
              <span className="font-mono text-xs font-semibold text-[var(--brand-soft)]">{number}</span>
              <h3 className="mt-10 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function HumanControl() {
  return (
    <section id="controle" className="scroll-mt-20 border-b border-[var(--border)] bg-[var(--panel)] px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-20">
        <div>
          <Eyebrow warning>Contrôle humain</Eyebrow>
          <h2 className="mt-6 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl">
            Sesira suit les dossiers. Votre équipe garde les décisions.
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
          <ControlLine title="Sesira rassemble" text="Les clients, les demandes, les devis et les dates importantes." />
          <ControlLine title="Sesira signale" text="Ce qui attend une action ou risque d’être oublié." />
          <ControlLine title="Votre équipe décide" text="Pour le prix, les exceptions et les situations sensibles." warning />
        </div>
      </div>
    </section>
  );
}

function ControlLine({ title, text, warning = false }: { title: string; text: string; warning?: boolean }) {
  return (
    <div className="grid gap-2 border-b border-[var(--border)] px-5 py-5 last:border-b-0 sm:grid-cols-[0.65fr_1.35fr] sm:px-6">
      <p className={`font-medium ${warning ? "text-[var(--warning)]" : "text-[var(--foreground)]"}`}>{title}</p>
      <p className="text-sm leading-6 text-[var(--muted)]">{text}</p>
    </div>
  );
}

function SectionHeader({
  index,
  label,
  title,
  description,
}: {
  index: string;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[0.5fr_1.5fr] lg:gap-20">
      <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--brand-soft)]">
        {index} · {label}
      </p>
      <div>
        <h2 className="max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl">{title}</h2>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

function Eyebrow({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return (
    <p className={`font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${
      warning ? "text-[var(--warning)]" : "text-[var(--brand-soft)]"
    }`}>
      {children}
    </p>
  );
}

function StatusLabel({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return (
    <span
      className={`w-fit rounded-md border px-2.5 py-1 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.1em] ${
        warning
          ? "border-[var(--warning)]/45 bg-[var(--warning)]/8 text-[var(--warning)]"
          : "border-[#3A4561] bg-[var(--panel-soft)] text-[#B5BED2]"
      }`}
    >
      {children}
    </span>
  );
}

function DiagnosticLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/diagnostic"
      className="inline-flex min-h-11 items-center gap-3 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-bold transition hover:bg-[var(--brand-soft)] sm:px-5"
      style={{ color: FOREGROUND }}
    >
      <span className={compact ? "sm:hidden" : undefined}>{compact ? "Potentiel" : "Calculer mon potentiel"}</span>
      {compact ? <span className="hidden sm:inline">Calculer mon potentiel</span> : null}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function PublicFooter() {
  return (
    <footer className="bg-[var(--background)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold tracking-[0.18em]">SESIRA</p>
          <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted)]">Votre entreprise, mieux organisée.</p>
        </div>
        <nav aria-label="Navigation de bas de page" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="#benefices" style={{ color: "var(--muted)" }}>Ce que vous gagnez</Link>
          <Link href="/login" style={{ color: "var(--muted)" }}>Se connecter</Link>
        </nav>
      </div>
    </footer>
  );
}
