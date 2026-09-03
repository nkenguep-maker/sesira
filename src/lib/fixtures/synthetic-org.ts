import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

/**
 * C17 — synthetic organization builder for local dev, staging demos,
 * observability queries, and integration tests. NEVER meant for
 * production data seeding; the helper uses `createServiceClient`
 * and can therefore bypass RLS — do not expose it to a route
 * handler.
 *
 * Design decisions:
 *   * Deterministic given a `seed`. Two calls with the same seed
 *     produce the same rows, so a snapshot test can assert stable
 *     ids / counts.
 *   * All ids are derived from the seed via a mulberry32 PRNG; no
 *     `crypto.randomUUID()` so tests are reproducible.
 *   * Uses direct INSERTs on `customers`, `quotes`, `automation_configs`,
 *     `automation_runs`, `outbound_messages`, `messages`,
 *     `attention_items`, `ai_runs`, `incidents`. This bypasses the
 *     per-entity RPCs (which enforce membership) because the builder
 *     is boot-strapping the org and there is no authenticated user
 *     yet.
 *   * The `organizations` row + owner membership are inserted
 *     directly rather than via `create_organization_with_owner`
 *     (which requires an authenticated caller). A synthetic org's
 *     "owner" is a UUID that need not exist in `auth.users`.
 */

export interface SyntheticOrgSpec {
  seed: number;
  ownerUserId: string;
  namePrefix?: string;
  customerCount?: number;
  quoteCount?: number;
  automationEnabled?: boolean;
  automationLevel?: "OBSERVATION" | "SHADOW" | "APPROVAL" | "AUTOMATIC";
  client?: SupabaseClient<Database>;
}

export interface SyntheticOrgResult {
  organizationId: string;
  ownerUserId: string;
  customerIds: string[];
  quoteIds: string[];
  automationConfigId: string | null;
}

export async function createSyntheticOrganization(
  spec: SyntheticOrgSpec,
): Promise<SyntheticOrgResult> {
  const supabase = spec.client ?? createServiceClient();

  const rng = mulberry32(spec.seed);
  const namePrefix = spec.namePrefix ?? "Synthetic";
  const orgSuffix = Math.floor(rng() * 1_000_000).toString(16).padStart(6, "0");
  const orgUuid = deterministicUuid(rng);

  // 1. Organization.
  const orgInsert = await supabase
    .from("organizations")
    .insert({
      id: orgUuid,
      name: `${namePrefix} Org ${orgSuffix}`,
      slug: `synth-${orgSuffix}`,
      sector_key: "generic",
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (orgInsert.error) {
    throw new Error(`createSyntheticOrganization: organization insert failed: ${orgInsert.error.message}`);
  }
  const organizationId = (orgInsert.data as { id: string }).id;

  // 2. Owner membership.
  await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: spec.ownerUserId,
    role: "OWNER",
    status: "ACTIVE",
  });

  // 3. Customers.
  const customerCount = clamp(spec.customerCount ?? 10, 1, 500);
  const customerRows = Array.from({ length: customerCount }, (_, i) => ({
    id: deterministicUuid(rng),
    organization_id: organizationId,
    type: rng() > 0.7 ? "COMPANY" : "PERSON",
    display_name: `Synthetic Customer ${i + 1}`,
    company_name: rng() > 0.5 ? `Synth Company ${i + 1}` : null,
    email: `customer-${i + 1}@synth.example`,
    external_provider: "synthetic",
    external_id: `synth-cust-${orgSuffix}-${i + 1}`,
  }));
  const customerInsert = await supabase
    .from("customers")
    .insert(customerRows)
    .select("id");
  if (customerInsert.error) {
    throw new Error(`createSyntheticOrganization: customers insert failed: ${customerInsert.error.message}`);
  }
  const customerIds = (customerInsert.data as Array<{ id: string }>).map((r) => r.id);

  // 4. Quotes.
  const quoteCount = clamp(spec.quoteCount ?? Math.min(20, customerCount), 0, 1000);
  const quoteIds: string[] = [];
  if (quoteCount > 0) {
    const quoteRows = Array.from({ length: quoteCount }, (_, i) => ({
      id: deterministicUuid(rng),
      organization_id: organizationId,
      customer_id: customerIds[i % customerIds.length],
      title: `Synthetic Quote ${i + 1}`,
      amount: Math.floor(500 + rng() * 4500),
      status: "DRAFT",
    }));
    const quotesInsert = await supabase.from("quotes").insert(quoteRows).select("id");
    if (quotesInsert.error) {
      throw new Error(`createSyntheticOrganization: quotes insert failed: ${quotesInsert.error.message}`);
    }
    for (const row of quotesInsert.data as Array<{ id: string }>) {
      quoteIds.push(row.id);
    }
    // Transition ~60% of quotes to SENT (state-machine trigger no-ops
    //   for service_role, so this direct UPDATE is valid).
    const toSend = quoteIds.slice(0, Math.floor(quoteIds.length * 0.6));
    if (toSend.length > 0) {
      await supabase.from("quotes")
        .update({ status: "SENT", sent_at: new Date().toISOString() })
        .in("id", toSend);
    }
  }

  // 5. Automation config.
  let automationConfigId: string | null = null;
  if (spec.automationEnabled ?? true) {
    const cfgInsert = await supabase
      .from("automation_configs")
      .insert({
        id: deterministicUuid(rng),
        organization_id: organizationId,
        template_key: "quote_followup_schedule",
        template_version: 1,
        enabled: true,
        level: spec.automationLevel ?? "SHADOW",
      })
      .select("id")
      .single();
    if (cfgInsert.error) {
      throw new Error(`createSyntheticOrganization: automation_config insert failed: ${cfgInsert.error.message}`);
    }
    automationConfigId = (cfgInsert.data as { id: string }).id;
  }

  return {
    organizationId,
    ownerUserId: spec.ownerUserId,
    customerIds,
    quoteIds,
    automationConfigId,
  };
}

// =========================================================================
// Deterministic helpers
// =========================================================================

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicUuid(rng: () => number): string {
  // RFC 4122 v4-shaped, deterministic — bytes drawn from the PRNG.
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(rng() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
