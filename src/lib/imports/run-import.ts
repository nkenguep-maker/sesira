import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseCsv } from "@/lib/imports/parse-csv";
import { customerRowSchema, isImportKind, type ImportKind } from "@/lib/imports/schemas";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C16 — CSV import orchestrator.
 *
 * Flow for the currently-supported `customers` kind:
 *
 *   1. `record_import_started` → returns import_id (RUNNING).
 *   2. Parse the CSV. Parser errors are recorded as
 *      `record_import_row_error` on the offending row index.
 *   3. For each parsed row: validate via Zod. On validation error,
 *      `record_import_row_error`. On success, INSERT the customer
 *      via a scoped SELECT-then-INSERT that respects the existing
 *      unique (organization_id, external_provider, external_id)
 *      identity, and `record_import_row_ok` with the resulting id.
 *   4. `finalize_import` (COMPLETED / PARTIAL / FAILED) — the RPC
 *      recomputes counts from `import_rows` so a caller crash
 *      between steps 3 and 4 still yields a defensible summary
 *      when finalized later.
 *
 * The orchestrator is deliberately conservative:
 *   * No BULK INSERT — one insert per row keeps errors localized.
 *   * No RPC concurrency — sequential per-row processing so an
 *     early PERMANENT error surfaces before the whole file is
 *     partially applied. A future optimization can add controlled
 *     concurrency once the surface stabilizes.
 *   * No provider effect (this is a bulk write, not an outbound).
 */

export type RunImportInput = {
  organizationId: string;
  kind: ImportKind;
  csvText: string;
  sourceFilename: string;
  initiatorUserId: string;
  sourceSizeBytes?: number;
  client?: SupabaseClient<Database>;
};

export type RunImportResult =
  | {
      status: "COMPLETED" | "PARTIAL" | "FAILED";
      importId: string;
      okCount: number;
      errorCount: number;
    }
  | { status: "REJECTED"; reason: string };

export async function runImport(input: RunImportInput): Promise<RunImportResult> {
  if (!isImportKind(input.kind)) {
    return { status: "REJECTED", reason: `unsupported import kind: ${input.kind}` };
  }
  if (input.kind !== "customers") {
    return { status: "REJECTED", reason: `V1 import supports only customers (got ${input.kind})` };
  }

  const supabase = input.client ?? (await createClient());

  const startedRpc = await supabase.rpc("record_import_started", {
    target_organization_id: input.organizationId,
    target_kind: input.kind,
    target_source_filename: input.sourceFilename,
    target_source_size_bytes: input.sourceSizeBytes ?? null,
    target_initiator_user_id: input.initiatorUserId,
  });
  if (startedRpc.error) {
    return { status: "REJECTED", reason: `record_import_started: ${startedRpc.error.message}` };
  }
  const importId = startedRpc.data as string;

  const parsed = parseCsv(input.csvText);
  let okCount = 0;
  let errorCount = 0;

  for (const err of parsed.errors) {
    await supabase.rpc("record_import_row_error", {
      target_organization_id: input.organizationId,
      target_import_id: importId,
      target_row_index: err.rowIndex,
      target_error_message: `parse: ${err.message}`,
      target_raw_payload: {} as never,
    });
    errorCount += 1;
  }

  for (let i = 0; i < parsed.rows.length; i += 1) {
    // rowIndex is offset by 1 because header is row 0.
    const rowIndex = i + 1;
    const raw = parsed.rows[i];
    const validation = customerRowSchema.safeParse(raw);
    if (!validation.success) {
      await supabase.rpc("record_import_row_error", {
        target_organization_id: input.organizationId,
        target_import_id: importId,
        target_row_index: rowIndex,
        target_error_message: `validate: ${validation.error.message.slice(0, 400)}`,
        target_raw_payload: raw as never,
      });
      errorCount += 1;
      continue;
    }
    const row = validation.data;

    // Idempotent upsert path — respects the existing
    // unique (organization_id, external_provider, external_id)
    // constraint on customers. We do a SELECT-then-INSERT rather
    // than an ON CONFLICT so the returned id is consistent whether
    // the row was newly created or was already present.
    const existing = await supabase
      .from("customers")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("external_provider", row.external_provider)
      .eq("external_id", row.external_id)
      .limit(1)
      .maybeSingle();

    let entityId: string | null = null;
    if (existing.data) {
      entityId = (existing.data as { id: string }).id;
    } else {
      const insert = await supabase
        .from("customers")
        .insert({
          organization_id: input.organizationId,
          external_provider: row.external_provider,
          external_id: row.external_id,
          type: row.type,
          display_name: row.display_name,
          company_name: row.company_name,
          email: row.email,
          phone: row.phone,
        })
        .select("id")
        .single();
      if (insert.error) {
        await supabase.rpc("record_import_row_error", {
          target_organization_id: input.organizationId,
          target_import_id: importId,
          target_row_index: rowIndex,
          target_error_message: `insert: ${insert.error.message}`,
          target_raw_payload: raw as never,
        });
        errorCount += 1;
        continue;
      }
      entityId = (insert.data as { id: string }).id;
    }

    await supabase.rpc("record_import_row_ok", {
      target_organization_id: input.organizationId,
      target_import_id: importId,
      target_row_index: rowIndex,
      target_external_id: row.external_id,
      target_entity_type: "customer",
      target_entity_id: entityId,
    });
    okCount += 1;
  }

  let finalStatus: "COMPLETED" | "PARTIAL" | "FAILED" = "COMPLETED";
  if (okCount === 0 && errorCount > 0) finalStatus = "FAILED";
  else if (errorCount > 0) finalStatus = "PARTIAL";

  await supabase.rpc("finalize_import", {
    target_organization_id: input.organizationId,
    target_import_id: importId,
    target_status: finalStatus,
    target_error: finalStatus === "FAILED" ? "no rows successfully applied" : null,
  });

  return { status: finalStatus, importId, okCount, errorCount };
}
