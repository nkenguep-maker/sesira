"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import { isImportKind } from "@/lib/imports/schemas";
import { runImport } from "@/lib/imports/run-import";

const MAX_IMPORT_BYTES = 3 * 1024 * 1024;
const IMPORT_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

function refreshImportedSurfaces() {
  revalidatePath("/app/imports");
  revalidatePath("/app/clients");
  revalidatePath("/app/devis");
  revalidatePath("/app/factures");
  revalidatePath("/app/maintenance");
  revalidatePath("/app/obligations/equipements");
}

export async function importCsvAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  if (!IMPORT_ROLES.has(viewer.role)) {
    redirect("/app/imports/new?import=forbidden");
  }

  const kindValue = formData.get("kind");
  const kind = typeof kindValue === "string" ? kindValue.trim() : "";
  if (!isImportKind(kind)) {
    redirect("/app/imports/new?import=invalid-kind");
  }

  const candidate = formData.get("file");
  if (!(candidate instanceof File) || candidate.size === 0) {
    redirect(`/app/imports/new?kind=${kind}&import=missing-file`);
  }
  if (candidate.size > MAX_IMPORT_BYTES) {
    redirect(`/app/imports/new?kind=${kind}&import=file-too-large`);
  }
  if (!/\.csv$/i.test(candidate.name) && candidate.type !== "text/csv") {
    redirect(`/app/imports/new?kind=${kind}&import=invalid-format`);
  }

  const csvText = await candidate.text();
  const result = await runImport({
    organizationId: viewer.organization.id,
    kind,
    csvText,
    sourceFilename: candidate.name,
    sourceSizeBytes: candidate.size,
    initiatorUserId: viewer.userId,
  });

  if (result.status === "REJECTED") {
    redirect(`/app/imports/new?kind=${kind}&import=rejected`);
  }

  refreshImportedSurfaces();

  const params = new URLSearchParams({
    import: result.status.toLowerCase(),
    kind,
    ok: String(result.okCount),
    errors: String(result.errorCount),
  });
  redirect(`/app/imports?${params.toString()}`);
}

// Kept for compatibility with any older caller that still submits the
// customer-only action directly.
export async function importCustomersAction(formData: FormData) {
  if (!formData.get("kind")) formData.set("kind", "customers");
  return importCsvAction(formData);
}
