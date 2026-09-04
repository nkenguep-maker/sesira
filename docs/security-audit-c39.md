# C39 — Security / Recovery / Scale audit

Status: **Wave 5/6 offensive coverage in place.** Full-scale volume
validation ready via `supabase/seeds/synthetic_volume.example.sql`.

## What C39 delivers

- `supabase/tests/wave5_wave6_offensive.sql` — 14 attack-surface tests
  covering C30-C38. Runs in a rolled-back transaction; each assertion
  raises on regression.
- `supabase/seeds/synthetic_volume.example.sql` — parameterised load
  seed (10k+ customers, 50k+ quotes, 100k+ events, 1k+ voice_calls,
  2k+ ai_runs, 3k+ growth events). Refuses to run on an org with real
  audit history >7 days.
- This document — attack matrix + coverage grid + gaps.

## Attack matrix (roadmap C39) — coverage grid

| # | Attack | Covered by |
|---|--------|------------|
| 1  | Tenant A → tenant B (equipment) | `wave5_wave6_offensive.sql` (TEST: tenant A cannot read tenant B equipment) |
| 2  | Tenant A → tenant B (financing) | `wave5_wave6_offensive.sql` (Cross-tenant financing_referrals) |
| 3  | IDOR on regulatory_attentions | Immutability trigger + seen_at set-once test |
| 4  | RLS bypass on Wave 5/6 tables | Smoke test asserts `relrowsecurity = true` on all 24 tables |
| 5  | RPC forgery (service_role only) | Tests for `supersede_regulatory_gwp_value`, `record_platform_component_event` |
| 6  | Rôle insuffisant | ACTIVE-member checks on `mark_regulatory_attention_seen`, kill-switch RPCs |
| 7  | Webhook replay | `einvoicing_provider_events` unique dedup test |
| 8  | Webhook storm | Rate-limit is a downstream provider concern; SESIRA idempotency prevents state corruption |
| 9  | Double submit (offline field artifact) | Idempotency test on `submit_intervention_field_artifact` |
| 10 | Upload malicieux | Out of SQL scope — enforced at Storage RLS + edge validator |
| 11 | Provider timeout | Kill-switch semantics: worker sees `is_platform_component_enabled = false` and skips. Not simulated here. |
| 12 | Provider retourne succès deux fois | `einvoicing_provider_events` unique dedup test |
| 13 | Mistral indisponible | `is_platform_component_enabled('AI_MISTRAL')` returns false when DISABLED_MANUAL — test verifies |
| 14 | Mistral retourne JSON invalide | AI worker concern; not in SQL suite. Downstream: `ai_runs.status = 'ERROR'` + fallback event. |
| 15 | Callbacks hors ordre | State machine trigger on `einvoicing_submissions` rejects illegal transitions (implicit) |
| 16 | DB indisponible | Nothing to test at SQL level (client concern) |
| 17 | Réseau mobile coupé | Offline sync test on `submit_intervention_field_artifact` |
| 18 | Token expiré / session supprimée | Supabase auth concern; downstream RLS on all Wave 5/6 tables |
| 19 | Restauration sauvegarde | Ops concern; INV-03 rule snapshots ensure historical exports remain valid post-restore |
| 20 | Forte volumétrie | `synthetic_volume.example.sql` — target org gets 10k/50k/100k volumes |

## Doctrine invariants asserted

- **INV-01** (no "conforme" verdict): pg_proc description scan.
- **INV-02** (regulatory_attentions seen_at set-once): RPC replay + direct UPDATE tests.
- **INV-03** (regulatory reference immutability): `regulatory_gwp_values.gwp_100y` update raises; `effective_until` write-once test.
- **INV-05** (SESIRA never touches funds): schema smoke — no `income`/`monthly_payment` columns on `voice_calls`, `financing_partners`, `financing_referrals`.
- **INV-06** (no scoring of persons): schema smoke — no `emotion`/`sentiment_score`/`credit_score` columns; `record_voice_call_processed` metadata guard.

## What C39 does NOT deliver (deliberately)

- **Live load-test scripts** (k6, artillery) — pick a runner in ops.
- **Storage upload malicieux scan** — belongs to Supabase Storage
  policies + Vercel edge validation, not SQL.
- **Backup/restore drill** — an ops rehearsal, not a code deliverable.
  INV-03 rule snapshots make sure a restored DB still matches the
  historical exports it produced.
- **AI provider fault injection** — hooked via `is_platform_component_enabled`
  kill-switch. Real fault-injection lives in the AI worker (out of C39
  SQL scope).

## Running the suite

```bash
export SUPABASE_ACCESS_TOKEN=<sbp_...>
cd "/Users/paulnkengue/Documents/ChatGPT/AI OS"
npx supabase db query --linked -f supabase/tests/wave5_wave6_offensive.sql
```

Every assertion raises on failure. The whole file is wrapped in
`BEGIN ... ROLLBACK` — no persistent fixtures.

For volumes:

```bash
# Pick a NON-PRODUCTION Supabase env first.
psql "$SUPABASE_DIRECT_URL" -c "select set_config('sesira.load_org_id', '<your load-org uuid>', false);"
psql "$SUPABASE_DIRECT_URL" -f supabase/seeds/synthetic_volume.example.sql

# Rollback:
psql "$SUPABASE_DIRECT_URL" -c "select public.rollback_synthetic_volume('<your load-org uuid>');"
```

## Sign-off criteria for C40 FINAL AUDIT

Before C40 declares the platform mature, C39 outputs must show:
1. `wave5_wave6_offensive.sql` passes end-to-end on the production
   ubfqffhvomaxcwgerwmr database.
2. Synthetic volumes have been loaded onto a staging clone at least
   once; dashboard read RPCs return within 300 ms at that volume.
3. All open `⚖ AVOCAT` items in `REGULATORY.md` §8.2 are either
   resolved or explicitly acknowledged as accepted risk.
