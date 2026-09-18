import type {
  ProposalSnapshot,
  ProposalSnapshotOption,
  ProposalSnapshotVariant,
} from "./snapshot";

export interface RenderedProposalEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function formatMoney(value: string | number | null, currency: string): string {
  if (value === null) return "Montant à confirmer";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "Montant à confirmer";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return numeric.toFixed(2) + " " + currency;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function visibleOptions(options: ProposalSnapshotOption[]): ProposalSnapshotOption[] {
  return options.filter((option) => option.status === "PROPOSED" || option.status === "INCLUDED");
}

function renderVariantText(variant: ProposalSnapshotVariant, index: number): string {
  const recommendation = variant.recommended ? " — recommandée" : "";
  const lines = [
    `Option ${index + 1} — ${variant.title}${recommendation}`,
    formatMoney(variant.amount, variant.currency),
  ];

  const options = visibleOptions(variant.options);
  if (options.length > 0) {
    lines.push(
      ...options.map((option) =>
        `  + ${option.name}: ${formatMoney(option.amount, option.currency)}`
      ),
    );
  }

  return lines.join("\n");
}

function renderVariantHtml(variant: ProposalSnapshotVariant, index: number): string {
  const recommendation = variant.recommended
    ? '<span style="font-size:12px;font-weight:600">Recommandée</span>'
    : "";
  const options = visibleOptions(variant.options)
    .map(
      (option) =>
        `<li>${escapeHtml(option.name)} — ${escapeHtml(formatMoney(option.amount, option.currency))}</li>`,
    )
    .join("");

  return [
    '<section style="border:1px solid #e5e7eb;padding:16px;margin:12px 0">',
    `<div style="display:flex;justify-content:space-between;gap:12px"><strong>Option ${index + 1} — ${escapeHtml(variant.title)}</strong>${recommendation}</div>`,
    `<div style="font-size:20px;font-weight:700;margin-top:8px">${escapeHtml(formatMoney(variant.amount, variant.currency))}</div>`,
    options ? `<ul style="margin:12px 0 0;padding-left:20px">${options}</ul>` : "",
    "</section>",
  ].join("");
}

export function renderProposalEmail(
  snapshot: ProposalSnapshot,
): RenderedProposalEmail {
  const to = snapshot.customer.email?.trim();
  if (!to) {
    throw new Error("renderProposalEmail: approved snapshot has no customer email");
  }

  const title = snapshot.proposal.title.trim();
  const subject = title.length > 0
    ? `Votre proposition — ${title}`
    : "Votre proposition";

  const greeting = `Bonjour ${snapshot.customer.display_name},`;
  const textVariants = snapshot.variants.map(renderVariantText).join("\n\n");

  const text = [
    greeting,
    "",
    "Voici la proposition préparée pour vous.",
    "",
    textVariants,
    "",
    "Nous restons disponibles pour répondre à vos questions.",
    "",
    "Cordialement,",
  ].join("\n");

  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:680px">',
    `<p>Bonjour ${escapeHtml(snapshot.customer.display_name)},</p>`,
    "<p>Voici la proposition préparée pour vous.</p>",
    snapshot.variants.map(renderVariantHtml).join(""),
    "<p>Nous restons disponibles pour répondre à vos questions.</p>",
    "<p>Cordialement,</p>",
    "</div>",
  ].join("");

  return { to, subject, text, html };
}
