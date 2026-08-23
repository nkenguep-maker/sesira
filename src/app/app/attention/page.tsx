import { CheckCircle2 } from "lucide-react";

import { ModuleEmptyState } from "@/components/sesira/module-empty-state";

export default function AttentionPage() {
  return (
    <ModuleEmptyState
      icon={CheckCircle2}
      eyebrow="Décisions humaines"
      title="À traiter"
      description="Les objections, demandes inhabituelles, erreurs d’intégration et décisions sensibles apparaîtront ici."
    />
  );
}
