import { z } from "zod";

const moneyValueSchema = z.union([z.number(), z.string()]).nullable();

const proposalOptionSchema = z.object({
  id: z.string().uuid(),
  option_key: z.string().min(1),
  name: z.string().min(1),
  amount: moneyValueSchema,
  currency: z.string().length(3),
  status: z.enum(["PROPOSED", "INCLUDED", "EXCLUDED", "REJECTED"]),
  ordinal: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const proposalVariantSchema = z.object({
  quote_id: z.string().uuid(),
  reference: z.string().nullable(),
  title: z.string().min(1),
  amount: moneyValueSchema,
  currency: z.string().length(3),
  variant_key: z.string().min(1),
  revision: z.number().int().positive(),
  expires_at: z.string().nullable(),
  order: z.number().int().nonnegative(),
  recommended: z.boolean(),
  options: z.array(proposalOptionSchema),
});

export const proposalSnapshotSchema = z.object({
  proposal: z.object({
    anchor_quote_id: z.string().uuid(),
    opportunity_id: z.string().uuid().nullable(),
    reference: z.string().nullable(),
    title: z.string().min(1),
  }),
  customer: z.object({
    id: z.string().uuid(),
    display_name: z.string().min(1),
    company_name: z.string().nullable(),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
  }),
  variants: z.array(proposalVariantSchema).min(1).max(5),
  approved_at: z.string().min(1),
});

export type ProposalSnapshot = z.infer<typeof proposalSnapshotSchema>;
export type ProposalSnapshotVariant = z.infer<typeof proposalVariantSchema>;
export type ProposalSnapshotOption = z.infer<typeof proposalOptionSchema>;

export function parseProposalSnapshot(value: unknown): ProposalSnapshot {
  return proposalSnapshotSchema.parse(value);
}

export function safeParseProposalSnapshot(
  value: unknown,
): { success: true; data: ProposalSnapshot } | { success: false; reason: string } {
  const result = proposalSnapshotSchema.safeParse(value);
  if (!result.success) {
    return { success: false, reason: result.error.issues[0]?.message ?? "invalid snapshot" };
  }
  return { success: true, data: result.data };
}
