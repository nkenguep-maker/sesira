import "server-only";

import { safeClient } from "@/lib/data/safe-client";

export type CustomerListRow = {
  id: string;
  displayName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  type: string;
  updatedAt: string;
};

export async function getCustomerList(
  organizationId: string,
  options: { limit?: number } = {},
): Promise<CustomerListRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("id, display_name, company_name, email, phone, type, updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(Math.min(options.limit ?? 100, 500));
  if (error) {
    console.error("[lib/data] getCustomerList:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    companyName: row.company_name,
    email: row.email,
    phone: row.phone,
    type: row.type,
    updatedAt: row.updated_at,
  }));
}

export type QuoteListRow = {
  id: string;
  reference: string | null;
  title: string;
  amount: number | null;
  currency: string;
  status: string;
  sentAt: string | null;
  nextActionAt: string | null;
  updatedAt: string;
};

export async function getQuoteList(
  organizationId: string,
  options: { limit?: number } = {},
): Promise<QuoteListRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("quotes")
    .select("id, reference, title, amount, currency, status, sent_at, next_action_at, updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(Math.min(options.limit ?? 100, 500));
  if (error) {
    console.error("[lib/data] getQuoteList:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    title: row.title,
    amount: row.amount === null ? null : Number(row.amount),
    currency: row.currency,
    status: row.status,
    sentAt: row.sent_at,
    nextActionAt: row.next_action_at,
    updatedAt: row.updated_at,
  }));
}

export type OrganizationMemberRow = {
  id: string;
  userId: string;
  fullName: string | null;
  role: string;
  status: string;
  createdAt: string;
};

export async function getOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMemberRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const membersResult = await supabase
    .from("organization_members")
    .select("id, user_id, role, status, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (membersResult.error) {
    console.error("[lib/data] getOrganizationMembers:", membersResult.error.message);
    return [];
  }
  const members = membersResult.data ?? [];
  const userIds = members.map((member) => member.user_id);
  const profilesResult = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [], error: null };
  const profileById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name] as const),
  );
  return members.map((member) => ({
    id: member.id,
    userId: member.user_id,
    fullName: profileById.get(member.user_id) ?? null,
    role: member.role,
    status: member.status,
    createdAt: member.created_at,
  }));
}

export type OrganizationSettingsRow = {
  name: string;
  sectorKey: string;
  status: string;
  timezone: string;
  language: string;
  currency: string;
};

export async function getOrganizationSettings(
  organizationId: string,
): Promise<OrganizationSettingsRow | null> {
  const supabase = await safeClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("organizations")
    .select("name, sector_key, status, timezone, language, currency")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) {
    console.error("[lib/data] getOrganizationSettings:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    name: data.name,
    sectorKey: data.sector_key,
    status: data.status,
    timezone: data.timezone,
    language: data.language,
    currency: data.currency,
  };
}
