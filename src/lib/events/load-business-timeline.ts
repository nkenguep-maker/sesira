import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BusinessEvent, BusinessTimelineScope } from "@/lib/events/business-timeline";
import type { Database, Json } from "@/types/database";

type TimelineData = {
  events: BusinessEvent[];
  actorNames: Record<string, string>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loadBusinessTimeline(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  scopes: BusinessTimelineScope[],
  limit = 40,
): Promise<TimelineData> {
  const normalizedScopes = scopes
    .map((scope) => ({ ...scope, entityIds: [...new Set(scope.entityIds.filter(Boolean))] }))
    .filter((scope) => scope.entityIds.length > 0);

  if (!normalizedScopes.length) {
    return { events: [], actorNames: {} };
  }

  const results = await Promise.all(
    normalizedScopes.map((scope) =>
      supabase
        .from("events")
        .select("id, organization_id, type, entity_type, entity_id, source, payload, created_at")
        .eq("organization_id", organizationId)
        .eq("entity_type", scope.entityType)
        .in("entity_id", scope.entityIds)
        .order("created_at", { ascending: false })
        .limit(limit),
    ),
  );

  if (results.some((result) => result.error)) {
    throw new Error("Impossible de charger le journal d’activité.");
  }

  const events = results
    .flatMap((result) => result.data ?? [])
    .filter((event) => event.organization_id === organizationId)
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, limit) as BusinessEvent[];
  const actorIds = [...new Set(events.map(readActorId).filter((id): id is string => Boolean(id && uuidPattern.test(id))))];

  if (!actorIds.length) {
    return { events, actorNames: {} };
  }

  const membersResult = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("user_id", actorIds);

  if (membersResult.error) {
    throw new Error("Impossible de charger les auteurs du journal d’activité.");
  }

  const memberIds = (membersResult.data ?? []).map((member) => member.user_id);
  if (!memberIds.length) {
    return { events, actorNames: {} };
  }

  const profilesResult = await supabase.from("profiles").select("id, full_name").in("id", memberIds);
  if (profilesResult.error) {
    throw new Error("Impossible de charger les auteurs du journal d’activité.");
  }

  return {
    events,
    actorNames: Object.fromEntries(
      (profilesResult.data ?? [])
        .filter((profile) => Boolean(profile.full_name))
        .map((profile) => [profile.id, profile.full_name as string]),
    ),
  };
}

function readActorId(event: { payload: Json }): string | undefined {
  const payload = event.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  return typeof payload.actor_id === "string" ? payload.actor_id : undefined;
}
