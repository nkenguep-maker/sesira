# Foundational Product/UI mapping through Core C18

The C19→C40 UI driver mirrors the Core driver directly. For the pre-C19 foundation, Product/UI alignment is audited by capability rather than by marketing-version labels.

| Core capability | Required Product/UI capability |
| --- | --- |
| Baseline, auth, tenancy | Auth flows, protected shell, permission-safe states |
| State machines | Only legal actions exposed; terminal states explained |
| Tenant-safe assignments | Team assignment controls limited to authorized members |
| Pause/opt-out safety | Follow-up controls show paused/opted-out states and cannot silently resume |
| Deterministic scheduling | Next-action timing and stop reasons visible |
| Durable idempotency | Duplicate submissions/callbacks render as one logical action |
| Shadow | Observation/Shadow state and proposed action visible, no send affordance implying execution |
| Attention + audit | Human decision inbox plus provenance/timeline |
| Retry + incidents | Failed/retrying/recoverable states and operator visibility |
| Guarded email | Draft/approval/sending/sent/failed lifecycle |
| Inbound replies | Reply timeline and quote/request linkage |
| AI classification | Structured intent, confidence, provenance and low-confidence handling |
| Approval | Approve/reject/edit controls with truthful dispatch state |
| Read models | All product reads consume the canonical data seam |
| E2E hardening | Browser path validates flagship workflow |
| Operations | Resolve/dismiss/retry/reclassify/pause controls |
| Onboarding/import/results/costs | Operable setup, import, evidence and reporting surfaces |
| Evidence/readiness | Technical evidence separated from commercial proof |
| Opportunities/variants/options | Opportunity detail, quote variants/revisions/options, legal action graph |

U18 is satisfied only when the complete table above is implemented and verified on the same combined branch as C18.
