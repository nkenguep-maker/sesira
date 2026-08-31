import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  ["/control", "Vue d’ensemble"],
  ["/control/organizations", "Organisations"],
  ["/control/runs", "Exécutions"],
  ["/control/ai-runs", "Traitements Sesira"],
  ["/control/incidents", "Incidents"],
  ["/control/integrations", "Intégrations"],
] as const;

export function ControlCenterShell({ children }: { children: ReactNode }) {
  return <div className="control-shell"><header className="control-header"><div><Link href="/control" className="control-brand">SESIRA<span>.</span></Link><span className="control-internal">INTERNE</span></div><nav aria-label="Navigation du centre de contrôle">{navigation.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav><span className="sr-only">LECTURE SEULE</span></header><main className="control-main">{children}</main></div>;
}
