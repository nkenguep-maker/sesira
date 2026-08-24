import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/sesira/empty-state";
import { PageHeader } from "@/components/sesira/page-header";

export function ModuleEmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow={eyebrow} title={title} />
      <section className="mt-10">
        <EmptyState icon={Icon} title="Aucune donnée pour le moment." description={description} />
      </section>
    </div>
  );
}
