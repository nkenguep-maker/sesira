import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Fingerprint,
  Inbox,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Megaphone,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "#produit", label: "Ce que fait Sesira" },
  { href: "#mise-en-place", label: "Mise en place" },
  { href: "#securite", label: "Confiance" },
  { href: "#offre", label: "Offre" },
];

const productBenefits: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Inbox,
    title: "Tout retrouver",
    description: "Demandes, clients et devis restent reliés dans un seul espace.",
  },
  {
    icon: ListChecks,
    title: "Savoir quoi faire",
    description: "Les prochaines actions importantes apparaissent clairement.",
  },
  {
    icon: UserRoundCheck,
    title: "Garder la décision",
    description: "Votre équipe reste responsable des choix qui comptent.",
  },
];

const deploymentSteps = [
  {
    label: "01",
    title: "Comprendre votre fonctionnement",
    description: "Nous identifions les demandes, les devis et les points de vigilance à réunir.",
  },
  {
    label: "02",
    title: "Préparer votre espace",
    description: "Nous configurons uniquement les modules utiles à votre entreprise.",
  },
  {
    label: "03",
    title: "Démarrer avec votre équipe",
    description: "Vous avancez progressivement, avec des règles claires et un contrôle humain.",
  },
];

const trustPoints = [
  {
    icon: Fingerprint,
    title: "Un espace séparé",
    description: "Les données de votre entreprise restent isolées de celles des autres organisations.",
  },
  {
    icon: UsersRound,
    title: "Des accès maîtrisés",
    description: "Chaque membre voit uniquement ce qui correspond à son organisation et à son rôle.",
  },
  {
    icon: ShieldCheck,
    title: "Un contrôle humain",
    description: "Les situations sensibles remontent à votre équipe avant toute décision importante.",
  },
  {
    icon: ClipboardCheck,
    title: "Une activité lisible",
    description: "Les actions utiles restent visibles pour comprendre ce qui s’est passé.",
  },
];

export function PublicSite() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] [font-family:var(--font-geist-sans)]">
      <PublicHeader />

      <main>
        <Hero />

        <section id="produit" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Ce que fait Sesira"
              title="Une vue claire de votre activité quotidienne."
              description="Sesira relie ce qui entre dans votre entreprise, ce que votre équipe prépare et les décisions qui ne doivent pas attendre."
              centered
            />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {productBenefits.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 sm:p-7"
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-violet-400/10 text-violet-300">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <ProductSection
          id="demandes"
          eyebrow="Nouvelles demandes"
          title="Chaque demande trouve sa place."
          description="Votre équipe voit immédiatement ce qui vient d’arriver, les informations à compléter et les demandes prêtes à être prises en charge."
          benefits={[
            "Une demande reliée au bon client",
            "Un statut compréhensible par toute l’équipe",
            "Les informations utiles regroupées au même endroit",
          ]}
          visual={<RequestsPreview />}
        />

        <ProductSection
          id="devis"
          eyebrow="Suivi des devis"
          title="Vos devis ne disparaissent plus dans une liste."
          description="Retrouvez leur état, leur prochaine date importante et la demande à laquelle ils répondent."
          benefits={[
            "Du brouillon à la réponse du client",
            "Les prochaines dates visibles",
            "Une continuité entre client, demande et devis",
          ]}
          visual={<QuotesPreview />}
          reverse
        />

        <ProductSection
          id="a-traiter"
          eyebrow="À traiter"
          title="Sesira montre ce qui demande votre jugement."
          description="Quand une situation nécessite une décision, votre équipe comprend ce qui s’est passé, pourquoi elle est sollicitée et quelle action envisager."
          benefits={[
            "Une explication claire",
            "L’élément concerné accessible en un clic",
            "Une décision qui reste entre vos mains",
          ]}
          visual={<AttentionPreview />}
        />

        <ProductSection
          id="growth"
          eyebrow="Sesira Growth"
          title="Préparez votre présence commerciale avec la même clarté."
          description="Centralisez les idées, les contenus à valider et les publications prévues. Rien n’est publié sans l’accord prévu par votre équipe."
          benefits={[
            "Les idées utiles à préparer",
            "Les contenus en attente de validation",
            "Un calendrier simple des publications",
          ]}
          visual={<GrowthPreview />}
          reverse
        />

        <section id="resultats" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="Vos résultats"
                title="Des faits d’un côté. Des estimations clairement expliquées de l’autre."
                description="Sesira distingue toujours l’activité réellement enregistrée des projections. Les hypothèses restent visibles et aucun montant estimé n’est présenté comme un revenu généré."
              />
              <BenefitList
                items={[
                  "Demandes, devis et décisions réellement enregistrés",
                  "Estimations présentées comme telles",
                  "Hypothèses accessibles et compréhensibles",
                ]}
              />
            </div>
            <ResultsPreview />
          </div>
        </section>

        <section
          id="mise-en-place"
          className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--panel)]/50 px-5 py-20 sm:px-8 lg:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Mise en place"
              title="Partir de votre réalité, pas d’un modèle imposé."
              description="La mise en place commence par votre fonctionnement actuel et avance par étapes compréhensibles."
            />
            <ol className="mt-12 grid gap-4 lg:grid-cols-3">
              {deploymentSteps.map((step) => (
                <li
                  key={step.label}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-6 sm:p-7"
                >
                  <span className="font-mono text-sm font-semibold text-violet-300">{step.label}</span>
                  <h3 className="mt-10 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="securite" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
              <div className="lg:sticky lg:top-28">
                <span className="grid size-12 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300">
                  <LockKeyhole className="size-5" />
                </span>
                <SectionHeading
                  eyebrow="Confiance et sécurité"
                  title="Conçu pour garder le contrôle."
                  description="Une entreprise bien organisée doit aussi savoir qui voit quoi, ce qui s’est passé et quand une décision humaine est nécessaire."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {trustPoints.map(({ icon: Icon, title, description }) => (
                  <article
                    key={title}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6"
                  >
                    <Icon className="size-5 text-cyan-300" />
                    <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="diagnostic" className="scroll-mt-24 px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-violet-300/20 bg-[var(--panel)]">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              <div className="p-7 sm:p-10 lg:p-14">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Diagnostic</p>
                <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                  Commencez par voir où votre entreprise peut gagner en clarté.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
                  Répondez à quelques questions sur votre activité. Vos priorités apparaissent avant toute demande de coordonnées.
                </p>
                <Link href="/diagnostic" className="sesira-primary-action mt-8 px-5">
                  Voir mes priorités
                  <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="border-t border-[var(--border)] bg-[var(--background)]/60 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-14">
                <p className="text-sm font-medium text-slate-200">Le diagnostic vous aide à identifier :</p>
                <ul className="mt-6 grid gap-4">
                  {[
                    "les trois priorités les plus utiles",
                    "plusieurs scénarios prudents et expliqués",
                    "les hypothèses utilisées pour les estimations",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[var(--muted)]">
                      <SearchCheck className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section
          id="offre"
          className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--panel)]/45 px-5 py-20 sm:px-8 lg:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <SectionHeading
                eyebrow="L’offre Sesira"
                title="Une mise en place adaptée à votre entreprise."
                description="Nous activons ce qui vous est utile et gardons le reste de côté. L’objectif est simple : donner à votre équipe un espace fiable, compris et réellement utilisé."
              />
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-6 sm:p-8">
                <p className="text-sm font-medium text-violet-300">Ce que comprend la mise en place</p>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    "Diagnostic de votre fonctionnement",
                    "Configuration de votre espace",
                    "Activation des modules utiles",
                    "Accompagnement de votre équipe",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-200">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-[var(--muted)]">Votre diagnostic permet de préparer la suite.</p>
                  <Link href="/diagnostic" className="sesira-secondary-action shrink-0 px-5">
                    Commencer le diagnostic
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Votre prochaine étape</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Votre entreprise, mieux organisée.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              Découvrez les priorités qui peuvent simplifier le quotidien de votre équipe.
            </p>
            <Link href="/diagnostic" className="sesira-primary-action mt-8 px-6">
              Voir mes priorités
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[var(--background)]/85 px-5 backdrop-blur-xl sm:px-8">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5">
        <Link
          href="/"
          aria-label="Sesira — accueil"
          className="inline-flex items-center gap-3 font-semibold tracking-[0.16em]"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-violet-500 text-sm font-bold text-white">S</span>
          SESIRA
        </Link>
        <nav aria-label="Navigation principale" className="hidden items-center gap-6 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[var(--muted)] transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden min-h-11 items-center px-3 text-sm text-[var(--muted)] transition hover:text-white sm:inline-flex"
          >
            Se connecter
          </Link>
          <Link href="/diagnostic" className="sesira-primary-action min-h-10 px-3.5 sm:px-4">
            <span className="sm:hidden">Mes priorités</span>
            <span className="hidden sm:inline">Voir mes priorités</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:pb-28 lg:pt-28">
      <div className="pointer-events-none absolute left-1/2 top-12 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-xs font-medium text-cyan-200">
            <Sparkles className="size-3.5" />
            Un espace clair pour votre équipe
          </div>
          <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Votre entreprise,{" "}
            <span className="mt-1 block text-violet-300">mieux organisée.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Sesira rassemble les nouvelles demandes, le suivi des devis et les décisions importantes dans un espace compris par toute votre équipe.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/diagnostic" className="sesira-primary-action px-6">
              Voir mes priorités
              <ArrowRight className="size-4" />
            </Link>
            <Link href="#produit" className="sesira-secondary-action px-6">
              Découvrir Sesira
              <ChevronRight className="size-4" />
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs leading-5 text-[var(--muted)]">
            <ShieldCheck className="size-4 shrink-0 text-cyan-300" />
            Vos priorités apparaissent avant la demande de coordonnées.
          </p>
        </div>
        <OverviewPreview />
      </div>
    </section>
  );
}

function ProductSection({
  id,
  eyebrow,
  title,
  description,
  benefits,
  visual,
  reverse = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  benefits: string[];
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className={reverse ? "lg:order-2" : undefined}>
          <SectionHeading eyebrow={eyebrow} title={title} description={description} />
          <BenefitList items={benefits} />
        </div>
        <div className={reverse ? "lg:order-1" : undefined}>{visual}</div>
      </div>
    </section>
  );
}

function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="mt-8 grid gap-3 text-sm text-slate-200">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">{title}</h2>
      <p className="mt-5 text-base leading-7 text-[var(--muted)]">{description}</p>
    </div>
  );
}

function ProductFrame({
  title,
  eyebrow,
  icon: Icon,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--panel)] shadow-2xl shadow-black/25">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{eyebrow}</p>
            <p className="truncate text-sm font-semibold">{title}</p>
          </div>
        </div>
        <span className="hidden rounded-full border border-[var(--border)] px-3 py-1 text-[0.65rem] text-[var(--muted)] sm:inline-flex">
          Aperçu du produit
        </span>
      </div>
      {children}
    </div>
  );
}

function OverviewPreview() {
  return (
    <div className="relative" aria-label="Aperçu de l’accueil Sesira">
      <div className="absolute -inset-4 rounded-[2.25rem] bg-gradient-to-br from-violet-500/10 to-cyan-300/5 blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--panel)] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-violet-300">Accueil</p>
            <p className="mt-1 font-semibold">Aujourd’hui</p>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[0.65rem] font-medium text-emerald-300">
            Espace prêt
          </span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <PreviewMetric icon={Inbox} label="Nouvelles demandes" tone="cyan" />
          <PreviewMetric icon={FileText} label="Devis à suivre" tone="violet" />
          <PreviewMetric icon={CircleHelp} label="À traiter" tone="amber" />
        </div>
        <div className="border-t border-[var(--border)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Activité récente</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Les étapes importantes restent visibles.</p>
            </div>
            <Clock3 className="size-4 text-[var(--muted)]" />
          </div>
          <div className="mt-5 grid gap-4">
            <TimelinePreviewItem label="Nouvelle demande reçue" icon={Inbox} tone="cyan" />
            <TimelinePreviewItem label="Devis créé" icon={FileCheck2} tone="violet" />
            <TimelinePreviewItem label="Décision terminée" icon={CheckCircle2} tone="emerald" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: "cyan" | "violet" | "amber";
}) {
  const tones = {
    cyan: "bg-cyan-300/10 text-cyan-300",
    violet: "bg-violet-400/10 text-violet-300",
    amber: "bg-amber-300/10 text-amber-300",
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/55 p-4">
      <span className={`grid size-8 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-4" />
      </span>
      <p className="mt-5 text-xs leading-5 text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-200">À jour</p>
    </div>
  );
}

function TimelinePreviewItem({
  label,
  icon: Icon,
  tone,
}: {
  label: string;
  icon: LucideIcon;
  tone: "cyan" | "violet" | "emerald";
}) {
  const tones = {
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    emerald: "text-emerald-300",
  };

  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel-soft)]">
        <Icon className={`size-3.5 ${tones[tone]}`} />
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-slate-200">{label}</p>
      <span className="text-xs text-[var(--muted)]">Enregistré</span>
    </div>
  );
}

function RequestsPreview() {
  return (
    <ProductFrame title="Nouvelles demandes" eyebrow="Demandes clients" icon={Inbox}>
      <div className="grid gap-3 p-4 sm:p-5" aria-label="Aperçu des nouvelles demandes">
        <PreviewRow title="Nouvelle demande" detail="Informations reçues" status="Nouveau" tone="cyan" />
        <PreviewRow
          title="Demande à compléter"
          detail="Informations à demander"
          status="Informations manquantes"
          tone="amber"
        />
        <PreviewRow
          title="Demande qualifiée"
          detail="Dossier complet"
          status="Prêt pour votre équipe"
          tone="emerald"
        />
      </div>
    </ProductFrame>
  );
}

function QuotesPreview() {
  return (
    <ProductFrame title="Devis" eyebrow="Suivi commercial" icon={FileText}>
      <div className="p-4 sm:p-5" aria-label="Aperçu du suivi des devis">
        <div className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)]/55 p-5">
          <div>
            <p className="text-xs text-[var(--muted)]">Montant du devis</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">À renseigner</p>
          </div>
          <StatusPill label="Brouillon" tone="neutral" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <PreviewInfo icon={CalendarCheck2} label="Prochaine date" value="À planifier" />
          <PreviewInfo icon={MessageSquareText} label="Réponse" value="En attente" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-violet-300/15 bg-violet-300/5 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted)]">Demande liée</p>
            <p className="mt-1 truncate text-sm font-medium">Voir la demande d’origine</p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-violet-300" />
        </div>
      </div>
    </ProductFrame>
  );
}

function AttentionPreview() {
  return (
    <ProductFrame title="À traiter" eyebrow="Décisions humaines" icon={CircleHelp}>
      <div className="p-4 sm:p-5" aria-label="Aperçu d’un élément à traiter">
        <div className="flex flex-wrap gap-2">
          <StatusPill label="Priorité normale" tone="cyan" />
          <StatusPill label="Décision attendue" tone="violet" />
        </div>
        <h3 className="mt-5 text-lg font-semibold">Une décision humaine est nécessaire.</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PreviewDecision
            icon={CircleHelp}
            label="Pourquoi Sesira vous le montre"
            text="La situation ne doit pas avancer sans votre accord."
            tone="amber"
          />
          <PreviewDecision
            icon={Lightbulb}
            label="Prochaine décision"
            text="Consultez le devis, puis choisissez la suite."
            tone="violet"
          />
        </div>
        <div className="mt-5 flex flex-col gap-2 border-t border-[var(--border)] pt-4 sm:flex-row">
          <span className="sesira-secondary-action">Voir le devis</span>
          <span className="sesira-primary-action">Résoudre</span>
        </div>
      </div>
    </ProductFrame>
  );
}

function GrowthPreview() {
  return (
    <ProductFrame title="Marketing" eyebrow="Sesira Growth" icon={Megaphone}>
      <div className="grid gap-3 p-4 sm:p-5" aria-label="Aperçu de Sesira Growth">
        <GrowthRow icon={Lightbulb} label="Idée à préparer" status="Idée" tone="neutral" />
        <GrowthRow icon={FileText} label="Contenu à relire" status="À valider" tone="amber" />
        <GrowthRow icon={CalendarCheck2} label="Publication à venir" status="Planifié" tone="violet" />
        <div className="mt-1 flex items-center gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4">
          <Building2 className="size-4 shrink-0 text-cyan-300" />
          <div>
            <p className="text-sm font-medium">Votre entreprise</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Services, zones et messages approuvés.</p>
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

function ResultsPreview() {
  return (
    <ProductFrame title="Ce que Sesira rend visible" eyebrow="Résultats" icon={BarChart3}>
      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5" aria-label="Aperçu des résultats Sesira">
        <ResultCard label="Activité réelle" badge="OBSERVÉ" value="Vos données" tone="emerald" />
        <ResultCard label="Temps récupéré" badge="ESTIMATION" value="À calculer" tone="violet" />
        <ResultCard label="Méthode de calcul" badge="HYPOTHÈSE" value="Visible" tone="amber" />
      </div>
      <div className="border-t border-[var(--border)] px-5 py-4 text-xs leading-5 text-[var(--muted)]">
        Les données manquantes ne sont jamais remplacées par des résultats inventés.
      </div>
    </ProductFrame>
  );
}

function PreviewRow({
  title,
  detail,
  status,
  tone,
}: {
  title: string;
  detail: string;
  status: string;
  tone: PreviewTone;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)]/55 p-4 sm:flex-row sm:items-center">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300">
        <Inbox className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="mt-1 truncate text-xs text-[var(--muted)]">{detail}</p>
      </div>
      <StatusPill label={status} tone={tone} />
    </div>
  );
}

function PreviewInfo({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/55 p-4">
      <Icon className="size-4 text-cyan-300" />
      <p className="mt-4 text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function PreviewDecision({
  icon: Icon,
  label,
  text,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
  tone: "amber" | "violet";
}) {
  const tones = { amber: "text-amber-300", violet: "text-violet-300" };
  return (
    <div className="rounded-2xl bg-[var(--background)]/55 p-4">
      <Icon className={`size-4 ${tones[tone]}`} />
      <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{text}</p>
    </div>
  );
}

function GrowthRow({
  icon: Icon,
  label,
  status,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  status: string;
  tone: PreviewTone;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)]/55 p-4">
      <Icon className="size-4 shrink-0 text-violet-300" />
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{label}</p>
      <StatusPill label={status} tone={tone} />
    </div>
  );
}

function ResultCard({
  label,
  badge,
  value,
  tone,
}: {
  label: string;
  badge: string;
  value: string;
  tone: "emerald" | "violet" | "amber";
}) {
  const tones = {
    emerald: "text-emerald-300",
    violet: "text-violet-300",
    amber: "text-amber-300",
  };
  return (
    <div className="min-h-40 rounded-2xl border border-[var(--border)] bg-[var(--background)]/55 p-4">
      <p className={`text-[0.6rem] font-semibold tracking-[0.12em] ${tones[tone]}`}>{badge}</p>
      <p className="mt-7 text-xs leading-5 text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

type PreviewTone = "neutral" | "cyan" | "violet" | "amber" | "emerald";

function StatusPill({ label, tone }: { label: string; tone: PreviewTone }) {
  const tones: Record<PreviewTone, string> = {
    neutral: "border-slate-400/15 bg-slate-400/5 text-slate-300",
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    violet: "border-violet-300/20 bg-violet-300/10 text-violet-200",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  };
  return (
    <span className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] font-medium ${tones[tone]}`}>
      {label}
    </span>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-[var(--border)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-xl bg-violet-500 text-sm font-bold text-white">S</span>
          <span>SESIRA — Votre entreprise, mieux organisée.</span>
        </div>
        <nav aria-label="Navigation de bas de page" className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/diagnostic" className="transition hover:text-white">
            Diagnostic
          </Link>
          <Link href="/login" className="transition hover:text-white">
            Se connecter
          </Link>
        </nav>
      </div>
    </footer>
  );
}
