import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Lightbulb,
  Megaphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { GrowthNavigation } from "@/components/growth/growth-navigation";
import type {
  GrowthChannel,
  GrowthContent,
  GrowthContentStatus,
  GrowthIdea,
  GrowthPublication,
  GrowthResult,
  GrowthSummary,
  OrganizationKnowledge,
} from "@/lib/growth/contracts";

export const CONTENT_STATUS_LABELS: Record<GrowthContentStatus, string> = {
  IDEA: "Idée",
  DRAFT: "Brouillon",
  REVIEW: "À valider",
  APPROVED: "Validé",
  SCHEDULED: "Planifié",
  PUBLISHED: "Publié",
};

export const CHANNEL_LABELS: Record<GrowthChannel, string> = {
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  GOOGLE_BUSINESS: "Google Business",
  EMAIL: "Email",
};

const STATUS_CLASSES: Record<GrowthContentStatus, string> = {
  IDEA: "border-slate-300/15 bg-slate-300/5 text-slate-300",
  DRAFT: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  REVIEW: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  APPROVED: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  SCHEDULED: "border-violet-300/20 bg-violet-300/10 text-violet-200",
  PUBLISHED: "border-blue-300/20 bg-blue-300/10 text-blue-200",
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "Europe/Paris",
});

function formatDate(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

function GrowthPage({
  eyebrow,
  title,
  description,
  source,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  source: GrowthResult<unknown>["source"];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">{description}</p>
      </header>
      <GrowthNavigation />
      {source === "DEMO" ? <DemoBanner /> : null}
      {children}
    </div>
  );
}

function DemoBanner() {
  return (
    <section className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-5" aria-label="Données de démonstration">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-cyan-300" />
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-cyan-200">DÉMO</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Ces exemples servent à présenter le produit. Aucun contenu n’a été généré, planifié ou publié sur une plateforme externe.
          </p>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: GrowthContentStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {CONTENT_STATUS_LABELS[status]}
    </span>
  );
}

function ChannelBadges({ channels }: { channels: GrowthChannel[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {channels.map((channel) => (
        <span key={channel} className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-xs text-[var(--muted)]">
          {CHANNEL_LABELS[channel]}
        </span>
      ))}
    </div>
  );
}

export function MarketingHomeScreen({
  summary,
  knowledge,
  ideas,
  content,
  publications,
}: {
  summary: GrowthResult<GrowthSummary>;
  knowledge: GrowthResult<OrganizationKnowledge>;
  ideas: GrowthResult<GrowthIdea[]>;
  content: GrowthResult<GrowthContent[]>;
  publications: GrowthResult<GrowthPublication[]>;
}) {
  return (
    <GrowthPage
      eyebrow="SESIRA GROWTH"
      title="Préparer une présence utile, sans bruit."
      description="Centralisez les sujets, les validations et le calendrier éditorial avant de connecter le moindre canal."
      source={summary.source}
    >
      <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="Résumé Marketing">
        <SummaryCard href="/app/marketing/ideas" icon={Lightbulb} label="Idées à préparer" value={summary.data.ideasToPrepare} />
        <SummaryCard href="/app/marketing/content" icon={FileCheck2} label="Contenus à valider" value={summary.data.contentToReview} />
        <SummaryCard href="/app/marketing/publications" icon={CalendarDays} label="Publications prévues" value={summary.data.plannedPublications} />
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <OrganizationKnowledgeCard knowledge={knowledge.data} />
        <div className="grid gap-5">
          <PreviewCard
            icon={Lightbulb}
            eyebrow="PROCHAINE IDÉE"
            title={ideas.data[0]?.title ?? "Aucune idée à préparer"}
            description={ideas.data[0]?.angle ?? "Les prochaines idées apparaîtront ici."}
            href="/app/marketing/ideas"
            linkLabel="Voir les idées"
          />
          <PreviewCard
            icon={CheckCircle2}
            eyebrow="À VALIDER"
            title={content.data.find((item) => item.status === "REVIEW")?.title ?? "Aucun contenu à valider"}
            description="La validation reste une décision de votre équipe."
            href="/app/marketing/content"
            linkLabel="Voir les contenus"
          />
          <PreviewCard
            icon={Clock3}
            eyebrow="CALENDRIER DÉMO"
            title={publications.data.find((item) => item.status === "SCHEDULED")?.contentTitle ?? "Aucune publication prévue"}
            description="Aucun envoi ne part depuis ce calendrier de démonstration."
            href="/app/marketing/publications"
            linkLabel="Voir le calendrier"
          />
        </div>
      </section>
    </GrowthPage>
  );
}

function SummaryCard({ href, icon: Icon, label, value }: { href: string; icon: LucideIcon; label: string; value: number }) {
  return (
    <Link href={href} className="group rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-violet-300/30 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Icon className="size-5" /></span>
        <ArrowRight className="size-4 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-white" />
      </div>
      <p className="mt-7 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{label}</p>
    </Link>
  );
}

function OrganizationKnowledgeCard({ knowledge }: { knowledge: OrganizationKnowledge }) {
  const sections = [
    ["Services", knowledge.services],
    ["Zones", knowledge.locations],
    ["Ton", knowledge.tone],
    ["Différences", knowledge.differentiators],
    ["Formulations autorisées", knowledge.approvedClaims],
    ["À ne pas promettre", knowledge.prohibitedClaims],
    ["Questions fréquentes", knowledge.commonQuestions],
    ["Objections fréquentes", knowledge.commonObjections],
  ] as const;

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 md:p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><Building2 className="size-5" /></span>
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-cyan-200">VOTRE ENTREPRISE</p>
          <h2 className="mt-2 text-xl font-semibold">{knowledge.organizationName}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{knowledge.sectorLabel}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {sections.map(([label, values]) => (
          <section key={label} className="rounded-xl bg-[var(--panel-soft)] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-5">
              {values.map((value) => <li key={value}>{value}</li>)}
            </ul>
          </section>
        ))}
        <section className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 sm:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-200">Certifications</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{knowledge.certifications.join(", ")}</p>
        </section>
      </div>
    </article>
  );
}

function PreviewCard({ icon: Icon, eyebrow, title, description, href, linkLabel }: { icon: LucideIcon; eyebrow: string; title: string; description: string; href: string; linkLabel: string }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex items-center gap-2 text-violet-300"><Icon className="size-4" /><p className="text-xs font-semibold tracking-[0.12em]">{eyebrow}</p></div>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      <Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-200">{linkLabel}<ArrowRight className="size-4" /></Link>
    </article>
  );
}

export function MarketingIdeasScreen({ result }: { result: GrowthResult<GrowthIdea[]> }) {
  return (
    <GrowthPage eyebrow="MARKETING · IDÉES" title="Des sujets à transformer en contenus utiles." description="Chaque idée part d’une question client, d’une objection ou d’un sujet métier concret." source={result.source}>
      {result.data.length ? (
        <section className="mt-8 grid gap-5 lg:grid-cols-2" aria-label="Idées à préparer">
          {result.data.map((idea) => (
            <article key={idea.id} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><Lightbulb className="size-5" /></span>
                <span className={`rounded-full border px-2.5 py-1 text-xs ${idea.priority === "HIGH" ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : "border-slate-300/15 text-slate-300"}`}>{idea.priority === "HIGH" ? "Prioritaire" : "À préparer"}</span>
              </div>
              <h2 className="mt-5 text-lg font-semibold">{idea.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{idea.angle}</p>
              <div className="mt-5 rounded-xl bg-[var(--panel-soft)] p-4">
                <p className="text-xs font-semibold tracking-[0.1em] text-[var(--muted)]">POURQUOI CE SUJET</p>
                <p className="mt-2 text-sm leading-6">{idea.reason}</p>
              </div>
              <div className="mt-5"><ChannelBadges channels={idea.suggestedChannels} /></div>
            </article>
          ))}
        </section>
      ) : <GrowthEmptyState icon={Lightbulb} title="Aucune idée à préparer" description="Les prochains sujets apparaîtront ici." />}
    </GrowthPage>
  );
}

export function MarketingContentScreen({ result }: { result: GrowthResult<GrowthContent[]> }) {
  return (
    <GrowthPage eyebrow="MARKETING · CONTENUS" title="Un parcours de validation lisible." description="De l’idée à la publication, chaque statut reste visible et la décision finale appartient à votre équipe." source={result.source}>
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="Étapes du contenu">
        {Object.entries(CONTENT_STATUS_LABELS).map(([status, label], index) => (
          <div key={status} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
            <span className="text-xs text-[var(--muted)]">{index + 1}</span>
            <p className="mt-3 text-sm font-medium">{label}</p>
          </div>
        ))}
      </section>
      {result.data.length ? (
        <section className="mt-6 grid gap-4" aria-label="Contenus marketing">
          {result.data.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 md:p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3"><StatusBadge status={item.status} /><span className="text-xs text-[var(--muted)]">Mis à jour le {formatDate(item.updatedAt)}</span></div>
                  <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.excerpt}</p>
                </div>
                <div className="md:max-w-xs"><ChannelBadges channels={item.channels} /></div>
              </div>
              <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">Responsable : {item.ownerLabel ?? "Non attribué"}</p>
            </article>
          ))}
        </section>
      ) : <GrowthEmptyState icon={FileCheck2} title="Aucun contenu" description="Les contenus préparés apparaîtront ici." />}
    </GrowthPage>
  );
}

export function MarketingPublicationsScreen({ result }: { result: GrowthResult<GrowthPublication[]> }) {
  const planned = result.data.filter((item) => item.status === "SCHEDULED");
  const history = result.data.filter((item) => item.status === "PUBLISHED");
  return (
    <GrowthPage eyebrow="MARKETING · PUBLICATIONS" title="Un calendrier simple avant toute connexion." description="Visualisez les dates et les canaux envisagés. Ce calendrier de démonstration ne déclenche aucun envoi." source={result.source}>
      {result.data.length ? (
        <>
          <section className="mt-8" aria-labelledby="calendar-title">
            <div className="flex items-center gap-2"><CalendarDays className="size-5 text-violet-300" /><h2 id="calendar-title" className="text-lg font-semibold">Prochaines dates</h2></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {planned.map((item) => (
                <article key={item.id} className="rounded-2xl border border-violet-300/15 bg-violet-300/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-violet-200">{dayFormatter.format(new Date(item.publicationAt))}</p>
                  <h3 className="mt-3 font-medium leading-6">{item.contentTitle}</h3>
                  <p className="mt-3 text-sm text-[var(--muted)]">{CHANNEL_LABELS[item.channel]}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10" aria-labelledby="publication-list-title">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.15em] text-[var(--accent)]">LISTE</p><h2 id="publication-list-title" className="mt-2 text-lg font-semibold">Calendrier et historique de démonstration</h2></div><p className="text-sm text-[var(--muted)]">{result.data.length} éléments</p></div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
              <ul className="divide-y divide-[var(--border)]">
                {[...planned, ...history].map((item) => (
                  <li key={item.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-center">
                    <div className="min-w-0"><p className="font-medium">{item.contentTitle}</p><p className="mt-1 text-xs text-[var(--muted)]">{formatDate(item.publicationAt)}</p></div>
                    <ChannelBadges channels={[item.channel]} />
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-200" />
            <p className="text-sm leading-6 text-[var(--muted)]">La planification, la validation du canal et la publication réelle nécessitent encore les services Core et les connexions autorisées.</p>
          </section>
        </>
      ) : <GrowthEmptyState icon={Megaphone} title="Aucune publication prévue" description="Le calendrier est vide." />}
    </GrowthPage>
  );
}

function GrowthEmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-6 py-14 text-center">
      <Icon className="mx-auto size-9 text-violet-300" />
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
    </section>
  );
}

export function MarketingLoadingScreen() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse" aria-label="Chargement du Marketing">
      <div className="h-3 w-36 rounded bg-[var(--panel-soft)]" />
      <div className="mt-4 h-10 max-w-2xl rounded bg-[var(--panel-soft)]" />
      <div className="mt-4 h-5 max-w-3xl rounded bg-[var(--panel-soft)]" />
      <div className="mt-8 h-16 rounded-2xl bg-[var(--panel)]" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-36 rounded-2xl bg-[var(--panel)]" />)}</div>
      <div className="mt-8 h-80 rounded-2xl bg-[var(--panel)]" />
    </div>
  );
}
