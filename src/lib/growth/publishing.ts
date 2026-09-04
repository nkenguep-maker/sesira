import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C31 — Growth publishing + conversations server helpers. Eight
 * SECURITY DEFINER RPCs wrapped as discriminated unions.
 *
 * AI may DRAFT content and CLASSIFY conversations, but must NEVER
 * auto-approve, auto-publish, or auto-reply. Every seam here is
 * human-gated (approver / publisher / replier must be ACTIVE org
 * member).
 *
 * mark_publication_published is the ONLY path from APPROVED →
 * PUBLISHED. Callers wire the external send (LinkedIn, X,
 * newsletter provider) BEFORE calling this RPC and pass the
 * provider's external_ref back — same discipline as C9.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type GrowthPublishingResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

// -------- Content pieces --------

export interface SubmitContentForReviewInput {
  organizationId: string;
  contentId: string;
}

export async function submitContentForReview(
  input: SubmitContentForReviewInput,
  deps: Deps = {},
): Promise<GrowthPublishingResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("submit_content_for_review", {
    target_organization_id: input.organizationId,
    target_content_id: input.contentId,
  });
  if (error) return { status: "ERROR", reason: `submit_content_for_review: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface ApproveContentPieceInput {
  organizationId: string;
  contentId: string;
  approverUserId: string;
}

export async function approveContentPiece(
  input: ApproveContentPieceInput,
  deps: Deps = {},
): Promise<GrowthPublishingResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("approve_content_piece", {
    target_organization_id: input.organizationId,
    target_content_id: input.contentId,
    target_approver_user_id: input.approverUserId,
  });
  if (error) return { status: "ERROR", reason: `approve_content_piece: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface ArchiveContentPieceInput {
  organizationId: string;
  contentId: string;
  reason: string;
}

export async function archiveContentPiece(
  input: ArchiveContentPieceInput,
  deps: Deps = {},
): Promise<GrowthPublishingResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("archive_content_piece", {
    target_organization_id: input.organizationId,
    target_content_id: input.contentId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `archive_content_piece: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- Publications --------

export type PublicationChannel =
  | "PAID_SEARCH" | "ORGANIC" | "REFERRAL" | "EMAIL"
  | "EVENT" | "WORD_OF_MOUTH" | "CONTENT" | "OTHER";

export interface SchedulePublicationInput {
  organizationId: string;
  contentId: string;
  campaignId?: string | null;
  channel: PublicationChannel;
  scheduledFor?: Date | null;
}

export type SchedulePublicationResult =
  | { status: "APPLIED"; publicationId: string }
  | { status: "ERROR"; reason: string };

export async function schedulePublication(
  input: SchedulePublicationInput,
  deps: Deps = {},
): Promise<SchedulePublicationResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("schedule_publication", {
    target_organization_id: input.organizationId,
    target_content_id: input.contentId,
    target_campaign_id: input.campaignId ?? null,
    target_channel: input.channel,
    target_scheduled_for: input.scheduledFor ? input.scheduledFor.toISOString() : null,
  });
  if (error) return { status: "ERROR", reason: `schedule_publication: ${error.message}` };
  return { status: "APPLIED", publicationId: data as string };
}

export interface MarkPublicationPublishedInput {
  organizationId: string;
  publicationId: string;
  publishedByUserId: string;
  externalRef: string;
}

export async function markPublicationPublished(
  input: MarkPublicationPublishedInput,
  deps: Deps = {},
): Promise<GrowthPublishingResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_publication_published", {
    target_organization_id: input.organizationId,
    target_publication_id: input.publicationId,
    target_published_by_user_id: input.publishedByUserId,
    target_external_ref: input.externalRef,
  });
  if (error) return { status: "ERROR", reason: `mark_publication_published: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface CancelPublicationInput {
  organizationId: string;
  publicationId: string;
  reason: string;
}

export async function cancelPublication(
  input: CancelPublicationInput,
  deps: Deps = {},
): Promise<GrowthPublishingResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("cancel_publication", {
    target_organization_id: input.organizationId,
    target_publication_id: input.publicationId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `cancel_publication: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- Conversations --------

export interface RecordConversationReplyInput {
  organizationId: string;
  conversationId: string;
  repliedByUserId: string;
}

export async function recordConversationReply(
  input: RecordConversationReplyInput,
  deps: Deps = {},
): Promise<GrowthPublishingResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_conversation_reply", {
    target_organization_id: input.organizationId,
    target_conversation_id: input.conversationId,
    target_replied_by_user_id: input.repliedByUserId,
  });
  if (error) return { status: "ERROR", reason: `record_conversation_reply: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface CloseConversationInput {
  organizationId: string;
  conversationId: string;
  reason?: string | null;
}

export async function closeConversation(
  input: CloseConversationInput,
  deps: Deps = {},
): Promise<GrowthPublishingResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("close_conversation", {
    target_organization_id: input.organizationId,
    target_conversation_id: input.conversationId,
    target_reason: input.reason ?? null,
  });
  if (error) return { status: "ERROR", reason: `close_conversation: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
