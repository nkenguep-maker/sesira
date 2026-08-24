import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

const PAPER = "#F3F4EF";
const INK = "#153D30";
const RUST = "#A34A2C";

const navigation = [
  { href: "#parcours", label: "Le parcours" },
  { href: "#growth", label: "Growth" },
  { href: "#mise-en-place", label: "Mise en place" },
  { href: "#confiance", label: "Confiance" },
];

const deploymentSteps = [
  {
    number: "01",
    title: "Faire l’état des lieux",
    description: "Nous regardons comment les demandes arrivent, comment les devis sont suivis et où les dossiers s’arrêtent.",
  },
  {
    number: "02",
    title: "Organiser les dossiers",
    description: "Nous configurons les modules utiles, les statuts et les responsabilités de votre équipe.",
  },
  {
    number: "03",
    title: "Ouvrir le registre",
    description: "Votre équipe démarre avec un cadre lisible, des actions traçables et un contrôle humain.",
  },
];

const trustItems = [
  ["Séparation", "Les données de chaque entreprise restent isolées."],
  ["Accès", "Chaque membre entre dans le bon espace avec son propre compte."],
  ["Décision", "Les situations sensibles attendent l’accord de votre équipe."],
  ["Historique", "Les étapes importantes restent consultables dans le dossier."],
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
        <OperatingPrinciple />

        <div id="parcours" className="scroll-mt-20 border-t border-[#AEB9B0]">
          <IndexedSection
            index="01"
            id="demandes"
            label="Nouvelles demandes"
            title="Une demande reçue devient un dossier attribué."
            description="Email, téléphone ou saisie manuelle : la demande est reliée au client, qualifiée et confiée à la bonne personne. Les informations manquantes ne restent plus dans un coin de boîte mail."
            facts={[
              "Client et besoin réunis",
              "Informations manquantes visibles",
              "Responsable clairement identifié",
            ]}
            visual={<RequestsRegister />}
          />

          <IndexedSection
            index="02"
            id="devis"
            label="Suivi des devis"
            title="Un devis envoyé garde toujours une prochaine date."
            description="Le devis reste relié à la demande d’origine. Son état, son échéance et la prochaine action sont lisibles sans reconstruire l’historique à la main."
            facts={[
              "Du brouillon à la réponse",
              "Prochaine date consignée",
              "Historique client conservé",
            ]}
            visual={<QuotesRegister />}
            reverse
          />

          <IndexedSection
            index="03"
            id="a-traiter"
            label="Décision humaine"
            title="Ce qui exige votre jugement est mis à part."
            description="Une objection sur le prix, une demande inhabituelle ou un dossier sensible ne doit pas être traité comme une tâche ordinaire. Sesira arrête le suivi et présente la décision à prendre."
            facts={[
              "Le fait expliqué simplement",
              "Le dossier concerné accessible",
              "La décision laissée à votre équipe",
            ]}
            visual={<AttentionRegister />}
            accent="rust"
          />

          <IndexedSection
            index="04"
            id="growth"
            label="Sesira Growth"
            title="Les idées commerciales suivent aussi un registre."
            description="Les sujets à préparer, les contenus à valider et les publications prévues sont organisés sans publier à la place de votre équipe."
            facts={[
              "Idées regroupées",
              "Validation avant publication",
              "Calendrier partagé",
            ]}
            visual={<GrowthRegister />}
            reverse
          />

          <IndexedSection
            index="05"
            id="resultats"
            label="Résultats"
            title="Les faits restent séparés des estimations."
            description="Sesira compte ce qui a réellement été enregistré. Les gains potentiels sont présentés à part, avec leurs hypothèses — jamais comme du revenu déjà généré."
            facts={[
              "Activité réellement observée",
              "Estimations explicitement nommées",
              "Hypothèses toujours consultables",
            ]}
            visual={<ResultsRegister />}
          />
        </div>

        <Deployment />
        <Trust />
        <DiagnosticOffer />
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
          <span className="hidden border-l border-[#AEB9B0] pl-4 font-mono text-[0.65rem] uppercase leading-4 tracking-[0.12em] text-[#59675F] sm:block">
            Registre opérationnel
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-b border-transparent py-2 text-sm text-[#4E5D54] transition hover:border-[#153D30] hover:text-[#153D30]"
            >
              {item.label}
            </Link>
          ))}
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
      <div className="mx-auto grid max-w-[88rem] gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(34rem,0.9fr)] lg:items-center lg:gap-20">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#59675F]">
            Dossier d’activité / édition 01
          </p>
          <p className="mt-8 max-w-2xl text-xl leading-8 text-[#153D30] sm:text-2xl">
            Votre entreprise, mieux organisée.
          </p>
          <h1 className="mt-5 max-w-4xl [font-family:Georgia,'Times_New_Roman',serif] text-[2.8rem] leading-[1.02] tracking-[-0.035em] text-[#18231E] sm:text-6xl lg:text-[4.65rem]">
            De la demande reçue au devis signé, gardez chaque dossier sous contrôle.
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-7 text-[#4E5D54] sm:text-lg sm:leading-8">
            Sesira rassemble les demandes clients, les devis à suivre et les décisions qui attendent votre équipe. Vous voyez ce qui avance, ce qui bloque et qui doit agir.
          </p>
          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <DiagnosticLink />
            <Link
              href="#parcours"
              className="group inline-flex min-h-11 items-center gap-3 border-b border-[#153D30] text-sm font-semibold text-[#153D30]"
            >
              Voir le parcours d’un dossier
              <span aria-hidden="true" className="transition group-hover:translate-x-1">↓</span>
            </Link>
          </div>
        </div>

        <HeroRegister />
      </div>
    </section>
  );
}

function HeroRegister() {
  return (
    <div className="relative border border-[#819087] bg-[#FAFBF7] shadow-[12px_12px_0_#DDE2DC]" aria-label="Aperçu du registre Sesira">
      <div className="absolute -right-px -top-9 border border-b-0 border-[#819087] bg-[#153D30] px-5 py-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#F3F4EF]">
        Dossier ouvert
      </div>
      <div className="flex items-start justify-between gap-5 border-b border-[#AEB9B0] px-5 py-5 sm:px-7">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#6A776F]">Registre du jour</p>
          <p className="mt-2 [font-family:Georgia,'Times_New_Roman',serif] text-2xl text-[#153D30]">Dossiers en cours</p>
        </div>
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[#6A776F]">SES / ACT / 01</p>
      </div>

      <div className="divide-y divide-[#C8CFC9] px-5 sm:px-7">
        <RegisterLine code="01" title="Demande reçue" detail="Informations à vérifier" status="À qualifier" />
        <RegisterLine code="02" title="Devis envoyé" detail="Prochaine date consignée" status="À suivre" />
        <RegisterLine code="03" title="Réponse sensible" detail="Le dossier attend votre équipe" status="À décider" rust />
      </div>

      <div className="grid border-t border-[#AEB9B0] bg-[#E8ECE6] sm:grid-cols-2">
        <div className="border-b border-[#AEB9B0] px-5 py-4 sm:border-b-0 sm:border-r sm:px-7">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[#6A776F]">Responsable</p>
          <p className="mt-2 text-sm font-semibold text-[#153D30]">Équipe concernée</p>
        </div>
        <div className="px-5 py-4 sm:px-7">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[#6A776F]">Historique</p>
          <p className="mt-2 text-sm font-semibold text-[#153D30]">Chaque étape conservée</p>
        </div>
      </div>
    </div>
  );
}

function RegisterLine({
  code,
  title,
  detail,
  status,
  rust = false,
}: {
  code: string;
  title: string;
  detail: string;
  status: string;
  rust?: boolean;
}) {
  return (
    <div className="grid gap-3 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center">
      <span className="font-mono text-xs text-[#6A776F]">{code}</span>
      <div className="min-w-0">
        <p className="font-semibold text-[#18231E]">{title}</p>
        <p className="mt-1 text-sm text-[#68746C]">{detail}</p>
      </div>
      <StatusStamp rust={rust}>{status}</StatusStamp>
    </div>
  );
}

function OperatingPrinciple() {
  return (
    <section id="produit" className="scroll-mt-20 px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[88rem]">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <SectionCode code="PRINCIPE / 00" label="Ce que fait Sesira" />
          <div>
            <h2 className="max-w-5xl [font-family:Georgia,'Times_New_Roman',serif] text-3xl leading-tight tracking-[-0.02em] text-[#153D30] sm:text-5xl">
              Un dossier ne devrait pas dépendre de la mémoire de la personne qui l’a ouvert.
            </h2>
            <div className="mt-12 grid border-y border-[#AEB9B0] md:grid-cols-3">
              <Principle number="01" title="Entrée" text="La demande est enregistrée avec son client et son besoin." />
              <Principle number="02" title="Suivi" text="Le devis garde un état, une date et un responsable." />
              <Principle number="03" title="Décision" text="Ce qui sort du cadre remonte à la bonne personne." rust />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Principle({ number, title, text, rust = false }: { number: string; title: string; text: string; rust?: boolean }) {
  return (
    <article className="border-b border-[#AEB9B0] py-7 last:border-b-0 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
      <p className={`font-mono text-[0.65rem] font-semibold tracking-[0.16em] ${rust ? "text-[#A34A2C]" : "text-[#617067]"}`}>
        {number} / {title.toUpperCase()}
      </p>
      <p className="mt-7 text-base leading-7 text-[#3F4E45]">{text}</p>
    </article>
  );
}

function IndexedSection({
  index,
  id,
  label,
  title,
  description,
  facts,
  visual,
  reverse = false,
  accent = "green",
}: {
  index: string;
  id: string;
  label: string;
  title: string;
  description: string;
  facts: string[];
  visual: ReactNode;
  reverse?: boolean;
  accent?: "green" | "rust";
}) {
  return (
    <section id={id} className="relative scroll-mt-24 border-b border-[#AEB9B0] px-5 py-16 sm:px-8 lg:py-24">
      <div
        className={`absolute left-5 top-0 -translate-y-px border border-t-0 px-4 py-2 font-mono text-[0.65rem] font-bold tracking-[0.16em] sm:left-8 lg:left-[max(2rem,calc((100vw-88rem)/2))] ${
          accent === "rust" ? "border-[#A34A2C] bg-[#A34A2C] text-[#FFF8F2]" : "border-[#153D30] bg-[#153D30] text-[#F3F4EF]"
        }`}
      >
        {index}
      </div>

      <div className="mx-auto grid max-w-[88rem] gap-12 pt-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-20">
        <div className={reverse ? "lg:order-2" : undefined}>
          <SectionCode code={`DOSSIER / ${index}`} label={label} rust={accent === "rust"} />
          <h2 className="mt-6 max-w-2xl [font-family:Georgia,'Times_New_Roman',serif] text-3xl leading-tight tracking-[-0.025em] text-[#18231E] sm:text-[2.75rem]">
            {title}
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#4E5D54]">{description}</p>
          <ul className="mt-8 border-t border-[#B9C2BA]">
            {facts.map((fact) => (
              <li key={fact} className="grid grid-cols-[1.2rem_1fr] gap-3 border-b border-[#C8CFC9] py-3.5 text-sm text-[#35443B]">
                <span aria-hidden="true" className={accent === "rust" ? "text-[#A34A2C]" : "text-[#153D30]"}>—</span>
                {fact}
              </li>
            ))}
          </ul>
        </div>
        <div className={reverse ? "lg:order-1" : undefined}>{visual}</div>
      </div>
    </section>
  );
}

function SectionCode({ code, label, rust = false }: { code: string; label: string; rust?: boolean }) {
  return (
    <p className={`font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${rust ? "text-[#A34A2C]" : "text-[#59675F]"}`}>
      {code} · {label}
    </p>
  );
}

function DossierFrame({ code, title, children, rust = false }: { code: string; title: string; children: ReactNode; rust?: boolean }) {
  return (
    <div className="border border-[#8F9B92] bg-[#FAFBF7] shadow-[8px_8px_0_#DDE2DC]">
      <div className="flex items-end justify-between gap-5 border-b border-[#AEB9B0] px-5 py-5 sm:px-7">
        <div>
          <p className={`font-mono text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${rust ? "text-[#A34A2C]" : "text-[#617067]"}`}>{code}</p>
          <h3 className="mt-2 [font-family:Georgia,'Times_New_Roman',serif] text-2xl text-[#153D30]">{title}</h3>
        </div>
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[#7A867E]">Aperçu Sesira</span>
      </div>
      {children}
    </div>
  );
}

function RequestsRegister() {
  return (
    <DossierFrame code="REG / DEM" title="Registre des demandes">
      <div className="divide-y divide-[#C8CFC9] px-5 sm:px-7" aria-label="Aperçu des demandes">
        <DossierRow reference="DEM-01" title="Demande reçue" detail="Client et besoin enregistrés" status="Nouveau" />
        <DossierRow reference="DEM-02" title="Dossier incomplet" detail="Information attendue" status="À compléter" />
        <DossierRow reference="DEM-03" title="Demande qualifiée" detail="Responsable identifié" status="Prêt" />
      </div>
    </DossierFrame>
  );
}

function QuotesRegister() {
  return (
    <DossierFrame code="REG / DEV" title="Registre des devis">
      <div aria-label="Aperçu du suivi des devis">
        <div className="grid border-b border-[#C8CFC9] sm:grid-cols-3">
          <LedgerCell label="État" value="Envoyé" />
          <LedgerCell label="Prochaine date" value="Consignée" />
          <LedgerCell label="Responsable" value="Attribué" />
        </div>
        <div className="px-5 py-6 sm:px-7">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.15em] text-[#6A776F]">Historique du dossier</p>
          <div className="mt-5 border-l border-[#819087] pl-5">
            <TimelineLine label="Demande d’origine reliée" />
            <TimelineLine label="Devis créé" />
            <TimelineLine label="Devis envoyé" last />
          </div>
        </div>
      </div>
    </DossierFrame>
  );
}

function AttentionRegister() {
  return (
    <DossierFrame code="REG / DEC" title="Décision en attente" rust>
      <div className="p-5 sm:p-7" aria-label="Aperçu d’une décision humaine">
        <div className="border-2 border-[#A34A2C] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="font-mono text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#A34A2C]">Tampon · À décider</p>
            <span className="border border-[#A34A2C] px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[#A34A2C]">Suivi arrêté</span>
          </div>
          <h4 className="mt-7 [font-family:Georgia,'Times_New_Roman',serif] text-2xl leading-snug text-[#18231E]">Une réponse du client exige votre accord.</h4>
          <dl className="mt-6 grid gap-4 border-y border-[#D2B3A7] py-5 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[0.58rem] uppercase tracking-[0.13em] text-[#8A6658]">Pourquoi</dt>
              <dd className="mt-2 text-sm leading-6 text-[#4D443F]">La suite ne doit pas partir sans validation.</dd>
            </div>
            <div>
              <dt className="font-mono text-[0.58rem] uppercase tracking-[0.13em] text-[#8A6658]">À faire</dt>
              <dd className="mt-2 text-sm leading-6 text-[#4D443F]">Ouvrir le devis et choisir la réponse.</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
            <span className="border border-[#153D30] px-4 py-2.5 text-[#153D30]">Voir le devis</span>
            <span className="bg-[#A34A2C] px-4 py-2.5 text-white">Consigner la décision</span>
          </div>
        </div>
      </div>
    </DossierFrame>
  );
}

function GrowthRegister() {
  return (
    <DossierFrame code="REG / GRW" title="Registre éditorial">
      <div className="divide-y divide-[#C8CFC9] px-5 sm:px-7" aria-label="Aperçu de Sesira Growth">
        <DossierRow reference="GRW-01" title="Sujet à préparer" detail="Idée consignée" status="Idée" />
        <DossierRow reference="GRW-02" title="Contenu à relire" detail="Votre équipe doit valider" status="À valider" />
        <DossierRow reference="GRW-03" title="Publication prévue" detail="Date inscrite au calendrier" status="Planifié" />
      </div>
    </DossierFrame>
  );
}

function ResultsRegister() {
  return (
    <DossierFrame code="REG / RES" title="Relevé de résultats">
      <div className="grid sm:grid-cols-3" aria-label="Aperçu des résultats Sesira">
        <ResultColumn code="OBS" label="Observé" value="Faits enregistrés" />
        <ResultColumn code="EST" label="Estimation" value="Potentiel calculé" />
        <ResultColumn code="HYP" label="Hypothèse" value="Méthode visible" />
      </div>
      <p className="border-t border-[#AEB9B0] bg-[#E8ECE6] px-5 py-4 text-xs leading-5 text-[#59675F] sm:px-7">
        Une donnée manquante reste manquante. Elle n’est jamais remplacée par un résultat inventé.
      </p>
    </DossierFrame>
  );
}

function DossierRow({ reference, title, detail, status }: { reference: string; title: string; detail: string; status: string }) {
  return (
    <div className="grid gap-3 py-5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center">
      <span className="font-mono text-[0.62rem] tracking-[0.1em] text-[#6A776F]">{reference}</span>
      <div className="min-w-0">
        <p className="font-semibold text-[#18231E]">{title}</p>
        <p className="mt-1 text-sm text-[#68746C]">{detail}</p>
      </div>
      <StatusStamp>{status}</StatusStamp>
    </div>
  );
}

function StatusStamp({ children, rust = false }: { children: ReactNode; rust?: boolean }) {
  return (
    <span className={`w-fit border px-2.5 py-1 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.1em] ${rust ? "border-[#A34A2C] text-[#A34A2C]" : "border-[#819087] text-[#3D594A]"}`}>
      {children}
    </span>
  );
}

function LedgerCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#C8CFC9] px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-6">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.13em] text-[#6A776F]">{label}</p>
      <p className="mt-3 font-semibold text-[#153D30]">{value}</p>
    </div>
  );
}

function TimelineLine({ label, last = false }: { label: string; last?: boolean }) {
  return (
    <div className={`relative pb-5 text-sm text-[#3F4E45] ${last ? "pb-0" : ""}`}>
      <span className="absolute -left-[1.48rem] top-1 size-2 border border-[#153D30] bg-[#FAFBF7]" />
      {label}
    </div>
  );
}

function ResultColumn({ code, label, value }: { code: string; label: string; value: string }) {
  return (
    <div className="border-b border-[#C8CFC9] p-5 last:border-b-0 sm:min-h-44 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:p-6">
      <p className="font-mono text-[0.6rem] font-semibold tracking-[0.14em] text-[#617067]">{code}</p>
      <p className="mt-8 text-xs uppercase tracking-[0.1em] text-[#6A776F]">{label}</p>
      <p className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-xl leading-snug text-[#153D30]">{value}</p>
    </div>
  );
}

function Deployment() {
  return (
    <section id="mise-en-place" className="scroll-mt-20 border-b border-[#AEB9B0] bg-[#E8ECE6] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[88rem]">
        <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
          <div>
            <SectionCode code="OUVERTURE / 01" label="Mise en place" />
            <h2 className="mt-6 [font-family:Georgia,'Times_New_Roman',serif] text-3xl leading-tight text-[#153D30] sm:text-4xl">Votre fonctionnement d’abord. L’outil ensuite.</h2>
          </div>
          <ol className="border-t border-[#8F9B92]">
            {deploymentSteps.map((step) => (
              <li key={step.number} className="grid gap-4 border-b border-[#AEB9B0] py-6 sm:grid-cols-[3rem_0.8fr_1.2fr] sm:items-start">
                <span className="font-mono text-xs font-semibold text-[#153D30]">{step.number}</span>
                <h3 className="font-semibold text-[#18231E]">{step.title}</h3>
                <p className="text-sm leading-6 text-[#4E5D54]">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section id="confiance" className="scroll-mt-20 border-b border-[#AEB9B0] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[88rem]">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionCode code="GARANTIES / 01" label="Confiance" />
            <h2 className="mt-6 max-w-3xl [font-family:Georgia,'Times_New_Roman',serif] text-3xl leading-tight text-[#153D30] sm:text-4xl">Un registre utile doit aussi être maîtrisé.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#4E5D54]">Les accès, les décisions et l’historique font partie du produit — pas d’une promesse ajoutée après coup.</p>
        </div>
        <div className="mt-12 grid border border-[#8F9B92] md:grid-cols-2 xl:grid-cols-4">
          {trustItems.map(([title, description], index) => (
            <article key={title} className="border-b border-[#AEB9B0] p-6 last:border-b-0 md:border-r md:[&:nth-child(2)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2)]:border-r xl:last:border-r-0">
              <p className="font-mono text-[0.6rem] tracking-[0.14em] text-[#6A776F]">G-{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-8 [font-family:Georgia,'Times_New_Roman',serif] text-xl text-[#153D30]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#4E5D54]">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DiagnosticOffer() {
  return (
    <section id="diagnostic" className="scroll-mt-20 bg-[#153D30] px-5 py-16 text-[#F3F4EF] sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-[88rem] gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#B9C9BF]">Diagnostic + mise en place</p>
          <h2 className="mt-7 max-w-3xl [font-family:Georgia,'Times_New_Roman',serif] text-4xl leading-tight tracking-[-0.025em] sm:text-5xl">Commençons par les dossiers qui vous prennent du temps aujourd’hui.</h2>
          <p className="mt-7 max-w-2xl text-base leading-7 text-[#D5DDD7]">Le diagnostic identifie vos trois priorités avant de demander vos coordonnées. S’il y a un vrai besoin, la mise en place est ensuite adaptée à votre fonctionnement.</p>
          <Link
            href="/diagnostic"
            className="mt-9 inline-flex min-h-12 items-center gap-4 bg-[#F3F4EF] px-6 py-3 text-sm font-bold transition hover:bg-white"
            style={{ color: INK }}
          >
            Ouvrir mon diagnostic
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="border border-[#6D887A] bg-[#1B493A] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5 border-b border-[#6D887A] pb-5">
            <div>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[#B9C9BF]">Dossier de mise en place</p>
              <p className="mt-2 [font-family:Georgia,'Times_New_Roman',serif] text-2xl">Ce qui est compris</p>
            </div>
            <span className="border border-[#C87A58] px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[#F0A17E]">Sur mesure</span>
          </div>
          <ol className="mt-2 divide-y divide-[#527061]">
            {[
              "État des lieux de votre fonctionnement",
              "Configuration de votre espace Sesira",
              "Activation des modules réellement utiles",
              "Prise en main avec votre équipe",
            ].map((item, index) => (
              <li key={item} className="grid grid-cols-[2rem_1fr] gap-3 py-4 text-sm leading-6 text-[#E2E8E3]">
                <span className="font-mono text-[0.62rem] text-[#AFC1B7]">{String(index + 1).padStart(2, "0")}</span>
                {item}
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-[#6D887A] pt-5 text-xs leading-5 text-[#B9C9BF]">Aucune intégration n’est présentée comme active avant d’être réellement connectée et vérifiée.</p>
        </div>
      </div>
    </section>
  );
}

function DiagnosticLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/diagnostic"
      className="inline-flex min-h-11 items-center gap-3 bg-[#153D30] px-4 py-2.5 text-sm font-bold transition hover:bg-[#0D3025] sm:px-5"
      style={{ color: PAPER }}
    >
      <span className={compact ? "sm:hidden" : undefined}>{compact ? "Diagnostic" : "Voir mes priorités"}</span>
      {compact ? <span className="hidden sm:inline">Faire le diagnostic</span> : null}
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
          <Link href="#parcours" className="hover:text-white">Le parcours</Link>
          <Link href="/login" className="hover:text-white">Se connecter</Link>
        </nav>
      </div>
    </footer>
  );
}
