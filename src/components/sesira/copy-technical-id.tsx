"use client";

import { useState } from "react";

export function CopyTechnicalId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="text-button" type="button" onClick={copy} style={{ fontSize: 11, color: "#7b8184" }}>
      {copied ? "Identifiant copié" : "Copier l’identifiant technique"}
    </button>
  );
}
