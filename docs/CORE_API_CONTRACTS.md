# SESIRA — Core API Contracts

> Shared boundary between Product (Codex) and Core Workflow engineering (Claude).
> Updated: 24 August 2026.

This document records backend data that Product needs but must not fabricate or implement inside
the UI layer. `REQUESTED` means the Results interface keeps the value visibly unavailable until
Core provides a tenant-safe implementation.

## Results contracts

### `getAutomationResultsSummary(period)` — P0 — REQUESTED

Owner: Claude Core.

Purpose: return real, organization-scoped workflow outcomes for a bounded period.

Required output:

- follow-ups scheduled, attempted, completed and failed;
- replies received after a follow-up;
- attention items created by a workflow decision;
- work completed in Shadow Mode versus externally executed;
- stable identifiers or aggregation rules that prevent duplicate counting;
- data freshness and unavailable fields.

Requirements:

- organization authority must come from authenticated membership, never browser input;
- only completed real actions may be reported as observed;
- Shadow Mode decisions must never be counted as external sends;
- retries and duplicate attempts must not inflate business metrics;
- the period must have explicit inclusive/exclusive UTC boundaries.

Product status: `/app/results` does not show real follow-up, reply or automation metrics while this
contract is missing.

### `getResultsValueInputs(period)` — P0 — REQUESTED

Owner: Claude Core, with product/business configuration supplied separately.

Purpose: provide validated inputs for commercial value and investment calculations.

Required output:

- loaded hourly cost and currency, with source and effective date;
- tenant investment or subscription cost for the selected period;
- contribution margin when available (revenue alone is insufficient);
- attribution method and confidence;
- attributed outcomes with deduplication keys;
- an explicit unavailable state for every missing input.

Product status: “Gain potentiel estimé” and “Pour 1 € investi” remain `À établir`. Product must not
derive these values from quote totals alone.

### `getAttributedCommercialOutcomes(period)` — P1 — REQUESTED

Owner: Claude Core.

Purpose: expose outcomes that can be connected to a deterministic SESIRA workflow without claiming
causality that the data does not support.

Required output:

- quote/customer/request identifiers scoped to the active organization;
- outcome type and timestamp;
- contribution margin or explicitly marked proxy;
- originating workflow run, follow-up action and audit references;
- attribution status (`OBSERVED`, `ESTIMATED`, `UNKNOWN`) and rationale;
- duplicate-prevention key.

Product status: no commercial outcome is shown as generated revenue until this contract is
implemented and reviewed.

## Existing Product-side contract

The current Results UI owns these TypeScript contracts in `src/lib/results/contracts.ts`:

- `ResultsPeriod`
- `ResultsSummary`
- `ObservedMetric`
- `EstimatedMetric`
- `ValueEstimate`
- `ResultsRepository`

They are a Product read boundary, not a workflow engine. Core should provide adapters compatible
with that boundary and must not rewrite Customers, Requests, Quotes, Attention, Events or the
application shell to satisfy it.
