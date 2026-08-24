import type {
  GrowthContent,
  GrowthIdea,
  GrowthPublication,
  GrowthRepository,
  GrowthResult,
  GrowthSummary,
  OrganizationKnowledge,
} from "@/lib/growth/contracts";

const DEMO_GENERATED_AT = "2026-08-24T12:00:00.000Z";

const ideas: GrowthIdea[] = [
  {
    id: "demo-idea-entretien-pac",
    title: "Préparer sa pompe à chaleur avant l’hiver",
    angle: "Une liste simple des vérifications utiles avant les premiers froids.",
    reason: "Question fréquente lors des appels de maintenance.",
    suggestedChannels: ["FACEBOOK", "GOOGLE_BUSINESS", "EMAIL"],
    priority: "HIGH",
  },
  {
    id: "demo-idea-filtres",
    title: "Pourquoi nettoyer les filtres de climatisation ?",
    angle: "Expliquer les signes visibles et les gestes sans risque pour le client.",
    reason: "Sujet pédagogique adapté aux périodes de forte utilisation.",
    suggestedChannels: ["INSTAGRAM", "FACEBOOK"],
    priority: "NORMAL",
  },
  {
    id: "demo-idea-chantier",
    title: "Les étapes d’un remplacement de chaudière",
    angle: "Rassurer sur la préparation, l’intervention et la remise en service.",
    reason: "Répond à une objection courante sur la durée et l’organisation du chantier.",
    suggestedChannels: ["LINKEDIN", "EMAIL"],
    priority: "NORMAL",
  },
];

const content: GrowthContent[] = [
  {
    id: "demo-content-idea",
    title: "Bien préparer l’accès avant une intervention",
    excerpt: "Une idée à préciser avec les consignes réellement appliquées par l’équipe.",
    status: "IDEA",
    channels: ["GOOGLE_BUSINESS"],
    updatedAt: "2026-08-24T08:30:00.000Z",
    ownerLabel: null,
  },
  {
    id: "demo-content-draft",
    title: "Entretien annuel : ce que vérifie le technicien",
    excerpt: "Structure de brouillon préparée pour une relecture métier.",
    status: "DRAFT",
    channels: ["LINKEDIN", "EMAIL"],
    updatedAt: "2026-08-23T14:10:00.000Z",
    ownerLabel: "Équipe marketing",
  },
  {
    id: "demo-content-review",
    title: "Trois signes qu’une climatisation mérite un contrôle",
    excerpt: "Contenu prêt à vérifier : exactitude technique, ton et appel à l’action.",
    status: "REVIEW",
    channels: ["INSTAGRAM", "FACEBOOK"],
    updatedAt: "2026-08-22T09:45:00.000Z",
    ownerLabel: "Responsable CVC",
  },
  {
    id: "demo-content-approved",
    title: "Nos zones d’intervention autour de Lyon",
    excerpt: "Texte validé dans cet exemple, sans publication ni planification réelle.",
    status: "APPROVED",
    channels: ["GOOGLE_BUSINESS"],
    updatedAt: "2026-08-21T16:20:00.000Z",
    ownerLabel: "Direction",
  },
  {
    id: "demo-content-scheduled",
    title: "Préparer sa pompe à chaleur avant l’hiver",
    excerpt: "Exemple de contenu placé dans un calendrier de démonstration.",
    status: "SCHEDULED",
    channels: ["FACEBOOK", "EMAIL"],
    updatedAt: "2026-08-20T11:00:00.000Z",
    ownerLabel: "Équipe marketing",
  },
  {
    id: "demo-content-published",
    title: "Retour sur une installation à Villeurbanne",
    excerpt: "Exemple historique uniquement : aucune plateforme sociale n’est connectée.",
    status: "PUBLISHED",
    channels: ["LINKEDIN"],
    updatedAt: "2026-08-18T07:30:00.000Z",
    ownerLabel: "Direction",
  },
];

const publications: GrowthPublication[] = [
  {
    id: "demo-publication-facebook",
    contentTitle: "Préparer sa pompe à chaleur avant l’hiver",
    channel: "FACEBOOK",
    status: "SCHEDULED",
    publicationAt: "2026-09-02T07:30:00.000Z",
  },
  {
    id: "demo-publication-email",
    contentTitle: "Préparer sa pompe à chaleur avant l’hiver",
    channel: "EMAIL",
    status: "SCHEDULED",
    publicationAt: "2026-09-04T06:00:00.000Z",
  },
  {
    id: "demo-publication-google",
    contentTitle: "Nos zones d’intervention autour de Lyon",
    channel: "GOOGLE_BUSINESS",
    status: "SCHEDULED",
    publicationAt: "2026-09-08T09:00:00.000Z",
  },
  {
    id: "demo-publication-linkedin",
    contentTitle: "Retour sur une installation à Villeurbanne",
    channel: "LINKEDIN",
    status: "PUBLISHED",
    publicationAt: "2026-08-18T07:30:00.000Z",
  },
  {
    id: "demo-publication-instagram",
    contentTitle: "Trois signes qu’une climatisation mérite un contrôle",
    channel: "INSTAGRAM",
    status: "SCHEDULED",
    publicationAt: "2026-09-11T16:30:00.000Z",
  },
];

function demoResult<T>(data: T): GrowthResult<T> {
  return { data, source: "DEMO", generatedAt: DEMO_GENERATED_AT };
}

export function createDemoGrowthRepository({
  organizationName,
  sectorKey,
}: {
  organizationName: string;
  sectorKey: string;
}): GrowthRepository {
  const knowledge: OrganizationKnowledge = {
    organizationName,
    sectorLabel: sectorKey === "CVC" ? "Chauffage et climatisation" : sectorKey,
    services: ["Installation de pompes à chaleur", "Entretien", "Dépannage"],
    locations: ["Lyon", "Villeurbanne", "Métropole de Lyon"],
    tone: ["Clair", "Rassurant", "Concret"],
    certifications: ["À confirmer par votre équipe"],
    differentiators: ["Interlocuteur local", "Explications avant intervention"],
    approvedClaims: ["Devis expliqué avant validation"],
    prohibitedClaims: ["Économies garanties", "Intervention immédiate partout"],
    commonQuestions: ["Combien de temps dure l’intervention ?", "Quel entretien prévoir ?"],
    commonObjections: ["Le chantier va-t-il interrompre le chauffage ?", "Le prix peut-il évoluer ?"],
  };

  const summary: GrowthSummary = {
    ideasToPrepare: ideas.length,
    contentToReview: content.filter((item) => item.status === "REVIEW").length,
    plannedPublications: publications.filter((item) => item.status === "SCHEDULED").length,
  };

  return {
    async getSummary() {
      return demoResult(summary);
    },
    async listIdeas() {
      return demoResult(ideas);
    },
    async listContent() {
      return demoResult(content);
    },
    async listPublications() {
      return demoResult(publications);
    },
    async getOrganizationKnowledge() {
      return demoResult(knowledge);
    },
  };
}
