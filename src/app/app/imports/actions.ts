"use server";

import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import { runImport } from "@/lib/imports/run-import";

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export async function importCustomersAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");

  const candidate = formData.get("file");
  if (!(candidate instanceof File) || candidate.size === 0) {
    redirect("/app/imports/new?import=missing-file");
  }
  if (candidate.size > MAX_IMPORT_BYTES) {
    redirect("/app/imports/new?import=file-too-large");
  }
  if (!/\.csv$/i.test(candidate.name) && candidate.type !== "text/csv") {
    redirect("/app/imports/new?import=invalid-format");
  }

  const csvText = await candidate.text();
  const result = await runImport({
    organizationId: viewer.organization.id,
    kind: "customers",
    csvText,
    sourceFilename: candidate.name,
    sourceSizeBytes: candidate.size,
    initiatorUserId: viewer.userId,
  });

  if (result.status === "REJECTED") {
    redirect("/app/imports/new?import=rejected");
  }

  const params = new URLSearchParams({
    import: result.status.toLowerCase(),
    ok: String(result.okCount),
    errors: String(result.errorCount),
  });
  redirect(`/app/imports?${params.toString()}`);
}
