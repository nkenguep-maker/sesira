export const GROWTH_CONTENT_STATUSES = [
  "IDEA",
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
] as const;

export const GROWTH_CHANNELS = [
  "LINKEDIN",
  "FACEBOOK",
  "INSTAGRAM",
  "GOOGLE_BUSINESS",
  "EMAIL",
] as const;

export type GrowthContentStatus = (typeof GROWTH_CONTENT_STATUSES)[number];
export type GrowthChannel = (typeof GROWTH_CHANNELS)[number];
export type GrowthDataSource = "DEMO" | "CORE";

export type GrowthResult<T> = {
  data: T;
  source: GrowthDataSource;
  generatedAt: string;
};

export type GrowthSummary = {
  ideasToPrepare: number;
  contentToReview: number;
  plannedPublications: number;
};

export type GrowthIdea = {
  id: string;
  title: string;
  angle: string;
  reason: string;
  suggestedChannels: GrowthChannel[];
  priority: "NORMAL" | "HIGH";
};

export type GrowthContent = {
  id: string;
  title: string;
  excerpt: string;
  status: GrowthContentStatus;
  channels: GrowthChannel[];
  updatedAt: string;
  ownerLabel: string | null;
};

export type GrowthPublication = {
  id: string;
  contentTitle: string;
  channel: GrowthChannel;
  status: Extract<GrowthContentStatus, "SCHEDULED" | "PUBLISHED">;
  publicationAt: string;
};

export type OrganizationKnowledge = {
  organizationName: string;
  sectorLabel: string;
  services: string[];
  locations: string[];
  tone: string[];
  certifications: string[];
  differentiators: string[];
  approvedClaims: string[];
  prohibitedClaims: string[];
  commonQuestions: string[];
  commonObjections: string[];
};

export type GrowthRepository = {
  getSummary(): Promise<GrowthResult<GrowthSummary>>;
  listIdeas(): Promise<GrowthResult<GrowthIdea[]>>;
  listContent(): Promise<GrowthResult<GrowthContent[]>>;
  listPublications(): Promise<GrowthResult<GrowthPublication[]>>;
  getOrganizationKnowledge(): Promise<GrowthResult<OrganizationKnowledge>>;
};
