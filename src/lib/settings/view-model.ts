export type SettingsRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";

export type SettingsMember = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  isCurrentViewer: boolean;
};

export type IntegrationRecord = {
  id: string;
  provider: string;
  type: string;
  status: string;
  connected_at: string | null;
  last_sync_at: string | null;
};

export type SettingsConnection = {
  key: "microsoft-365" | "gmail" | "crm" | "calendar";
  title: string;
  description: string;
  status: string;
  tone: "emerald" | "amber" | "slate";
  lastSync: string | null;
  hasRecord: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MANAGER: "Responsable",
  MEMBER: "Membre",
};

const MEMBER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  INVITED: "Invitation envoyée",
  SUSPENDED: "Suspendu",
};

const CONNECTION_STATUS: Record<string, { label: string; tone: SettingsConnection["tone"] }> = {
  CONNECTED: { label: "Connecté", tone: "emerald" },
  CONNECTING: { label: "Connexion en cours", tone: "amber" },
  DEGRADED: { label: "À vérifier", tone: "amber" },
  EXPIRED: { label: "À reconnecter", tone: "amber" },
  FAILED: { label: "Connexion en échec", tone: "amber" },
  PAUSED: { label: "En pause", tone: "amber" },
  DISCONNECTED: { label: "Non connecté", tone: "slate" },
};

const CONNECTION_CATALOG = [
  {
    key: "microsoft-365" as const,
    title: "Microsoft 365",
    description: "Messagerie et environnement Microsoft.",
    matches: (item: IntegrationRecord) => item.provider.toLowerCase().includes("microsoft"),
  },
  {
    key: "gmail" as const,
    title: "Gmail",
    description: "Messagerie Google de votre entreprise.",
    matches: (item: IntegrationRecord) => {
      const provider = item.provider.toLowerCase();
      return provider.includes("gmail") || (provider.includes("google") && item.type.toUpperCase() === "EMAIL");
    },
  },
  {
    key: "crm" as const,
    title: "CRM",
    description: "Synchronisation avec votre outil client.",
    matches: (item: IntegrationRecord) => item.type.toUpperCase() === "CRM",
  },
  {
    key: "calendar" as const,
    title: "Calendrier",
    description: "Accès aux rendez-vous et disponibilités.",
    matches: (item: IntegrationRecord) => item.type.toUpperCase() === "CALENDAR",
  },
] as const;

export function canManageOrganization(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function formatMemberRole(role: string): string {
  return ROLE_LABELS[role] ?? "Membre";
}

export function formatMemberStatus(status: string): string {
  return MEMBER_STATUS_LABELS[status] ?? "État inconnu";
}

export function buildSettingsConnections(records: IntegrationRecord[]): SettingsConnection[] {
  return CONNECTION_CATALOG.map((definition) => {
    const record = records.find(definition.matches);
    const presentation = record
      ? CONNECTION_STATUS[record.status] ?? { label: "État à vérifier", tone: "amber" as const }
      : CONNECTION_STATUS.DISCONNECTED;

    return {
      key: definition.key,
      title: definition.title,
      description: definition.description,
      status: presentation.label,
      tone: presentation.tone,
      lastSync: record?.last_sync_at ?? null,
      hasRecord: Boolean(record),
    };
  });
}
