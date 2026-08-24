import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CustomerListScreen } from "@/components/customers/customer-list-screen";
import { QuoteListScreen } from "@/components/quotes/quote-list-screen";
import { RequestListScreen } from "@/components/requests/request-list-screen";

const customer = {
  id: "10000000-0000-4000-8000-000000000001",
  type: "COMPANY",
  display_name: `Clima ${"Rhône ".repeat(40)}`,
  company_name: "Clima Rhône",
  email: "contact@clima-rhone.example",
  phone: null,
  created_at: "2026-08-24T10:15:30.123Z",
};

describe("core product list states", () => {
  it("distinguishes an empty customer list from search with no result", () => {
    const empty = renderToStaticMarkup(
      <CustomerListScreen customers={[]} stats={{ total: 0, companies: 0, recent: 0 }} />,
    );
    const noResult = renderToStaticMarkup(
      <CustomerListScreen
        customers={[]}
        stats={{ total: 12, companies: 4, recent: 2 }}
        query="introuvable"
      />,
    );

    expect(empty).toContain("Votre portefeuille client est vide.");
    expect(noResult).toContain("Aucun client ne correspond à ces filtres.");
    expect(noResult).toContain("Réinitialiser");
  });

  it("preserves filters in pagination and safely truncates long customer names", () => {
    const html = renderToStaticMarkup(
      <CustomerListScreen
        customers={[customer]}
        stats={{ total: 30, companies: 20, recent: 3 }}
        query="Clima Rhône"
        type="COMPANY"
        nextCursor="opaque_cursor"
      />,
    );

    expect(html).toContain("q=Clima+Rh%C3%B4ne");
    expect(html).toContain("type=COMPANY");
    expect(html).toContain("cursor=opaque_cursor");
    expect(html).toContain("truncate");
    expect(html).toContain("lg:grid");
  });

  it("renders request empty and no-result states", () => {
    const empty = renderToStaticMarkup(
      <RequestListScreen requests={[]} stats={{ total: 0, new: 0, needsInfo: 0, ready: 0 }} />,
    );
    const noResult = renderToStaticMarkup(
      <RequestListScreen
        requests={[]}
        stats={{ total: 10, new: 2, needsInfo: 1, ready: 3 }}
        status="READY"
      />,
    );

    expect(empty).toContain("Aucune demande pour le moment.");
    expect(noResult).toContain("Aucune demande ne correspond à ces filtres.");
  });

  it("keeps a very large quote amount prominent in the responsive layout", () => {
    const html = renderToStaticMarkup(
      <QuoteListScreen
        quotes={[
          {
            id: "20000000-0000-4000-8000-000000000001",
            title: "Installation complète",
            reference: "DEV-999",
            amount: 999_999_999_999.99,
            currency: "EUR",
            status: "SENT",
            owner_user_id: null,
            owner_name: null,
            sent_at: "2026-08-24T10:15:30.123Z",
            expires_at: null,
            next_action_at: null,
            created_at: "2026-08-24T10:15:30.123Z",
            customers: { id: customer.id, display_name: customer.display_name, company_name: customer.company_name },
            requests: null,
          },
        ]}
        stats={{ total: 1, drafts: 0, following: 1, won: 0 }}
      />,
    );

    expect(html).toContain("999");
    expect(html).toContain("font-semibold");
    expect(html).toContain("xl:hidden");
    expect(html).toContain("truncate");
  });

  it("renders the quote no-results state separately", () => {
    const html = renderToStaticMarkup(
      <QuoteListScreen
        quotes={[]}
        stats={{ total: 4, drafts: 1, following: 2, won: 1 }}
        query="aucun"
      />,
    );

    expect(html).toContain("Aucun devis ne correspond à ces filtres.");
  });
});
