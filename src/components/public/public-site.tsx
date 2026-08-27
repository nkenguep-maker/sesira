import Link from "next/link";
import type { ReactNode } from "react";

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
    description: "Une baisse de prix demandée ou un cas sensible attend votre équipe au lieu de se perdre dans les messages.",
  },
] as const;

const setupSteps = [
  ["01", "Comprendre", "Nous regardons vos demandes, vos devis et les points de blocage."],
  ["02", "Organiser", "Nous préparons un espace simple qui suit votre fonctionnement."],
  ["03", "Démarrer", "Votre équipe voit immédiatement ce qu’elle doit traiter."],
] as const;

export function PublicSite() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--paper)] text-[var(--ink)] [font-family:var(--font-text)]">
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
    <header className="sticky top-0 z-50 border-b border-white/15 bg-[var(--ink)] px-5 text-white sm:px-8">
      <div className="mx-auto flex h-[4.75rem] max-w-7xl items-center justify-between gap-5">
        <Link href="/" aria-label="Sesira — accueil" className="flex min-w-0 items-center gap-4">
          <span className="font-[family-name:var(--font-display)] text-base font-bold tracking-[0.16em]">SESIRA</span>
          <span className="hidden border-l border-white/20 pl-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/55 sm:block">
            Pour les PME
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
          <HeaderLink href="#benefices">Ce que vous gagnez</HeaderLink>
          <HeaderLink href="#potentiel">Potentiel</HeaderLink>
          <HeaderLink href="#fonctionnement">Mise en place</HeaderLink>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden text-sm text-white/65 transition hover:text-white sm:block">
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
    <Link href={href} className="border-b border-transparent py-2 text-sm text-white/65 transition hover:border-[var(--blue-light)] hover:text-white">
      {children}
    </Link>
  );
}

function Hero() {
  return (
    <section className="border-b border-white/15 bg-[var(--ink)] px-5 py-16 text-white sm:px-8 sm:py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(29rem,0.82fr)] lg:items-center lg:gap-20">
        <div>
          <Eyebrow>Conçu pour les PME</Eyebrow>
          <h1 className="mt-7 max-w-4xl font-[family-name:var(--font-display)] text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.034em] sm:text-6xl lg:text-[5.125rem]">
            Moins de tâches administratives. <span className="text-[var(--blue-light)]">Plus de demandes et de devis suivis.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
            Sesira réunit vos clients, leurs demandes et vos devis dans un seul espace. Votre équipe sait quoi faire, quand et pour quel client.
          </p>
          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <DiagnosticLink />
            <Link
              href="#benefices"
              className="group inline-flex min-h-11 items-center gap-3 border-b border-white/25 text-sm font-semibold text-white transition hover:border-[var(--blue-light)]"
            >
              Voir comment Sesira aide
              <span aria-hidden="true" className="text-[var(--blue-light)] transition group-hover:translate-y-0.5">↓</span>
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
      className="overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)]"
      aria-label="Exemple d’une journée dans Sesira"
    >
      <div className="flex items-center justify-between gap-5 border-b border-[var(--border)] px-5 py-5 sm:px-7">
        <div>
          <p className="sesira-eyebrow">Vue du jour</p>
          <p className="mt-2 text-xl font-semibold tracking-tight">Trois dossiers, trois actions claires</p>
        </div>
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--blue)]">
          <span aria-hidden="true" className="sesira-status-dot size-1.5 bg-[var(--blue)]" />
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
      <span className="text-xs font-semibold text-[var(--ink-mute)]">{number}</span>
      <div className="min-w-0">
        <p className="font-medium text-[var(--ink)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p>
      </div>
      <StatusLabel warning={warning}>{status}</StatusLabel>
    </div>
  );
}

function Benefits() {
  return (
    <section id="benefices" className="scroll-mt-20 border-b border-white/15 bg-[var(--ink)] px-5 pb-20 text-white sm:px-8 lg:pb-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="01"
          label="Au quotidien"
          title="Trois améliorations simples pour votre équipe."
          description="Plus besoin de reconstruire l’historique dans les emails, les notes ou la mémoire de chacun."
        />

        <div className="mt-12 grid border-y border-white/15 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.number}
              className="border-b border-white/15 p-6 last:border-b-0 sm:p-7 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <p className={`font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.14em] ${
                "text-[var(--blue-light)]"
              }`}>
                {benefit.number}
              </p>
              <h3 className="mt-10 text-xl font-semibold tracking-tight">{benefit.title}</h3>
              <p className="mt-4 text-sm leading-6 text-white/60">{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Potential() {
  return (
    <section id="potentiel" className="scroll-mt-20 border-b border-[var(--line)] bg-[var(--paper)] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="02"
          label="Potentiel financier"
          title="Le gain potentiel se calcule avec vos chiffres."
          description="Deux sources de valeur sont prises en compte : le temps administratif récupéré et la marge potentielle issue de devis mieux suivis."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.76fr_1.24fr] lg:items-start lg:gap-12">
          <div className="border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-7">
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

        <div className="mt-8 flex flex-col items-start justify-between gap-6 border border-[var(--line)] bg-[var(--surface)] p-6 md:flex-row md:items-center md:p-7">
          <div>
            <p className="font-semibold">Vous voulez un chiffre adapté à votre entreprise ?</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Le résultat apparaît avant le formulaire de contact.</p>
          </div>
          <Link
            href="/diagnostic"
            className="inline-flex min-h-12 items-center gap-4 bg-[var(--blue)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
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
      <span className="text-xs font-semibold text-[var(--ink-mute)]">{number}</span>
      <p className="font-medium">{title}</p>
      <p className="font-[family-name:var(--font-display)] text-xs uppercase leading-5 tracking-[0.07em] text-[var(--muted)]">{formula}</p>
    </div>
  );
}

function RoiExample() {
  return (
    <div className="overflow-hidden border border-[var(--sand-line)] bg-[var(--sand)]" aria-label="Exemple de calcul du gain potentiel">
      <div className="flex items-start justify-between gap-5 border-b border-[var(--border)] px-5 py-5 sm:px-7">
        <div>
          <p className="sesira-eyebrow !text-[var(--sand-text)]">Exemple fictif</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">Une PME sur un mois</h3>
        </div>
        <span className="bg-[var(--sand-badge)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--sand-text)]">
          Hypothèse
        </span>
      </div>

      <div className="px-5 sm:px-7">
        <ExampleLine label="Temps récupéré" assumption="10 h × 35 €" value="350 €" />
        <ExampleLine label="Marge additionnelle potentielle" assumption="1 devis × 3 500 € × 30 %" value="1 050 €" />
      </div>

      <div className="grid border-t border-[var(--sand-line)] bg-[var(--sand-badge)] px-5 py-6 sm:grid-cols-[1fr_auto] sm:items-end sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--sand-text)]">Potentiel mensuel estimé</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Temps récupéré + marge potentielle</p>
        </div>
        <p className="mt-5 whitespace-nowrap font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.03em] text-[var(--sand-text)] sm:mt-0">1 400 €</p>
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
      <p className="font-[family-name:var(--font-display)] text-xs text-[var(--muted)]">{assumption}</p>
      <p className="whitespace-nowrap font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.03em]">{value}</p>
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

        <ol className="mt-12 grid gap-px overflow-hidden  border border-[var(--border)] bg-[var(--border)] lg:grid-cols-3">
          {setupSteps.map(([number, title, description]) => (
            <li key={number} className="bg-[var(--panel)] p-6 sm:p-7">
              <span className="font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--brand-soft)]">{number}</span>
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
    <section id="controle" className="scroll-mt-20 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-20">
        <div>
          <Eyebrow warning>Contrôle humain</Eyebrow>
          <h2 className="mt-6 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl">
            Sesira suit les dossiers. Votre équipe garde les décisions.
          </h2>
        </div>
        <div className="overflow-hidden border border-[var(--ink)] bg-[var(--ink)] text-white">
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
      <p className={`font-medium ${warning ? "text-[var(--blue-light)]" : "text-white"}`}>{title}</p>
      <p className="text-sm leading-6 text-white/60">{text}</p>
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
      <p className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-soft)]">
        {index} · {label}
      </p>
      <div>
        <h2 className="max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">{title}</h2>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

function Eyebrow({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return (
    <p className={`font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] ${
      warning ? "text-[var(--sand-text)]" : "text-[var(--blue-light)]"
    }`}>
      {children}
    </p>
  );
}

function StatusLabel({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return (
    <span
      className={`w-fit border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${
        warning
          ? "border-[var(--sand-line)] bg-[var(--sand)] text-[var(--sand-text)]"
          : "border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink-soft)]"
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
      className="inline-flex min-h-11 items-center gap-3 bg-[var(--blue)] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 sm:px-5"
    >
      <span className={compact ? "sm:hidden" : undefined}>{compact ? "Potentiel" : "Calculer mon potentiel"}</span>
      {compact ? <span className="hidden sm:inline">Calculer mon potentiel</span> : null}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function PublicFooter() {
  return (
    <footer className="bg-[var(--ink)] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold tracking-[0.18em]">SESIRA</p>
          <p className="mt-2 text-xs uppercase tracking-[0.1em] text-white/50">Votre entreprise, mieux organisée.</p>
        </div>
        <nav aria-label="Navigation de bas de page" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="#benefices" className="text-white/60">Ce que vous gagnez</Link>
          <Link href="/login" className="text-white/60">Se connecter</Link>
        </nav>
      </div>
    </footer>
  );
}
