import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";

export type DemoCommunication = {
  id: string;
  threadKey: string;
  customerName: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  subject: string;
  body: string;
  intent: string | null;
  confidence: number | null;
  receivedAt: string | null;
  metadata: Record<string, unknown>;
};

export async function getDemoCommunications(): Promise<DemoCommunication[]> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, customer_id, direction, status, thread_key, subject, body_text, intent, confidence, received_at, metadata, created_at")
    .eq("organization_id", DEMO_ORGANIZATION_ID)
    .contains("metadata", { demo_story_v2: true })
    .order("created_at", { ascending: false });

  if (error || !messages?.length) return [];
  const customerIds = [...new Set(messages.map((row) => row.customer_id).filter(Boolean))];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, display_name").in("id", customerIds)
    : { data: [] };
  const names = new Map((customers ?? []).map((row) => [String(row.id), String(row.display_name)]));

  return messages.map((row) => ({
    id: String(row.id),
    threadKey: String(row.thread_key ?? ""),
    customerName: names.get(String(row.customer_id)) ?? "Client fictif",
    direction: row.direction === "INBOUND" ? "INBOUND" : "OUTBOUND",
    status: String(row.status),
    subject: String(row.subject ?? "Sans objet"),
    body: String(row.body_text ?? ""),
    intent: row.intent ? String(row.intent) : null,
    confidence: typeof row.confidence === "number" ? row.confidence : row.confidence ? Number(row.confidence) : null,
    receivedAt: row.received_at ? String(row.received_at) : null,
    metadata: object(row.metadata),
  }));
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
