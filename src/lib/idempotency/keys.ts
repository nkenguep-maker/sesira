/**
 * SESIRA Core Workflow — idempotency key builders.
 *
 * Every durable side effect the Core workflow creates (an event, an
 * automation run, a generated Attention, a provider delivery receipt,
 * a future external effect) is deduplicated by a key that is a pure
 * function of *stable operational identifiers* — never of mutable
 * business values.
 *
 * FORBIDDEN inputs to a key:
 *   - customer email
 *   - quote amount / currency
 *   - message text / body / subject
 *   - attention title / explanation
 *   - anything a user can edit after the fact
 *
 * ALLOWED inputs:
 *   - entity ids (quote_id, message_id, request_id)
 *   - workflow decision coordinates (step number, template key)
 *   - external provider event ids (Resend event id, Stripe event id)
 *   - external identity tuples (external_provider + external_id)
 *
 * The rule is enforced socially, not structurally — reviewers must
 * flag any PR that passes a mutable value to a key builder. The unit
 * tests below cover the shape of every key produced; adding a builder
 * that accepts a mutable value should fail review.
 *
 * Failed validation must not consume a key. Every caller MUST validate
 * its input first and only then compute the key from the parsed,
 * stable identifiers. No key builder here reads free-form user text.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(name: string, value: string): void {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new RangeError(`${name} must be a UUID (got ${JSON.stringify(value)})`);
  }
}

function assertNonEmpty(name: string, value: string, maximum = 200): void {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum) {
    throw new RangeError(
      `${name} must be a non-empty string ≤${maximum} chars (got ${JSON.stringify(value)})`,
    );
  }
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(
      `${name} must be a positive integer (got ${JSON.stringify(value)})`,
    );
  }
}

/**
 * Quote follow-up decision — one row per (quote, step).
 * Format: `quote_followup:{quote_id}:step:{n}`
 *
 * The template_version is intentionally NOT embedded: a schedule bump
 * on the automation_config must not spawn a duplicate run for a step
 * that already fired. Changing the historical schedule for already-
 * fired quotes is a business decision that requires an explicit
 * migration.
 */
export function quoteFollowupDecisionKey(quoteId: string, step: number): string {
  assertUuid("quoteId", quoteId);
  assertPositiveInteger("step", step);
  return `quote_followup:${quoteId}:step:${step}`;
}

/**
 * External provider delivery event — one row per callback.
 * Format: `delivery:{provider}:{provider_event_id}`
 *
 * The provider's own event id is the authoritative identity: a retried
 * callback with the same id must resolve to the same receipt row. The
 * receipt payload (delivery status, timestamps) is opaque to the key.
 */
export function providerDeliveryKey(
  provider: string,
  providerEventId: string,
): string {
  assertNonEmpty("provider", provider, 64);
  assertNonEmpty("providerEventId", providerEventId, 200);
  return `delivery:${provider}:${providerEventId}`;
}

/**
 * Product creation replay — for a domain object whose stable identity
 * is `(external_provider, external_id)` (e.g. a quote imported from a
 * CRM, an incoming message from a mailbox). A replay of the same
 * import must not create a second product row.
 *
 * Format: `product:{kind}:{provider}:{external_id}`
 *
 * Kind is the domain table name (`quote`, `request`, `message`).
 * Callers should use this key on the row itself (unique index on
 * (organization_id, external_provider, external_id) is authoritative
 * for existing tables) AND on any downstream event / attention rows
 * that describe the import.
 */
export function productCreationKey(
  kind: "quote" | "request" | "message" | "customer",
  externalProvider: string,
  externalId: string,
): string {
  assertNonEmpty("kind", kind, 32);
  assertNonEmpty("externalProvider", externalProvider, 64);
  assertNonEmpty("externalId", externalId, 200);
  return `product:${kind}:${externalProvider}:${externalId}`;
}

/**
 * Generated Attention — one row per (source kind, source id). E.g.
 * an Attention derived from a customer reply on a quote:
 *   attentionFromSourceKey("quote_reply", messageId)
 *
 * Attention items created manually by a user have no source and
 * therefore no key: pass NULL to the DB (see
 * `public.attention_items.idempotency_key`).
 */
export function attentionFromSourceKey(
  sourceKind: string,
  sourceId: string,
): string {
  assertNonEmpty("sourceKind", sourceKind, 64);
  assertUuid("sourceId", sourceId);
  return `attention:${sourceKind}:${sourceId}`;
}

/**
 * Generic external effect — for a workflow-scheduled effect that is
 * neither a follow-up nor a receipt (e.g. a scheduled reminder, a
 * data export). The (kind, entityId, discriminator) triple must be
 * stable across replays.
 */
export function externalEffectKey(
  kind: string,
  entityId: string,
  discriminator?: string | number,
): string {
  assertNonEmpty("kind", kind, 64);
  assertUuid("entityId", entityId);
  if (discriminator === undefined) return `effect:${kind}:${entityId}`;
  if (typeof discriminator === "number") {
    assertPositiveInteger("discriminator", discriminator);
    return `effect:${kind}:${entityId}:${discriminator}`;
  }
  assertNonEmpty("discriminator", discriminator, 64);
  return `effect:${kind}:${entityId}:${discriminator}`;
}

/**
 * Outbound message intent — one row per (kind, entity, step) send
 * attempt. E.g. the first send of quote follow-up step 2:
 *   outboundMessageIntentKey("quote_followup", quoteId, 2)
 *
 * Format: `outbound:{kind}:{entityId}:{step}`
 *
 * The `step` (or discriminator) is required to distinguish successive
 * legitimate sends against the same entity (step 1, step 2, ...).
 * Never derived from the subject / body / recipient — those are
 * mutable business values and would defeat replay safety.
 */
export function outboundMessageIntentKey(
  kind: string,
  entityId: string,
  step: number,
): string {
  assertNonEmpty("kind", kind, 64);
  assertUuid("entityId", entityId);
  assertPositiveInteger("step", step);
  return `outbound:${kind}:${entityId}:${step}`;
}

/**
 * Types of identifiers a key builder MAY accept. Used by the store
 * layer to keep the surface area explicit — a call site that mixes
 * a mutable value into a key trips a type error.
 */
export type StableIdentity =
  | { kind: "uuid"; value: string }
  | { kind: "provider_event"; provider: string; providerEventId: string }
  | { kind: "external_identity"; provider: string; externalId: string };
