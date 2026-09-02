import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C16 — bootstrap a new organization + owner membership atomically.
 *
 * The RPC `create_organization_with_owner` runs as SECURITY DEFINER
 * and re-enforces that the caller's auth.uid() matches
 * `ownerUserId`. This wrapper adds:
 *   * a discriminated result surface for the calling server action;
 *   * a stable slug normalization step (server-side validation is
 *     authoritative but the client's proposal is normalized so the
 *     RPC does not reject on whitespace).
 */

export interface CreateOrganizationInput {
  name: string;
  sectorKey: string;
  slug: string;
  ownerUserId: string;
  client?: SupabaseClient<Database>;
}

export type CreateOrganizationResult =
  | {
      status: "CREATED";
      organizationId: string;
      membershipId: string;
    }
  | { status: "ERROR"; reason: string };

export async function createOrganizationWithOwner(
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  const supabase = input.client ?? (await createClient());
  const normalizedSlug = input.slug.trim().toLowerCase();
  const { data, error } = await supabase.rpc("create_organization_with_owner", {
    target_name: input.name.trim(),
    target_sector_key: input.sectorKey.trim(),
    target_slug: normalizedSlug,
    target_owner_user_id: input.ownerUserId,
  });
  if (error) return { status: "ERROR", reason: `create_organization_with_owner: ${error.message}` };
  const row = Array.isArray(data) ? data[0] : (data as { organization_id?: unknown; membership_id?: unknown } | null);
  if (!row || typeof row.organization_id !== "string" || typeof row.membership_id !== "string") {
    return { status: "ERROR", reason: "create_organization_with_owner returned malformed row" };
  }
  return {
    status: "CREATED",
    organizationId: row.organization_id,
    membershipId: row.membership_id,
  };
}
