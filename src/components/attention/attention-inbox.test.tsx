import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AttentionInboxItem } from "@/lib/attention/view-model";

import { AttentionInbox } from "./attention-inbox";

vi.mock("@/app/app/attention/actions", () => ({
  closeAttentionItemAction: async () => ({}),
}));

const item: AttentionInboxItem = {
  id: "10000000-0000-4000-8000-000000000001",
  category: "SALES",
  priority: "URGENT",
  status: "OPEN",
  title: "Le client demande un geste sur le prix.",
  explanation: "Le devis doit être revu par votre équipe avant toute réponse.",
  suggested_action: "Consultez le devis puis rappelez le client.",
  due_at: "2099-08-24T09:00:00.000Z",
  created_at: "2026-08-23T09:00:00.000Z",
  resolved_at: null,
  assigneeName: "Lina Martin",
  entity: {
    type: "quote",
    label: "Pompe à chaleur",
    detail: "Maison Martin",
    amount: "18 450 €",
    href: "/app/quotes/20000000-0000-4000-8000-000000000002",
  },
};

describe("AttentionInbox", () => {
  it("renders the decision context, related entity and safe actions", () => {
    const html = renderToStaticMarkup(
      <AttentionInbox
        items={[item]}
        view="open"
        stats={{ open: 1, urgent: 1, due: 0, resolved: 0 }}
      />,
    );

    expect(html).toContain("Le client demande un geste sur le prix.");
    expect(html).toContain("Pourquoi Sesira vous le montre");
    expect(html).toContain("Ce que vous pouvez faire");
    expect(html).toContain("18 450 €");
    expect(html).toContain("Voir le devis");
    expect(html).toContain("Résoudre");
    expect(html).toContain("Ignorer");
    expect(html).toContain("xl:grid-cols-");
  });

  it("renders an empty resolved view without mutation controls", () => {
    const html = renderToStaticMarkup(
      <AttentionInbox
        items={[]}
        view="resolved"
        stats={{ open: 0, urgent: 0, due: 0, resolved: 0 }}
      />,
    );

    expect(html).toContain("Aucune décision terminée pour le moment.");
    expect(html).not.toContain("Résoudre");
    expect(html).not.toContain("Ignorer");
  });
});
