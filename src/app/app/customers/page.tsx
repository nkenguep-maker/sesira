import { Users } from "lucide-react";

import { ModuleEmptyState } from "@/components/sesira/module-empty-state";

export default function CustomersPage() {
  return (
    <ModuleEmptyState
      icon={Users}
      eyebrow="Contexte client"
      title="Clients"
      description="Les clients associés aux demandes, devis et messages seront regroupés dans cette vue."
    />
  );
}
