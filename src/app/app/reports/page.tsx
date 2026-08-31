import { FileClock } from "lucide-react";

import { EmptyState } from "@/components/sesira/empty-state";
import { PageHeader } from "@/components/sesira/page-header";

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Historique"
        title="Rapports"
        description="Les instantanés hebdomadaires et exports confirmés de votre activité."
      />
      <section className="mt-6 border border-[var(--border)] bg-[var(--panel)]">
        <EmptyState
          contained={false}
          icon={FileClock}
          title="Aucun rapport disponible."
          description="Le serveur n’expose pas encore de rapport hebdomadaire. Aucun document ni résultat historique n’est simulé."
        />
      </section>
    </div>
  );
}
