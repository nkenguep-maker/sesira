import "server-only";

/**
 * C34 — EInvoicingProvider abstraction (test double + PENDING sentinel).
 *
 * REGULATORY.md D-3: at C34 launch there is NO real PA integration.
 * The application-side abstraction here is intentionally minimal
 * (payload → external_ref outcome). A future real PA adapter will
 * implement the same interface without changing the seam.
 *
 * The DB-side gate (`record_einvoicing_provider_event`) enforces
 * that SUBMITTED/ACCEPTED/REJECTED events can only be inserted from
 * service_role (real PA webhook) OR when provider_kind = 'TEST'
 * (explicit test simulation). This TS interface is a thin veneer for
 * callers that want to compose provider adapters in tests or in a
 * future edge worker — the doctrine is enforced in SQL, not here.
 */

export type EInvoicingProviderKind =
  | "TEST"
  | "PRODUCTION_PROVIDER_INTEGRATION_PENDING";

export type EInvoicingSubmissionFormat = "UBL" | "CII" | "FACTUR_X" | "OTHER";

export interface EInvoicingSubmissionPayload {
  invoiceId: string;
  externalInvoiceRef: string | null;
  amount: number;
  currency: string;
  issuedAt: string;
  dueAt: string | null;
  customerId: string;
  format: EInvoicingSubmissionFormat;
}

export type EInvoicingHandoffResult =
  | { status: "HANDED_OFF"; providerExternalRef: string }
  | { status: "PROVIDER_UNAVAILABLE"; reason: string }
  | { status: "ERROR"; reason: string };

/**
 * Contract for every e-invoicing provider adapter. Real PA
 * implementations wrap the vendor's HTTP client. The TEST provider
 * emits a deterministic external_ref and returns HANDED_OFF.
 * PRODUCTION_PROVIDER_INTEGRATION_PENDING always returns
 * PROVIDER_UNAVAILABLE — surfaced in the UI as
 * « Transmission fournisseur indisponible ».
 */
export interface EInvoicingProvider {
  readonly kind: EInvoicingProviderKind;
  readonly label: string;
  readonly supportedFormats: readonly EInvoicingSubmissionFormat[];

  /**
   * Hand off a prepared submission to the provider. This is called
   * AFTER the DB submission has been marked EXPORTED — the provider
   * simply confirms the handoff and returns its own external_ref
   * (or PROVIDER_UNAVAILABLE if the vendor is not integrated).
   *
   * The provider MUST NOT infer SUBMITTED / ACCEPTED / REJECTED
   * itself — those states come from asynchronous callbacks recorded
   * by `record_einvoicing_provider_event`.
   */
  handoff(payload: EInvoicingSubmissionPayload): Promise<EInvoicingHandoffResult>;
}

/**
 * TEST provider — deterministic simulation for local dev + fixtures.
 * NEVER activate in production: the DB gate refuses any test
 * simulation once a real PA is bound to the org.
 */
export class TestEInvoicingProvider implements EInvoicingProvider {
  readonly kind = "TEST" as const;
  readonly label: string;
  readonly supportedFormats: readonly EInvoicingSubmissionFormat[];

  constructor(label = "Test e-invoicing provider", formats: readonly EInvoicingSubmissionFormat[] = ["UBL", "CII", "FACTUR_X"]) {
    this.label = label;
    this.supportedFormats = formats;
  }

  async handoff(payload: EInvoicingSubmissionPayload): Promise<EInvoicingHandoffResult> {
    if (!this.supportedFormats.includes(payload.format)) {
      return { status: "ERROR", reason: `test provider does not support format ${payload.format}` };
    }
    if (!payload.externalInvoiceRef) {
      return { status: "ERROR", reason: "test provider requires an external invoice ref" };
    }
    // Deterministic simulated ref
    return {
      status: "HANDED_OFF",
      providerExternalRef: `test:${payload.invoiceId}:${payload.externalInvoiceRef}`,
    };
  }
}

/**
 * Sentinel provider used while awaiting a real PA integration
 * (REGULATORY.md D-3). Always returns PROVIDER_UNAVAILABLE. The UI
 * renders as « Transmission fournisseur indisponible ».
 */
export class PendingProductionEInvoicingProvider implements EInvoicingProvider {
  readonly kind = "PRODUCTION_PROVIDER_INTEGRATION_PENDING" as const;
  readonly label: string;
  readonly supportedFormats: readonly EInvoicingSubmissionFormat[];

  constructor(label = "PA production (à intégrer)", formats: readonly EInvoicingSubmissionFormat[] = ["UBL", "CII", "FACTUR_X"]) {
    this.label = label;
    this.supportedFormats = formats;
  }

  async handoff(): Promise<EInvoicingHandoffResult> {
    return {
      status: "PROVIDER_UNAVAILABLE",
      reason: "PRODUCTION_PROVIDER_INTEGRATION_PENDING: no real PA integrated yet (REGULATORY.md D-3).",
    };
  }
}
