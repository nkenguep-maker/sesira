import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/app/settings/actions", () => ({
  updateOrganizationSettingsAction: vi.fn(),
}));

import { SettingsScreen } from "@/components/settings/settings-screen";
import { buildSettingsConnections } from "@/lib/settings/view-model";

const organization = {
  name: "Clima Rhône",
  sectorKey: "CVC",
  status: "ACTIVE",
  timezone: "Europe/Paris",
  language: "fr",
  currency: "EUR",
};

describe("SettingsScreen", () => {
  it("renders the six canonical settings sections", () => {
    const html = renderToStaticMarkup(
      <SettingsScreen organization={organization} members={[]} connections={buildSettingsConnections([])} canManage />,
    );

    for (const title of ["ENTREPRISE", "ÉQUIPE", "CONNEXIONS", "NOTIFICATIONS", "DONNÉES", "FACTURATION"]) {
      expect(html).toContain(title);
    }
    expect(html).toContain("Toutes les modifications sont enregistrées");
  });

  it("shows real members and permission restrictions", () => {
    const html = renderToStaticMarkup(
      <SettingsScreen
        organization={organization}
        members={[{
          id: "member-1",
          name: "Sophie Lefèvre",
          email: "sophie@clima-rhone.example",
          role: "MEMBER",
          status: "ACTIVE",
          isCurrentViewer: true,
        }]}
        connections={buildSettingsConnections([])}
        canManage={false}
      />,
    );

    expect(html).toContain("Sophie Lefèvre");
    expect(html).toContain("Membre");
    expect(html).toContain("Seuls le propriétaire et les administrateurs");
  });

  it("never fakes integrations, notification preferences, deletion or billing", () => {
    const html = renderToStaticMarkup(
      <SettingsScreen organization={organization} members={[]} connections={buildSettingsConnections([])} canManage />,
    );

    expect(html.match(/Non connecté/g)).toHaveLength(4);
    expect(html).toContain("Préférences non enregistrables");
    expect(html).toContain("Rien n’est supprimé ici");
    expect(html).toContain("Pas de facturation active");
    expect(html).not.toContain("Stripe");
  });
});
