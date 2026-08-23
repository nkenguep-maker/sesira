import { Inbox } from "lucide-react";

import { ModuleEmptyState } from "@/components/sesira/module-empty-state";

export default function RequestsPage() {
  return (
    <ModuleEmptyState
      icon={Inbox}
      eyebrow="Flux entrant"
      title="Demandes"
      description="Quand Sesira recevra ou importera une nouvelle demande, elle sera normalisée et affichée ici."
    />
  );
}
