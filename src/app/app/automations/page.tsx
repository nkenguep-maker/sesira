import { Bot } from "lucide-react";

import { ModuleEmptyState } from "@/components/sesira/module-empty-state";

export default function AutomationsPage() {
  return (
    <ModuleEmptyState
      icon={Bot}
      eyebrow="Contrôle"
      title="Automatisations"
      description="Les automatisations démarrent en observation. Les niveaux Shadow, Validation et Automatique seront activés explicitement."
    />
  );
}
