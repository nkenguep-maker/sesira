import { Settings } from "lucide-react";

import { ModuleEmptyState } from "@/components/sesira/module-empty-state";

export default function SettingsPage() {
  return (
    <ModuleEmptyState
      icon={Settings}
      eyebrow="Configuration"
      title="Réglages"
      description="Le profil métier, le catalogue de services, les membres et les connexions seront configurés ici."
    />
  );
}
