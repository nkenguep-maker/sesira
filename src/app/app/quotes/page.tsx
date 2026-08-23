import { FileText } from "lucide-react";

import { ModuleEmptyState } from "@/components/sesira/module-empty-state";

export default function QuotesPage() {
  return (
    <ModuleEmptyState
      icon={FileText}
      eyebrow="Suivi commercial"
      title="Devis"
      description="Importez des devis pour que Sesira puisse surveiller leurs échéances et préparer les prochaines actions."
    />
  );
}
