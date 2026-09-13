"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

import {
  finalizeDocumentUploadAction,
  prepareDocumentUploadAction,
} from "@/app/app/documents/upload-actions";
import { MAX_DOCUMENT_BYTES } from "@/lib/documents/upload-policy";
import { createClient } from "@/lib/supabase/client";

type UploadMessage = { tone: "good" | "error"; text: string };

const ACCEPTED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function DocumentUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<UploadMessage | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const candidate = formData.get("file");
    const kind = String(formData.get("kind") ?? "OTHER");

    if (!(candidate instanceof File) || candidate.size === 0) {
      setMessage({ tone: "error", text: "Sélectionnez un fichier avant de lancer l’ajout." });
      return;
    }
    if (candidate.size > MAX_DOCUMENT_BYTES) {
      setMessage({ tone: "error", text: "Ce fichier dépasse la limite de 15 Mo." });
      return;
    }

    const contentType = declaredContentType(candidate);
    if (!contentType) {
      setMessage({ tone: "error", text: "Format non pris en charge. Utilisez un PDF, JPEG, PNG ou WebP." });
      return;
    }

    setPending(true);
    try {
      const prepared = await prepareDocumentUploadAction({
        kind,
        fileName: candidate.name,
        fileSize: candidate.size,
        contentType,
      });

      if (!prepared.ok) {
        setMessage({ tone: "error", text: prepareErrorMessage(prepared.code) });
        return;
      }

      const supabase = createClient();
      const uploaded = await supabase.storage
        .from("sesira-documents")
        .uploadToSignedUrl(prepared.storagePath, prepared.token, candidate, {
          contentType,
          upsert: false,
        });

      if (uploaded.error) {
        setMessage({ tone: "error", text: "Le transfert vers l’espace privé a échoué. Aucun document n’a été enregistré." });
        return;
      }

      const finalized = await finalizeDocumentUploadAction({
        kind,
        fileName: candidate.name,
        fileSize: candidate.size,
        storagePath: prepared.storagePath,
      });

      if (!finalized.ok) {
        setMessage({ tone: "error", text: finalizeErrorMessage(finalized.code) });
        return;
      }

      form.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage({ tone: "good", text: "Document ajouté et vérifié." });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "L’ajout n’a pas pu être terminé. Réessayez." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="workspace-inline-form" onSubmit={submit}>
      <label>
        <span>Type de document</span>
        <select name="kind" defaultValue="OTHER" required disabled={pending}>
          <option value="CONTRACT">Contrat</option>
          <option value="INVOICE">Facture</option>
          <option value="PROOF_OF_DELIVERY">Preuve de livraison</option>
          <option value="REGULATORY">Réglementaire</option>
          <option value="PHOTO">Photo</option>
          <option value="REPORT">Rapport</option>
          <option value="OTHER">Autre</option>
        </select>
      </label>
      <label>
        <span>Fichier</span>
        <input
          ref={fileInputRef}
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
          required
          disabled={pending}
        />
      </label>
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "Vérification et envoi…" : "Ajouter le document"}
      </button>
      {message ? (
        <p className={message.tone === "good" ? "form-success" : "form-error"} role="status">
          {message.text}
        </p>
      ) : null}
    </form>
  );
}

function declaredContentType(file: File) {
  if (ACCEPTED_CONTENT_TYPES.has(file.type)) return file.type;
  const extension = file.name.toLowerCase().split(".").pop();
  return ({
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  } as Record<string, string>)[extension ?? ""] ?? null;
}

function prepareErrorMessage(code: string) {
  return ({
    "auth-required": "Votre session a expiré. Reconnectez-vous avant d’ajouter un document.",
    "invalid-kind": "Le type de document sélectionné n’est pas accepté.",
    "invalid-name": "Le nom du fichier est vide ou trop long.",
    "invalid-size": "Le fichier est vide ou dépasse 15 Mo.",
    "invalid-declared-type": "Le format déclaré n’est pas accepté.",
    "prepare-failed": "SESIRA n’a pas pu préparer l’espace d’envoi sécurisé.",
  } as Record<string, string>)[code] ?? "Impossible de préparer cet envoi.";
}

function finalizeErrorMessage(code: string) {
  return ({
    "auth-required": "Votre session a expiré avant la fin de l’envoi.",
    "invalid-kind": "Le type de document n’est pas accepté.",
    "invalid-name": "Le nom du fichier est invalide.",
    "invalid-size": "La taille du fichier est invalide.",
    "invalid-storage-path": "Le chemin de stockage ne correspond pas à votre organisation.",
    "verification-download-failed": "Le fichier a été transféré mais sa vérification n’a pas pu être terminée.",
    "size-mismatch": "La taille reçue ne correspond pas au fichier sélectionné. L’envoi a été annulé.",
    "invalid-format": "Le contenu réel du fichier ne correspond pas à un PDF, JPEG, PNG ou WebP valide.",
    "registry-failed": "Le fichier n’a pas pu être inscrit au registre. L’envoi a été annulé.",
  } as Record<string, string>)[code] ?? "Le fichier a été envoyé mais n’a pas pu être validé.";
}
