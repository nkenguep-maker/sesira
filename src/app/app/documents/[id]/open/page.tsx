import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const DOCUMENT_BUCKET = "sesira-documents";
const SIGNED_URL_SECONDS = 60;

type Params = Promise<{ id: string }>;

export default async function OpenDocumentPage({ params }: { params: Params }) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");

  const { id } = await params;
  const supabase = await createClient();
  const document = await supabase
    .from("documents")
    .select("file_reference")
    .eq("id", id)
    .eq("organization_id", viewer.organization.id)
    .maybeSingle();

  if (document.error || !document.data?.file_reference) {
    redirect("/app/documents?result=not-found");
  }

  const signed = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.data.file_reference, SIGNED_URL_SECONDS);

  if (signed.error || !signed.data?.signedUrl) {
    console.error("document signed URL failed", {
      documentId: id,
      organizationId: viewer.organization.id,
      message: signed.error?.message,
    });
    redirect("/app/documents?result=open-error");
  }

  redirect(signed.data.signedUrl);
}
