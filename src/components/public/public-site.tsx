import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

const PAPER = "#F3F4EF";
const INK = "#153D30";
const RUST = "#A34A2C";

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
  ["01", "Nous regardons votre fonctionnement", "Demandes, devis, responsabilités et points de blocage."],
  ["02", "Nous organisons votre espace", "Vos clients et vos dossiers suivent un cadre simple et partagé."],
  ["03", "Votre équipe commence", "Chacun voit ce qu’il doit traiter, sans changer votre métier."],
] as const;

export function PublicSite() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#F3F4EF] text-[#18231E] [font-family:var(--font-geist-sans)]"
      style={{ "--paper": PAPER, "--ink": INK, "--rust": RUST } as CSSProperties}
    >
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
    <header className="sticky top-0 z-50 border-b border-[#AEB9B0] bg-[#F3F4EF] px-5 sm:px-8">
      <div className="mx-auto flex h-[4.5rem] max-w-[88rem] items-center justify-between gap-5">
        <Link href="/" aria-label="Sesira — accueil" className="flex min-w-0 items-center gap-4 text-[#153D30]">
          <span className="text-xl font-bold tracking-[0.18em]">SESIRA</span>
          <span className="hidden border-l border-[#AEB9B0] pl-4 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#59675F] sm:block">
            Pour les PME
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
          <Link href="#benefices" className="border-b border-transparent py-2 text-sm text-[#4E5D54] hover:border-[#153D30]">
            Ce que vous gagnez
          </Link>
          <Link href="#potentiel" className="border-b border-transparent py-2 text-sm text-[#4E5D54] hover:border-[#153D30]">
            Potentiel
          </Link>
          <Link href="#fonctionnement" className="border-b border-transparent py-2 text-sm text-[#4E5D54] hover:border-[#153D30]">
            Mise en place
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden text-sm text-[#4E5D54] underline-offset-4 hover:underline sm:block">
            Se connecter
          </Link>
          <DiagnosticLink compact />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-[#AEB9B0] px-5 py-14 sm:px-8 sm:py-20 lg:py-24">
      <div className="mx-auto grid max-w-[88rem] gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(31rem,0.75fr)] lg:items-center lg:gap-20">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#59675F]">
            Pour les PME
          </p>
          <h1 className="mt-7 max-w-4xl [font-family:Georgia,'Times_New_Roman',serif] text-[2.8rem] leading-[1.03] tracking-[-0.035em] text-[#18231E] sm:text-6xl lg:text-[4.5rem]">
            Moins de tâches administratives. Plus de demandes et de devis suivis.
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-7 text-[#4E5D54] sm:text-lg sm:leading-8">
            Sesira réunit vos clients, leurs demandes et vos devis dans un seul espace. Votre équipe sait quoi faire, quand et pour quel client.
          </p>
          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <DiagnosticLink />
            <Link
              href="#benefices"
              className="group inline-flex min-h-11 items-center gap-3 border-b border-[#153D30] text-sm font-semibold text-[#153D30]"
            >
              Voir comment Sesira aide
              <span aria-hidden="true" className="transition group-hover:translate-y-0.5">↓</span>
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
    <div className="relative border border-[#819087] bg-[#FAFBF7] shadow-[12px_12px_0_#DDE2DC]" aria-label="Exemple d’une journée dans Sesira">
      <div className="absolute -right-px -top-9 border border-b-0 border-[#819087] bg-[#153D30] px-5 py-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#F3F4EF]">
        Aujourd’hui
      </div>
      <div className="border-b border-[#AEB9B0] px-5 py-5 sm:px-7">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#6A776F]">À faire maintenant</p>
        <p className="mt-2 [font-family:Georgia,'Times_New_Roman',serif] text-2xl text-[#153D30]">Trois dossiers, trois actions claires</p>
      </div>

      <div className="divide-y divide-[#C8CFC9] px-5 sm:px-7">
        <RegisterLine number="01" title="Nouvelle demande" detail="Vérifier le besoin" status="À qualifier" />
        <RegisterLine number="02" title="Devis envoyé" detail="Préparer la prochaine action" status="À suivre" />
        <RegisterLine number="03" title="Le client demande une remise" detail="Votre accord est nécessaire" status="À décider" rust />
      </div>
    </div>
  );
}

function RegisterLine({
  number,
  title,
  detail,
  status,
  rust = false,
}: {
  number: string;
  title: string;
  detail: string;
  status: string;
  rust?: boolean;
}) {
  return (
    <div className="grid gap-3 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center">
      <span className="font-mono text-xs text-[#6A776F]">{number}</span>
      <div className="min-w-0">
        <p className="font-semibold text-[#18231E]">{title}</p>
        <p className="mt-1 text-sm text-[#68746C]">{detail}</p>
      </div>
      <StatusStamp rust={rust}>{status}</StatusStamp>
    </div>
  );
}

function Benefits() {
  return (
    <section id="benefices" className="scroll-mt-20 border-b border-[#AEB9B0] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[88rem]">
        <SectionHeader
          index="01"
          label="Au quotidien"
          title="Sesira aide votre équipe à faire trois choses, simplement."
          description="Pas besoin de reconstruire l’historique dans les emails, les notes ou la mémoire de chacun."
        />

        <div className="mt-12 grid border-y border-[#AEB9B0] md:grid-cols-3">
          {benefits.map((benefit) => (
            <article key={benefit.number} className="border-b border-[#AEB9B0] py-7 last:border-b-0 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
              <p className={`font-mono text-[0.65rem] font-semibold tracking-[0.16em] ${benefit.number === "03" ? "text-[#A34A2C]" : "text-[#617067]"}`}>
                {benefit.number}
              </p>
              <h3 className="mt-7 [font-family:Georgia,'Times_New_Roman',serif] text-2xl leading-tight text-[#153D30]">
                {benefit.title}
              </h3>
              <p className="mt-4 text-sm leading-6 text-[#4E5D54]">{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Potential() {
  return (
    <section id="potentiel" className="scroll-mt-20 border-b border-[#AEB9B0] bg-[#E8ECE6] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[88rem]">
        <SectionHeader
          index="02"
          label="Potentiel financier"
          title="Le gain potentiel se calcule avec vos chiffres."
          description="Sesira peut créer de la valeur de deux façons : du temps administratif récupéré et des devis mieux suivis. Le diagnostic sépare toujours les faits des estimations."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <h3 className="[font-family:Georgia,'Times_New_Roman',serif] text-2xl text-[#153D30]">Le calcul reste simple</h3>
            <div className="mt-6 border-t border-[#8F9B92]">
              <Formula number="01" title="Temps récupéré" formula="Heures économisées × coût horaire" />
              <Formula number="02" title="Marge potentielle" formula="Devis additionnels × devis moyen × marge" />
            </div>
            <p className="mt-6 text-sm leading-6 text-[#4E5D54]">
              Le résultat dépend de votre volume de demandes, de votre devis moyen, de votre marge et du temps administratif actuel.
            </p>
          </div>

          <RoiExample />
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-6 border-t border-[#8F9B92] pt-8 md:flex-row md:items-center">
          <div>
            <p className="font-semibold text-[#153D30]">Vous voulez un chiffre adapté à votre entreprise ?</p>
            <p className="mt-2 text-sm text-[#59675F]">Le résultat du diagnostic apparaît avant le formulaire de contact.</p>
          </div>
          <Link
            href="/diagnostic"
            className="inline-flex min-h-12 items-center gap-4 bg-[#153D30] px-6 py-3 text-sm font-bold transition hover:bg-[#0D3025]"
            style={{ color: PAPER }}
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
    <div className="grid gap-3 border-b border-[#AEB9B0] py-5 sm:grid-cols-[2.5rem_0.8fr_1.2fr] sm:items-center">
      <span className="font-mono text-xs text-[#617067]">{number}</span>
      <p className="font-semibold text-[#18231E]">{title}</p>
      <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#59675F]">{formula}</p>
    </div>
  );
}

function RoiExample() {
  return (
    <div className="border border-[#819087] bg-[#FAFBF7]" aria-label="Exemple de calcul du gain potentiel">
      <div className="flex items-start justify-between gap-5 border-b border-[#AEB9B0] px-5 py-5 sm:px-7">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#6A776F]">Exemple fictif</p>
          <h3 className="mt-2 [font-family:Georgia,'Times_New_Roman',serif] text-2xl text-[#153D30]">Une PME sur un mois</h3>
        </div>
        <span className="border border-[#A34A2C] px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[#A34A2C]">Hypothèse</span>
      </div>

      <div className="px-5 sm:px-7">
        <ExampleLine label="Temps récupéré" assumption="10 h × 35 €" value="350 €" />
        <ExampleLine label="Marge additionnelle potentielle" assumption="1 devis × 3 500 € × 30 %" value="1 050 €" />
      </div>

      <div className="grid border-t border-[#819087] bg-[#153D30] px-5 py-6 text-[#F3F4EF] sm:grid-cols-[1fr_auto] sm:items-end sm:px-7">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[#B9C9BF]">Potentiel mensuel estimé</p>
          <p className="mt-2 text-sm text-[#D5DDD7]">Temps récupéré + marge potentielle</p>
        </div>
        <p className="mt-5 [font-family:Georgia,'Times_New_Roman',serif] text-4xl sm:mt-0">1 400 €</p>
      </div>

      <p className="border-t border-[#AEB9B0] px-5 py-4 text-xs leading-5 text-[#59675F] sm:px-7">
        Cet exemple explique la méthode. Ce n’est ni une promesse, ni du chiffre d’affaires déjà généré.
      </p>
    </div>
  );
}

function ExampleLine({ label, assumption, value }: { label: string; assumption: string; value: string }) {
  return (
    <div className="grid gap-2 border-b border-[#C8CFC9] py-5 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
      <p className="font-semibold text-[#18231E]">{label}</p>
      <p className="font-mono text-xs text-[#68746C]">{assumption}</p>
      <p className="[font-family:Georgia,'Times_New_Roman',serif] text-2xl text-[#153D30]">{value}</p>
    </div>
  );
}

function Setup() {
  return (
    <section id="fonctionnement" className="scroll-mt-20 border-b border-[#AEB9B0] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[88rem]">
        <SectionHeader
          index="03"
          label="Mise en place"
          title="On organise votre fonctionnement sans bouleverser votre entreprise."
          description="Sesira s’adapte à vos dossiers et à votre équipe. Vous commencez par les modules réellement utiles."
        />

        <ol className="mt-12 border-t border-[#8F9B92]">
          {setupSteps.map(([number, title, description]) => (
            <li key={number} className="grid gap-4 border-b border-[#AEB9B0] py-6 sm:grid-cols-[3rem_0.8fr_1.2fr] sm:items-start">
              <span className="font-mono text-xs font-semibold text-[#153D30]">{number}</span>
              <h3 className="font-semibold text-[#18231E]">{title}</h3>
              <p className="text-sm leading-6 text-[#4E5D54]">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function HumanControl() {
  return (
    <section id="controle" className="scroll-mt-20 bg-[#153D30] px-5 py-16 text-[#F3F4EF] sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-[88rem] gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#B9C9BF]">04 · Contrôle humain</p>
          <h2 className="mt-6 max-w-3xl [font-family:Georgia,'Times_New_Roman',serif] text-3xl leading-tight tracking-[-0.02em] sm:text-5xl">
            Sesira suit les dossiers. Votre équipe garde les décisions.
          </h2>
        </div>
        <div className="border-y border-[#6D887A]">
          <ControlLine title="Sesira rassemble" text="Les clients, les demandes, les devis et les dates importantes." />
          <ControlLine title="Sesira signale" text="Ce qui attend une action ou risque d’être oublié." />
          <ControlLine title="Votre équipe décide" text="Pour le prix, les exceptions et les situations sensibles." rust />
        </div>
      </div>
    </section>
  );
}

function ControlLine({ title, text, rust = false }: { title: string; text: string; rust?: boolean }) {
  return (
    <div className="grid gap-2 border-b border-[#527061] py-5 last:border-b-0 sm:grid-cols-[0.65fr_1.35fr]">
      <p className={`font-semibold ${rust ? "text-[#F0A17E]" : "text-[#F3F4EF]"}`}>{title}</p>
      <p className="text-sm leading-6 text-[#D5DDD7]">{text}</p>
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
    <div className="grid gap-8 lg:grid-cols-[0.55fr_1.45fr] lg:gap-20">
      <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#59675F]">
        {index} · {label}
      </p>
      <div>
        <h2 className="max-w-4xl [font-family:Georgia,'Times_New_Roman',serif] text-3xl leading-tight tracking-[-0.02em] text-[#153D30] sm:text-5xl">
          {title}
        </h2>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[#4E5D54]">{description}</p>
      </div>
    </div>
  );
}

function StatusStamp({ children, rust = false }: { children: ReactNode; rust?: boolean }) {
  return (
    <span
      className={`w-fit border px-2.5 py-1 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.1em] ${
        rust ? "border-[#A34A2C] text-[#A34A2C]" : "border-[#819087] text-[#3D594A]"
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
      className="inline-flex min-h-11 items-center gap-3 bg-[#153D30] px-4 py-2.5 text-sm font-bold transition hover:bg-[#0D3025] sm:px-5"
      style={{ color: PAPER }}
    >
      <span className={compact ? "sm:hidden" : undefined}>{compact ? "Potentiel" : "Calculer mon potentiel"}</span>
      {compact ? <span className="hidden sm:inline">Calculer mon potentiel</span> : null}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-[#345A4B] bg-[#0F3026] px-5 py-8 text-[#D5DDD7] sm:px-8">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold tracking-[0.18em] text-[#F3F4EF]">SESIRA</p>
          <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[#9FB2A8]">Votre entreprise, mieux organisée.</p>
        </div>
        <nav aria-label="Navigation de bas de page" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="#benefices" className="hover:text-white">Ce que vous gagnez</Link>
          <Link href="/login" className="hover:text-white">Se connecter</Link>
        </nav>
      </div>
    </footer>
  );
}
