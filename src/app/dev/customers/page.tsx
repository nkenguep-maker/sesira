import { notFound } from "next/navigation";

import { CustomerListScreen, type CustomerListItem } from "@/components/customers/customer-list-screen";
import { AppShell } from "@/components/sesira/app-shell";

const demoCustomers: CustomerListItem[] = [
  {
    id: "demo-amina",
    type: "PERSON",
    display_name: "Amina Diallo",
    company_name: "Studio Noma",
    email: "amina@studionoma.fr",
    phone: "+33 6 12 34 56 78",
    created_at: "2026-08-22T09:20:00.000Z",
  },
  {
    id: "demo-horizon",
    type: "COMPANY",
    display_name: "Thomas Martin",
    company_name: "Atelier Horizon",
    email: "contact@atelier-horizon.fr",
    phone: "+33 1 84 80 20 10",
    created_at: "2026-08-19T14:10:00.000Z",
  },
  {
    id: "demo-ines",
    type: "PERSON",
    display_name: "Inès Robert",
    company_name: null,
    email: "ines.robert@exemple.fr",
    phone: null,
    created_at: "2026-08-12T07:45:00.000Z",
  },
  {
    id: "demo-kanso",
    type: "COMPANY",
    display_name: "Marc Leroy",
    company_name: "Kanso Conseil",
    email: null,
    phone: "+33 4 90 22 31 48",
    created_at: "2026-07-28T16:30:00.000Z",
  },
];

export default function CustomerVisualPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <AppShell
      viewer={{
        userId: "visual-preview",
        email: "preview@sesira.local",
        role: "OWNER",
        organization: {
          id: "visual-preview",
          name: "Maison Papyrus",
          sectorKey: "general",
          status: "ACTIVE",
        },
      }}
    >
      <CustomerListScreen customers={demoCustomers} stats={{ total: 84, companies: 31, recent: 12 }} />
    </AppShell>
  );
}
