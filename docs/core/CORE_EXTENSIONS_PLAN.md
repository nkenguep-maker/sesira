# SESIRA — Core Extensions Plan (post-C40)

**Status:** planning only — no functional code is proposed here.
**Branch:** `claude/core-workflows`
**Base commit:** `8c55ebd` (C40 backend contracts complete)
**Date:** 2026-09-07
**Author:** Claude (Core Workflow)

C40 closed the platform-maturity gate on 33 domains × 9 criteria. This document plans
the next wave of Core capabilities requested by product to unlock the Stitch UX
(dispatch board, GPS/fleet, guided field workflow, transactional SMS, document trust,
Trackdéchets, deposit/final invoicing, contract renewals) without weakening any
existing invariant.

The plan is **decision-record + scope**, not implementation. Each capability gets its
own milestone commit under the numbering decided in §1, on its own dedicated branch.

---

## 1. Numérotation retenue

**Décision : séquence C41 → C49.**

Vérification effectuée (2026-09-07) :
- `grep -rE '\bC4[1-9]\b|\bC5[0-9]\b|CORE_EXT' docs/ supabase/ src/` : **0 correspondance** dans le repo.
- Derniers milestones utilisés : C33 (F-Gas), C34 (e-invoicing), C35 (financing), C36 (technician field), C37 (voice), C38 (costs/observability), C39 (recovery+security), C40 (maturity gate).
- Aucun label `CORE_EXT_XX` ou `C41+` réservé nulle part.

Conclusion : les milestones **C41 à C49** sont libres. Nomenclature `CORE_EXT_XX` non
nécessaire — la continuité C1→C49 est préservée.

| Milestone | Capacité | Branche |
|---|---|---|
| C41 | Dispatch / planning avancé / affectation véhicule | `claude/core-dispatch-planning` |
| C42 | GPS / fleet telemetry / ETA honnête | `claude/core-fleet-telemetry` |
| C43 | Procédures terrain guidées + binaires offline + signature client | `claude/core-guided-field-procedures` |
| C44 | SMS transactionnel contrôlé | `claude/core-transactional-sms` |
| C45 | Preuve documentaire, e-signature/e-seal, timestamp RFC3161/eIDAS | `claude/core-document-trust` |
| C46 | Trackdéchets — dossier déchets/fluide | `claude/core-trackdechets` |
| C47 | Cycle facture chantier : acompte, solde, paiements, Factur-X | `claude/core-invoice-lifecycle` |
| C48 | Renouvellement contrat + avenants | `claude/core-contract-renewals` |
| C49 | Gate final d'intégration + read models Dashboard | `claude/core-post-c40-integration-gate` |

---

## 2. Baseline `npm run verify` — **ROUGE**

**Résultat exécuté le 2026-09-07 sur HEAD `8c55ebd` :**

| Étape | Résultat | Détail |
|---|---|---|
| `npm run lint` | ⚠ 1 warning | `src/lib/regulatory/equipment.ts:6:25 'Json' is defined but never used` |
| `npm run typecheck` | ❌ 3 errors | voir ci-dessous |
| `npm run test` | ⏭ non exécuté | typecheck bloque |
| `npm run build` | ⏭ non exécuté | typecheck bloque |

**Erreurs typecheck détectées sur le HEAD C40 :**

1. `src/app/dev/customers/page.tsx(51,6)` — TS2741 : propriété `currentMode` manquante dans le composant `AppShell` (probablement dérive après l'ajout du prop côté layout).
2. `src/lib/attention/view-model.test.ts(16,3)` — TS2322 : `resolution_kind` typé `string | null | undefined` alors que le contrat attend `string | null`.
3. `src/lib/data/incidents.ts(44,3)` — TS2322 : `fingerprint` typé `string | null` mais `OpenIncidentRow.fingerprint` attend `string` (non nullable).

**Impact sur ce plan :** aucun (docs-only). Le plan documente les extensions à venir ;
il ne modifie ni code ni migration.

**Impact sur les milestones C41+ :** **bloquant.** Chaque milestone C41→C49 exige
`npm run verify` vert. Un patch dédié `fix: restore c40 typecheck baseline`
(commit distinct, hors périmètre du plan) doit ré-établir la baseline verte avant
que C41 ne soit démarré. C'est de la maintenance de la « gate » C40 elle-même —
non pas une extension.

`git status` : clean sauf `SESIRA_AUTH_HANDOFF.md` untracked (hors périmètre).

---

## 3. Ordre recommandé et dépendances

```
C41 Dispatch ─────────────┐
                          │
C42 Fleet telemetry ──────┤ (dépend logiquement du dispatch_assignment_id de C41)
                          │
C43 Guided procedures ────┤ (autonome ; réutilise intervention_field_artifacts C36)
                          │
C44 SMS ──────────────────┤ (autonome ; réutilise pattern EmailProvider C9)
                          │
C45 Document trust ───────┤ (autonome ; document_versions doit exister avant C48)
                          │
C46 Trackdéchets ─────────┤ (autonome ; réutilise pattern PROVIDER_PENDING de C34)
                          │
C47 Invoice lifecycle ────┤ (dépend de invoices C28 + einvoicing_submissions C34)
                          │
C48 Contract renewals ────┤ (dépend de C45 pour document trust des avenants)
                          │
C49 Integration gate ─────┘ (audit final + read models dashboard consolidé)
```

**Contraintes d'ordre absolues :**
- **C42 après C41** — les pings GPS doivent pouvoir se rattacher optionnellement à un
  `dispatch_assignment_id` pour distinguer "session tracking autorisée" de "point isolé".
- **C48 après C45** — un avenant signé/scellé passe par le provider trust ; sans C45,
  C48 ne peut pas afficher autre chose que "signature interne (non qualifiée)".
- **C49 en dernier** — le read model consolidé du dashboard aggrège toutes les
  extensions ; le faire avant multiplierait les read helpers temporaires.

**Autonomes (peuvent être re-priorisés) :** C43, C44, C46, C47.

---

## 4. Invariants transverses à préserver

Reprise stricte de `REGULATORY.md` §0 + doctrine C40 §7 :

| ID | Invariant | Impact sur ce plan |
|---|---|---|
| INV-01 | Aucun verdict de conformité | C46 : jamais "déposé conforme" ; C45 : jamais "eIDAS qualifié" sans preuve provider |
| INV-02 | Double horodatage réglementaire (`created_at` + `seen_at`) | C46 : attentions Trackdéchets suivent le pattern |
| INV-03 | Valeur de référence stockée avec le calcul | C48 : `pricing_formula_snapshot` versionné + immuable |
| INV-04 | Pas d'action externe réglementaire sans validation humaine tracée | C44/C45/C46 : mode AUTOMATIC exclu par défaut sur toutes les mutations externes |
| INV-05 | SESIRA ne touche jamais aux fonds | C47 : `payment_records` observe uniquement (source MANUAL ou ACCOUNTING_PROVIDER webhook) |
| INV-06 | Aucun scoring de personne physique | C42 : GPS ne devient jamais une "note de comportement conducteur" |
| INV-07 | Export complet gratuit (Data Act) | C49 gate final : `export_organization_snapshot` étendu à toutes les nouvelles tables |
| Doctrine §7 | Aucun faux succès provider | C44 SMS DELIVERED, C45 signature CONFIRMED, C46 ACKNOWLEDGED, C47 payment CONFIRMED = uniquement sur webhook provider réel ou TEST_SIMULATION explicite |

---

## 5. Infrastructure existante à réutiliser (ne PAS dupliquer)

### 5.1 Tables cœur (déjà présentes, C0)

| Table | Rôle | Usage prévu par ce plan |
|---|---|---|
| `public.events` | Journal d'événements domain — unique, indexé par `(organization_id, type)` avec `idempotency_key` partial unique | Toutes les nouvelles capacités émettent leurs `*.created/.updated/.terminal` ici |
| `public.audit_logs` | Trace append-only des mutations — `actor_type`/`actor_id` pinnés serveur | Toutes les nouvelles RPC critiques appellent `record_audit_log(...)` |
| `public.attention_items` | File de décision opérationnelle avec state machine (OPEN/IN_PROGRESS/RESOLVED/DISMISSED) | Nouvelle raison + `idempotency_key` par domaine, jamais silo parallèle |
| `public.outbound_messages` | Messages sortants (canal, provider, dedup par `(org, idempotency_key)`) | C44 SMS **étend** ce table (canal `sms`) au lieu de créer un silo |

### 5.2 RPC gates réutilisables

| Fonction | Fichier source | Usage |
|---|---|---|
| `private.is_organization_member(org)` | C0 baseline | Toutes les RPC `SECURITY DEFINER` |
| `private.assert_tenant_active_assignment(org, user)` | 20260826130000 (C8) | C41 : validation technicien assigné avant `assign_dispatch()` |
| `public.record_audit_log(org, action, entity_type, entity_id, metadata)` | 20260902000000 (C6) | Toute mutation critique |
| `public.insert_event_once(org, key, type, source, entity_type, entity_id, payload)` | C24 | Émission d'événements idempotents |
| `public.insert_attention_once(org, key, category, reason, title, priority, ...)` | C24 | Émission d'attentions idempotentes |
| `public.record_provider_delivery(org, provider, provider_event_id, ...)` | C10 | C44 SMS + C45 trust + C46 Trackdéchets pour dedup webhook |

### 5.3 Providers seams déjà établies

| Interface | Fichier | Adapters | Réutilisation |
|---|---|---|---|
| `EmailProvider` | `src/lib/email/provider.ts` | `ResendEmailProvider` | Pattern à copier pour `SmsProvider` (C44), `TrustProvider` (C45), `TrackdechetsProvider` (C46) |
| `EInvoicingProvider` | `src/lib/einvoicing/provider.ts` | `TestEInvoicingProvider`, `PendingProductionEInvoicingProvider` | Pattern DB-gate à copier (service_role webhook + TEST bypass) |
| `VoiceProvider`, `SpeechToTextProvider` | `src/lib/voice/provider.ts` | `Test*`, `PendingProduction*` | Idem C44 pour SMS (opt-out, quiet hours) |

### 5.4 Idempotence

Table + partial unique index pattern déjà utilisé : `outbound_messages`,
`attention_items`, `events`, `provider_delivery_receipts`. **Ne pas créer une
nouvelle table dedup par capacité.** Reprendre `(organization_id, idempotency_key)`
partial unique.

Key builder : `src/lib/idempotency/keys.ts`. Ajouter les nouvelles clés ici
(dispatchAssignmentKey, procedureRunStepKey, smsIntentKey, trustRequestKey,
paymentRecordKey, renewalCaseKey).

---

## 6. Nouvelles tables et RPC — vue synthétique (détails en §7)

**Total : 24 tables neuves, ~55 RPC neuves.** Chaque milestone détaille son
propre delta ; ce tableau est un compteur pour dimensionner.

| Milestone | Tables neuves | RPC neuves | Types Supabase à régénérer |
|---|---|---|---|
| C41 | 3 (field_vehicles, intervention_dispatch_assignments, technician_availability_blocks) | ~7 (assign, acknowledge, reorder_route, mark_en_route, release, get_team_dispatch_day, get_dispatch_conflicts) | oui |
| C42 | 3 (fleet_location_pings, fleet_tracking_policies, fleet_route_estimates) [+1 optionnel geofence_events] | ~5 (record_ping, latest_positions, route_freshness, eta_snapshot, policy_update) | oui |
| C43 | 5 (field_procedure_templates, field_procedure_steps, intervention_procedure_runs, field_step_results, binary_field_artifacts) | ~8 (start_run, submit_step_result, reserve_artifact, finalize_artifact, submit_signature, complete_run, resolve_conflict, request_review) | oui |
| C44 | 2 (sms_templates, sms_opt_outs) [+ extension `outbound_messages`] | ~5 (send_sms_intent, mark_delivered, mark_undeliverable, opt_out, ingest_webhook) | oui |
| C45 | 4 (document_versions, trust_providers, document_trust_requests, document_trust_evidence) | ~6 (create_version, request_trust, mark_submitted, ingest_provider_evidence, verify_evidence, cancel_request) | oui |
| C46 | 2 (waste_dossiers, trackdechets_submissions) | ~5 (create_dossier, prepare_submission, mark_provider_pending, ingest_submission_ack, mark_rejected) | oui |
| C47 | 2 (payment_records, invoice_line_items) [+ extension `invoices`.invoice_kind, `einvoicing_submissions`.facturx_status] | ~7 (prepare_deposit, prepare_final, record_payment, reconcile_payment, reverse_payment, prepare_facturx, mark_facturx_ready) | oui |
| C48 | 3 (contract_versions, renewal_cases, amendment_versions) [+ éventuel pricing_formula_snapshots] | ~7 (open_renewal_case, propose_amount, approve_renewal, send_proposal, record_acceptance, cancel_renewal, mark_effective) | oui |
| C49 | 0 (integration only) | 1 read-model composite (`get_dashboard_snapshot(org, role, timezone)`) | oui |

---

## 7. Détail par capacité

### C41 — Dispatch / planning avancé

**Objectif :** représenter un tableau d'affectation équipe (technicien × véhicule ×
créneau × ordre de tournée) distinct du cycle métier d'`interventions`.

**Réutilise :** `interventions` (cycle de travail), `organization_members` (auteur),
`assert_tenant_active_assignment` (garde), `events`, `audit_logs`.

**Nouvelles tables :**
- `field_vehicles(id, organization_id, label, registration nullable, external_ref nullable, status ACTIVE|UNAVAILABLE|RETIRED, metadata jsonb, created_at, updated_at)` — RLS org-scoped.
- `intervention_dispatch_assignments(id, organization_id, intervention_id, technician_user_id, vehicle_id nullable, scheduled_start, scheduled_end, route_order int nullable, dispatch_status enum, version int, created_at, updated_at)` — version pour compare-and-set, FK vers `interventions(id, organization_id)` composite (déjà unique via C40).
- `technician_availability_blocks(id, organization_id, user_id, from_at, to_at, reason enum LEAVE|SICK|TRAINING|OTHER, source MANUAL|SYSTEM, note, created_at)` — RLS.

**Machine d'état dispatch (distincte d'`interventions.status`) :**
`DRAFT → ASSIGNED → ACKNOWLEDGED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED`
+ `CANCELLED` (terminal) + `NEEDS_ATTENTION` (parking).

**Relation autoritaire :**
- `interventions.status` reste autoritaire pour le **cycle de travail**.
- `dispatch_status` autoritaire pour le **cycle logistique**.
- Compatibilité : `COMPLETED` dispatch requiert `intervention.status ∈ {COMPLETED, NEEDS_ATTENTION}`. `CANCELLED` dispatch autorisé sur toute `intervention.status`. Transition documentée dans une table de compatibilité en migration.

**RPC prévues :**
- `assign_dispatch(org, intervention, technician, vehicle_opt, start, end, version_expected)` — insert ou compare-and-set.
- `acknowledge_dispatch(org, assignment, acknowledged_by, version_expected)` — ASSIGNED→ACKNOWLEDGED.
- `reorder_route(org, technician, date, ordered_assignment_ids[])` — set `route_order` atomiquement.
- `mark_en_route(org, assignment, at, version_expected)` — ACKNOWLEDGED→EN_ROUTE.
- `release_assignment(org, assignment, reason, version_expected)` — any→CANCELLED.
- `get_team_dispatch_day(org, date, tz)` — read, groupé par technicien.
- `get_dispatch_conflicts(org, horizon_days)` — double booking technicien, double booking véhicule, fenêtre invalide, membre inactif, cross-tenant tentative.

**Attentions (Today engine) :**
- `SOLD_NOT_DISPATCHED` — opportunité gagnée sans assignment sur horizon configurable.
- `DISPATCH_CONFLICT` — double-booking détecté.
- `DISPATCH_NOT_ACKNOWLEDGED` — assignment `ASSIGNED` depuis > N minutes (règle par défaut ≠ calibrée).

**Risques :**
- **R41-1** — Double machine d'état sans règle claire → confusion. **Mitigation :** table de compatibilité + tests transition croisée.
- **R41-2** — Perf : `get_team_dispatch_day` sur grande org → index composé `(organization_id, technician_user_id, scheduled_start)`.

**Critères d'acceptation :**
- Cross-tenant refusé (offensive test).
- Double booking technicien/véhicule détecté par `get_dispatch_conflicts`.
- Version stale (compare-and-set) → refus + audit.
- Idempotence : `assign_dispatch` avec même clé métier → no-op tracé.
- Terminal state guard (COMPLETED dispatch immutable).
- Audit + event émis à chaque transition.
- Timezone : `get_team_dispatch_day` prend un `tz` explicite, teste bornes UTC.

---

### C42 — GPS / fleet telemetry / ETA honnête

**Objectif :** représenter des positions de véhicule et une ETA calculée par provider,
sans transformer SESIRA en système de surveillance opaque.

**Réutilise :** `field_vehicles` (C41), `organization_members`, `events`,
`audit_logs`, `intervention_dispatch_assignments` (C41).

**Nouvelles tables :**
- `fleet_location_pings(id, organization_id, vehicle_id, technician_user_id nullable, dispatch_assignment_id nullable, captured_at, received_at, latitude, longitude, accuracy_m nullable, speed_kph nullable, heading nullable, source, provider_ref nullable, device_ref nullable, offline_client_id nullable)` — RLS ; partial unique index sur `(organization_id, vehicle_id, offline_client_id) WHERE offline_client_id IS NOT NULL`.
- `fleet_tracking_policies(id, organization_id, enabled bool, purpose text, retention_days int, allowed_hours_json jsonb nullable, session_based bool, freshness_seconds int, created_at, updated_at)` — 1 policy par org (unique).
- `fleet_route_estimates(id, organization_id, dispatch_assignment_id, distance_m nullable, duration_seconds nullable, calculated_at, provider_kind, provider_ref nullable, status READY|UNAVAILABLE|STALE|FAILED)` — RLS + FK composite `(dispatch_assignment_id, organization_id)`.
- (optionnel, phase 2) `fleet_geofence_events(id, organization_id, vehicle_id, intervention_id nullable, kind ENTERED_SITE|EXITED_SITE, at, source, note)`.

**Provider seam :** `RoutingProvider` interface (`estimateRoute(from, to) → READY|UNAVAILABLE|FAILED`). Adapters : `TestRoutingProvider`, `PendingProductionRoutingProvider`. Sans clé provider → `UNAVAILABLE`, jamais fallback fantaisiste.

**Read models :**
- `latest_vehicle_positions(org)` — dernier ping par véhicule + `age_seconds`, `is_fresh` (calculé vs `freshness_seconds` de la policy).
- `technician_route_with_freshness(org, user, date)` — join dispatch × ping frais.
- `dispatch_eta_snapshot(org, assignment)` — expose `calculated_at`, `provider_kind`, `status`, jamais une valeur inventée.

**Attentions :**
- Par défaut, **aucune attention** "GPS perdu".
- Seulement si `fleet_tracking_policies.session_based = true` **et** dispatch actif : émission `TELEMETRY_STALE` si dernier ping > threshold.

**Contraintes privacy :**
- Purge automatique par job (à ordonnancer en C42 mais l'implémenter en RPC helper `purge_expired_pings(org)` déclenchable). Trace de purge dans `audit_logs`.
- Aucune analyse comportementale, aucun scoring conducteur (INV-06).
- Le technicien insère uniquement pour ses assignments (garde RPC : `dispatch_assignment.technician_user_id = auth.uid()`).

**Risques :**
- **R42-1** — Volume énorme (1 ping / 30 s × N véhicules × 8 h). **Mitigation :** partitioning mensuel `fleet_location_pings` en migration séparée si besoin ; retention agressive par défaut (30 jours).
- **R42-2** — Reveal cross-tenant via `provider_ref` deviné. **Mitigation :** RLS + jamais exposer `provider_ref` côté client.

**Critères d'acceptation :**
- Replay idempotent (même `offline_client_id`).
- Out-of-order pings acceptés (utiliser `captured_at` comme référence).
- Stale point clairement marqué (`is_fresh = false`).
- Cross-tenant test offensif.
- Technicien ne peut pas spoofer un autre user/vehicle (RPC guard).
- Retention purge testée sur données synthétiques.
- Provider absent → `UNAVAILABLE`, jamais `READY` inventé.
- Provider error → `FAILED`, jamais success.

---

### C43 — Procédures terrain guidées + binaires offline + signature client

**Objectif :** représenter un workflow de chantier guidé versionné (étape × preuve ×
signature) au-dessus de `interventions`, offline-first.

**Réutilise :** `interventions`, `intervention_field_artifacts` (C36), Supabase Storage
(bucket privé), `assert_tenant_active_assignment`, `events`, `audit_logs`.

**Nouvelles tables :**
- `field_procedure_templates(id, organization_id nullable /* nullable = catalogue global */, key text, version int, label, sector_key nullable, active bool, created_at, updated_at)` — unique `(organization_id, key, version)`.
- `field_procedure_steps(id, template_id, ordinal int, kind CHECK|MEASUREMENT|TEXT|PART|PHOTO|SIGNATURE|REGULATORY_CONFIRMATION, required bool, unit nullable, range_min nullable, range_max nullable, human_wording text, metadata jsonb, created_at)` — unique `(template_id, ordinal)`.
- `intervention_procedure_runs(id, organization_id, intervention_id, template_id, template_version int, status NOT_STARTED|IN_PROGRESS|READY_FOR_REVIEW|COMPLETED|NEEDS_ATTENTION, started_at nullable, completed_at nullable, created_at, updated_at)` — snapshot du `template_version` (INV-03 style).
- `field_step_results(id, run_id, step_id, captured_at, value_json jsonb, actor_user_id, device_ref nullable, offline_client_id nullable, sync_status SYNCED|CONFLICT|IGNORED, conflict_reason nullable, created_at)` — partial unique `(run_id, step_id, offline_client_id) WHERE offline_client_id IS NOT NULL`.
- `binary_field_artifacts(id, organization_id, run_id nullable, step_result_id nullable, intervention_id, kind PHOTO|SIGNATURE|DOCUMENT, storage_bucket, storage_path, sha256, content_type, size_bytes, captured_at, upload_status RESERVED|UPLOADED|FINALIZED|CONFLICT|IGNORED, offline_client_id nullable, uploaded_by_user_id, created_at)` — unique `(organization_id, sha256)`.

**Protocole binaire :**
1. `reserve_binary_artifact(org, intervention, kind, offline_client_id, expected_sha256)` → renvoie `artifact_id` + signed upload path.
2. Client upload direct dans Storage (bucket privé).
3. `finalize_binary_artifact(org, artifact_id, actual_sha256, size_bytes, content_type)` → transitions RESERVED→FINALIZED si `actual_sha256 = expected_sha256`, sinon CONFLICT.

**Signature client :** stockée comme `binary_field_artifact.kind='SIGNATURE'` + payload snapshot :
```json
{
  "signer_name": "Jean Dupont",
  "signer_role": "Responsable site",
  "signed_at": "2026-09-07T14:03:12Z",
  "consent_text_snapshot": "J'atteste de la bonne exécution...",
  "consent_version": "2026-09"
}
```
**Wording strict :** libellé UI "Émargement client" — jamais "Signature électronique qualifiée" ni "eIDAS". C45 fournira la vraie qualification.

**RPC prévues :**
- `start_procedure_run(org, intervention, template_id, template_version)`.
- `submit_step_result(org, run, step, value, captured_at, actor, offline_client_id)`.
- `reserve_binary_artifact(...)` / `finalize_binary_artifact(...)`.
- `submit_signature_evidence(org, run, signer_name, signer_role, artifact_id, consent_version)`.
- `mark_run_ready_for_review(org, run)` / `complete_run(org, run)`.
- `resolve_step_conflict(org, step_result, actor, decision, note)`.

**Validation :** plage `range_min/range_max` peut générer `NEEDS_ATTENTION`. **Jamais**
un diagnostic ou verdict "conforme". L'IA (C44…) peut structurer du texte mais pas
fabriquer une mesure.

**Attentions :**
- `PROCEDURE_STEP_MISSING` — étape required non renseignée avant `complete_run`.
- `OFFLINE_CONFLICT` — sync_status = CONFLICT.
- `PROCEDURE_READY_FOR_REVIEW` — signalement au responsable.

**Risques :**
- **R43-1** — Storage bucket cross-tenant. **Mitigation :** RLS via `storage.foldername(name)[1] = organization_id`.
- **R43-2** — Templates globaux vs org : conflit de version. **Mitigation :** snapshot `template_version` dans le run.

**Critères d'acceptation :**
- Étapes ordonnées respectées.
- Required step guard avant `complete_run`.
- Offline replay idempotent.
- Duplicate `finalize_binary_artifact` avec sha256 divergent → CONFLICT.
- Wrong sha256 → refus finalize.
- Storage reference cross-tenant refusée (offensive test).
- COMPLETED run immutable.
- Signature evidence snapshot immutable (le `consent_text_snapshot` ne bouge pas).
- Conflict préservé jamais silencieusement drop.

---

### C44 — SMS transactionnel contrôlé

**Objectif :** canal SMS réel et auditable pour avis J-1, changement horaire, lien
facture, relance autorisée — sans envoyer si aucun provider production configuré.

**Réutilise :** `outbound_messages` (C9) étendu, pattern `EmailProvider`,
`record_provider_delivery` (webhook dedup), `insert_event_once`, `audit_logs`.

**Extension `outbound_messages` :**
- Retirer la contrainte "channel = 'email'" et permettre `'sms'`.
- Ajouter colonnes `to_phone` (nullable, requis si channel='sms'), `body_text_hash`.
- Nouvelle enum `outbound_status_v2` : `DRAFT|READY|WAITING_FOR_APPROVAL|QUEUED|SENT|DELIVERED|FAILED|UNDELIVERED|CANCELLED|OPTED_OUT` (extension de l'existant sans casser email).

**Nouvelles tables :**
- `sms_templates(id, organization_id, key, version int, label, body_template text, allowed_variables text[], transactional bool, quiet_hours_json jsonb, timezone text, created_at, updated_at)` — unique `(organization_id, key, version)`.
- `sms_opt_outs(id, organization_id, phone_e164 text, opted_out_at, source, note, created_at)` — unique `(organization_id, phone_e164)`.

**Provider seam :** `SmsProvider` interface (`send(payload) → HANDED_OFF|PROVIDER_UNAVAILABLE|ERROR`). Adapters : `TestSmsProvider`, `PendingProductionSmsProvider`. Copie stricte du pattern EInvoicing.

**Distinction SENT vs DELIVERED :**
- `SENT` = provider a accepté (retour synchrone de `send()`).
- `DELIVERED` = webhook delivery receipt reçu (via `record_provider_delivery`).
- Ne **jamais** confondre les deux.

**Politiques :**
- Transactionnel vs marketing : colonne `transactional bool` sur template ; marketing exige consent explicit (autre table à décider en C44 si besoin, non prévue par défaut ici).
- Opt-out : check dans `sms_opt_outs` avant émission.
- Quiet hours : timezone org + fenêtre configurée sur template.
- Templates versionnés (INV-03 style : version snapshot dans `outbound_messages.metadata`).
- Variables strictes (whitelist `allowed_variables`).
- URL courte/signée : à externaliser (hors C44), pas de PII dans SMS.
- Téléphone absent/non vérifié : politique par défaut = refus.

**Automation :** respect OBSERVATION/SHADOW/APPROVAL/AUTOMATIC (C5+C12).
- SHADOW crée `outbound_messages.status = DRAFT` avec metadata proposal, jamais SENT.
- APPROVAL crée `WAITING_FOR_APPROVAL` — RPC `approve_sms(org, message_id, approver)` → `READY`.
- AUTOMATIC respecte quiet hours + opt-out + rate limit.

**RPC prévues :**
- `record_sms_intent(org, idempotency_key, template_key, template_version, to_phone, variables_json, transactional)` — QUEUED ou WAITING_FOR_APPROVAL selon policy.
- `mark_sms_sent(org, message_id, provider_message_id)` — QUEUED→SENT (RPC service_role).
- `mark_sms_delivered(org, message_id, delivered_at)` — SENT→DELIVERED via webhook.
- `mark_sms_undeliverable(org, message_id, error_class, error_message)` — SENT/QUEUED→UNDELIVERED|FAILED.
- `record_sms_opt_out(org, phone, source, note)`.
- `ingest_sms_webhook(org, provider, event_json)` — signature verified côté application avant appel RPC ; RPC gate service_role.

**Attentions :**
- `SMS_UNDELIVERABLE` — pour actions attendues.
- `SMS_OPTED_OUT` — si tentative sur numéro opt-out.

**Risques :**
- **R44-1** — Fusion silencieuse SENT/DELIVERED côté UI. **Mitigation :** contrat UI explicite dans C49 read model.
- **R44-2** — Coût runaway (SMS = payant). **Mitigation :** rate limit par org configuré via `sms_templates` ; audit `SMS_SEND` count par jour.

**Critères d'acceptation :**
- No provider configured → PENDING sentinel, aucun envoi.
- SHADOW ne déclenche aucune action externe.
- APPROVAL gate respecté (test offensif).
- Replay idempotent.
- Opt-out respecté.
- Quiet hours respectées.
- Webhook signature verification obligatoire.
- Out-of-order delivery receipt géré.
- Cross-tenant test.

---

### C45 — Preuve documentaire, e-signature/e-seal, timestamp RFC3161/eIDAS evidence

**Objectif :** couche de preuve documentaire provider-backed pour avenants,
contrats reconduits, rapports, certificats, sans déclaration juridique non prouvée.

**Réutilise :** `documents` (C27), Supabase Storage, `record_provider_delivery`,
`events`, `audit_logs`, pattern `EInvoicingProvider`.

**Distinction critique (à ne jamais fusionner UI) :**
1. Hash interne (sha256) — SESIRA seul.
2. Timestamp externe (RFC3161) — provider timestamp seul.
3. Signature provider — utilisateur signe via provider (AES/QES selon provider).
4. Seal provider — organisation scelle via provider (AdES/QESeal).
5. Niveau juridique **déclaré par le provider** (jamais inventé).

**Nouvelles tables :**
- `document_versions(id, organization_id, document_id, version int, sha256 text, mime_type, source_reference nullable, storage_bucket, storage_path, size_bytes, created_at)` — unique `(document_id, version)`, `(organization_id, sha256)` non unique (même fichier peut être plusieurs docs).
- `trust_providers(id, provider_kind text, status ACTIVE|PENDING|DISABLED, supported_capabilities text[] /* TIMESTAMP, SIGNATURE, SEAL */, region text, production_ready bool, created_at, updated_at)` — global registry (non org-scoped ; RLS anon-deny).
- `document_trust_requests(id, organization_id, document_version_id, requested_capability TIMESTAMP|SIGNATURE|SEAL, requested_level text /* ADVANCED, QUALIFIED, ETC. — string libre, jamais enum inventé */, status DRAFT|READY|SUBMITTED|CONFIRMED|REJECTED|FAILED|CANCELLED, provider_id nullable, provider_snapshot jsonb, idempotency_key text, created_at, updated_at)` — unique `(organization_id, idempotency_key)`.
- `document_trust_evidence(id, request_id, provider_ref text, confirmed_at, raw_evidence_storage_path text, certificate_metadata jsonb /* parsed, sanitized */, timestamp_token_reference nullable, signature_seal_level_reported_by_provider text, verification_result PASS|FAIL|UNKNOWN, verification_performed_at, created_at)` — immutable après INSERT (trigger).

**Provider seam :** `TrustProvider` interface avec méthodes séparées `requestTimestamp`,
`requestSignature`, `requestSeal`. Chacune renvoie `HANDED_OFF|PROVIDER_UNAVAILABLE|ERROR`.

**RFC3161 :** si implémenté, `document_trust_evidence.timestamp_token_reference` pointe vers le token stocké en Storage privé. Verification :
1. Décoder le token TSR.
2. Vérifier signature CA du timestamp.
3. Comparer `token.hash = document_version.sha256` **et** `token.hash_algorithm = 'sha256'`.
4. Stocker le résultat dans `verification_result`.

**RPC prévues :**
- `create_document_version(org, document_id, sha256, storage_path, size_bytes, mime_type)`.
- `request_document_trust(org, document_version_id, capability, requested_level, provider_id, idempotency_key)` → `DRAFT`.
- `mark_trust_request_ready(org, request_id)` / `mark_trust_request_submitted(org, request_id, external_ref)` — RPC service_role uniquement.
- `record_trust_evidence(org, request_id, provider_ref, confirmed_at, raw_storage_path, cert_metadata, timestamp_token_ref, level_reported)` — service_role, insert-once.
- `verify_trust_evidence(org, evidence_id)` — RPC système déclenchable.
- `cancel_trust_request(org, request_id, reason)`.

**UI contract prévu (C49 read model) :**
- "Hash enregistré" — toujours possible.
- "Horodatage confirmé par {provider}" — si `document_trust_evidence.verification_result = 'PASS'` sur TIMESTAMP.
- "Signature confirmée par {provider} — niveau {level}" — level = `signature_seal_level_reported_by_provider` (jamais recodé).
- **Jamais** "certifié" ou "qualifié" sauf si `level ∈ {QUALIFIED, QES, QESeal}` **et** provider `production_ready = true`.

**Attentions :**
- `TRUST_REQUEST_PENDING_LONG` — SUBMITTED > N heures sans callback.
- `TRUST_EVIDENCE_VERIFICATION_FAILED` — verification_result = FAIL.

**Risques :**
- **R45-1** — Deviner endpoints d'un provider inconnu. **Mitigation :** commencer par TEST provider + PendingProduction ; refuser d'implémenter un adapter réel sans doc officielle disponible dans l'env.
- **R45-2** — Fuite de clé privée dans les logs. **Mitigation :** grep test `pg_proc.prosrc` interdit `-----BEGIN PRIVATE KEY-----`, `-----BEGIN CERTIFICATE-----` dans les fonctions.

**Critères d'acceptation :**
- Hash mismatch → CONFIRMED refusé.
- Replay idempotent.
- Provider pending → jamais CONFIRMED.
- REJECTED enregistré tel quel.
- Evidence immutable (trigger BEFORE UPDATE raise).
- Cross-tenant refusé.
- Wrong document version → refus.
- Out-of-order webhook → dedup via `record_provider_delivery`.
- Aucun faux succès.

---

### C46 — Trackdéchets

**Objectif :** contrat Core d'envoi et d'accusé Trackdéchets pour déchets/fluide.

**Règle absolue :** **ne pas deviner l'API Trackdéchets.** Vérifier la doc officielle
avant. Si l'env ne permet pas la vérification : domain model + provider seam
uniquement, avec `PendingProductionTrackdechetsProvider`.

**Réutilise :** `interventions`, `customers`, `documents` (C27),
`record_provider_delivery`, `events`, `audit_logs`, pattern `EInvoicingProvider`.

**Nouvelles tables :**
- `waste_dossiers(id, organization_id, intervention_id nullable, customer_id nullable, site_id nullable, waste_category text, waste_code text nullable /* CED */, quantity numeric, unit text, producer_ref text nullable, carrier_ref text nullable, destination_ref text nullable, status PREPARING|READY|SUBMITTED|CANCELLED, created_at, updated_at)` — RLS.
- `trackdechets_submissions(id, organization_id, waste_dossier_id, provider_id, dossier_external_id text nullable, payload_snapshot jsonb, validation_gaps text[], status PREPARING|READY|PROVIDER_PENDING|SUBMITTED|ACKNOWLEDGED|REJECTED|FAILED|CANCELLED, external_ref nullable, submitted_at nullable, acknowledged_at nullable, rejection_reason text nullable, idempotency_key text, created_at, updated_at)` — unique `(organization_id, idempotency_key)`.

**Provider seam :** `TrackdechetsProvider` interface (`submit(dossier_payload) → HANDED_OFF|PROVIDER_UNAVAILABLE|ERROR`). Adapters : `TestTrackdechetsProvider`, `PendingProductionTrackdechetsProvider`.

**Contraintes wording :**
- `SUBMITTED` uniquement après retour synchrone `HANDED_OFF` du provider.
- `ACKNOWLEDGED` uniquement sur webhook réel.
- **Jamais** "bordereau officiel" produit localement — c'est un identifiant provider.

**RPC prévues :**
- `create_waste_dossier(org, intervention_opt, customer_opt, category, code_opt, qty, unit, ...)`.
- `prepare_trackdechets_submission(org, dossier_id, provider_id, idempotency_key)` — validation gaps calculées.
- `mark_submission_submitted(org, submission_id, external_ref)` — RPC service_role après retour provider.
- `mark_submission_acknowledged(org, submission_id, acknowledged_at, provider_ref)` — RPC service_role via webhook.
- `mark_submission_rejected(org, submission_id, reason)` — RPC service_role.
- `cancel_submission(org, submission_id, reason)`.

**Attentions :**
- `WASTE_DOSSIER_INCOMPLETE` — validation_gaps non vides.
- `WASTE_SUBMISSION_REJECTED` — rejet réel.
- `WASTE_PROVIDER_UNAVAILABLE` — provider status DISABLED/PENDING.

**Risques :**
- **R46-1** — Prétendre soumettre sans avoir soumis. **Mitigation :** SUBMITTED impossible sans passage par RPC service_role.
- **R46-2** — Codes CED faux. **Mitigation :** aucune génération automatique — champ libre humain (au moins en V1).

**Critères d'acceptation :**
- Provider pending → SUBMITTED refusé.
- Payload gaps affichés.
- Replay idempotent.
- Cross-tenant refusé.
- ACKNOWLEDGED uniquement sur webhook.
- REJECTED enregistré tel quel.
- Secrets provider absents des logs.

---

### C47 — Cycle facture chantier : acompte, solde, paiements, Factur-X

**Objectif :** étendre C28+C34 pour couvrir acompte/solde/paiement/reçu et Factur-X,
sans devenir ledger comptable de référence.

**Boundary :** la compta/ERP externe reste source de vérité si connectée. SESIRA
prépare/synchronise/suit — n'invente jamais qu'un virement est reçu (INV-05).

**Réutilise :** `invoices` (C28), `einvoicing_submissions` (C34),
`einvoicing_provider_events` (C34), pattern `EInvoicingProvider`.

**Extensions à `invoices` :**
- Nouvelle colonne `invoice_kind text` — enum applicatif `STANDARD|DEPOSIT|FINAL|CREDIT_NOTE` (default `STANDARD`, jamais NULL). Migration doit backfill toutes les lignes existantes en `STANDARD`.
- Nouvelle colonne `parent_invoice_id uuid nullable` — FK composite `(id, organization_id)` vers `invoices`. `DEPOSIT` et `FINAL` peuvent référencer un parent (opportunité/quote) ; `CREDIT_NOTE` référence la facture qu'elle avoire.

**Extension à `einvoicing_submissions` :**
- Nouvelle colonne `facturx_status text` — `NOT_APPLICABLE|PREPARING|READY|VALIDATION_FAILED|EXPORTED` (default `NOT_APPLICABLE`).
- Pas de nouvelle machine d'état e-invoicing — réutilise celle existante.

**Nouvelles tables :**
- `invoice_line_items(id, invoice_id, ordinal int, label text, description text nullable, quantity numeric, unit text, unit_price numeric, vat_rate numeric, total_ht numeric, total_ttc numeric, metadata jsonb, created_at)` — requis pour Factur-X ; unique `(invoice_id, ordinal)`.
- `payment_records(id, organization_id, invoice_id, amount numeric, currency text, received_at, method text /* WIRE|CARD|CASH|CHECK|OTHER */, source MANUAL|ACCOUNTING_PROVIDER, external_ref text nullable, status RECORDED|CONFIRMED|REVERSED, evidence_document_id nullable, note text nullable, created_by_user_id, created_at)` — partial unique `(organization_id, external_ref) WHERE external_ref IS NOT NULL`.
- (déjà présent implicitement) allocation paiement → facture : porté par `payment_records.invoice_id` (relation 1-1). Pour paiement multi-facture, table `payment_allocations` optionnelle en phase 2.

**Garde-fous stricts :**
- Devise unique par allocation (RPC check `payment.currency = invoice.currency`).
- Pas de double allocation.
- REVERSED = ligne conservée + statut mis à jour, jamais DELETE.
- Overpayment refusé sauf flag org-level `allow_overpayment` (default false).
- Somme des payments CONFIRMED ≥ invoice.amount → transition `invoices.status = PAID`.

**RPC prévues :**
- `prepare_deposit_invoice(org, parent_ref, amount, currency, external_ref_opt)`.
- `prepare_final_invoice(org, parent_ref, amount, currency, deducted_deposits[])`.
- `record_payment(org, invoice_id, amount, currency, received_at, method, source, external_ref_opt, evidence_document_id_opt, note_opt)` — MANUAL uniquement pour ACTIVE members ; ACCOUNTING_PROVIDER via service_role.
- `reconcile_payment(org, payment_id, provider_ref, provider_confirmed_at)` — RECORDED→CONFIRMED via webhook accounting provider (si intégration).
- `reverse_payment(org, payment_id, reason)` — CONFIRMED→REVERSED, audit + attention.
- `prepare_facturx(org, submission_id)` — extrait `invoice_line_items` + calcule XML CII embedded ; `facturx_status = READY` si validation passe.
- `mark_facturx_exported(org, submission_id, exported_at)` — service_role.

**Factur-X :**
- Créer une abstraction `FacturXBuilder` (jamais prétendre PDF/A-3 valide sans validation technique).
- Le read model distingue `PREPARING|READY|VALIDATION_FAILED|EXPORTED`.
- Réutilise C34 pour transmission provider (aucun second e-invoicing state machine).

**Attentions :**
- `DEPOSIT_EXPECTED_NOT_RECEIVED` — règle contrat déclarée.
- `PAYMENT_PROMISED_OVERDUE` — commitment humain enregistré et dépassé.
- `FINAL_INVOICE_TO_PREPARE` — condition réelle atteinte (visite finale complétée, etc.).
- `FACTURX_VALIDATION_FAILED`.
- `EINVOICING_PROVIDER_REJECTION` — déjà géré par C34.

**Risques :**
- **R47-1** — Devenir comptable de facto (INV-05). **Mitigation :** `payment_records` observe uniquement ; source doit être MANUAL ou ACCOUNTING_PROVIDER webhook — jamais initié par SESIRA.
- **R47-2** — Devise mélangée. **Mitigation :** RPC check + test offensif.
- **R47-3** — Factur-X invalide silencieusement. **Mitigation :** VALIDATION_FAILED explicite, jamais EXPORTED sans validation.

**Critères d'acceptation :**
- Partial payment supporté.
- Duplicate webhook (accounting provider) dedup via `record_provider_delivery`.
- Reversed géré, ligne conservée.
- Somme deposits + final = total contrat (invariant testé).
- Currency guard.
- Cross-tenant test.
- Factur-X invalide → jamais READY.
- Provider e-invoicing truth (déjà C34, non régressé).

---

### C48 — Renouvellement contrat + avenants

**Objectif :** proposition de renouvellement + indexation revue humainement + avenant
+ période décision/annulation + transmission + signature via C45.

**Réutilise :** `maintenance_contracts` (C29), pattern `document_trust_requests` (C45),
`events`, `audit_logs`, `insert_attention_once`.

**Nouvelles tables :**
- `contract_versions(id, organization_id, contract_id, version int, effective_from date, effective_to date nullable, snapshot_json jsonb /* état complet du contrat à cette version */, created_at)` — immutable (BEFORE UPDATE trigger raise) ; unique `(contract_id, version)`.
- `renewal_cases(id, organization_id, contract_id, opened_at, status DRAFT|REVIEW_REQUIRED|APPROVED|READY_TO_SEND|SENT|CLIENT_ACCEPTED|CANCELLATION_WINDOW|EFFECTIVE|DECLINED|CANCELLED|NEEDS_ATTENTION, proposed_amount numeric nullable, proposed_currency text nullable, pricing_formula_snapshot jsonb nullable /* formule + source + résultat calculé */, human_approved_at timestamptz nullable, human_approved_by uuid nullable, sent_at timestamptz nullable, sent_evidence_id uuid nullable /* FK document_trust_evidence */, client_response_at timestamptz nullable, client_response_source MANUAL|EMAIL|SIGNED_DOCUMENT nullable, effective_at timestamptz nullable, cancellation_deadline timestamptz nullable, notes text nullable, version int /* CAS */, created_at, updated_at)` — 1 active par contrat (unique partial).
- `amendment_versions(id, organization_id, contract_id, amendment_kind text, document_version_id uuid /* FK C45 */, drafted_at, approved_at nullable, approved_by nullable, sent_at nullable, effective_from date nullable, effective_to date nullable, snapshot_json jsonb, status DRAFT|APPROVED|SENT|EFFECTIVE|SUPERSEDED|CANCELLED, created_at)`.
- (optionnel) `pricing_formulas(id, organization_id nullable, key text, version int, formula_expression text, source_reference text /* e.g. Syntec + URL */, effective_from date, effective_to date nullable)` — jamais hardcodé Syntec ; toujours donnée de référence versionnée (INV-03 style).

**Machine d'état `renewal_cases` :**
`DRAFT → REVIEW_REQUIRED → APPROVED → READY_TO_SEND → SENT → CLIENT_ACCEPTED → CANCELLATION_WINDOW → EFFECTIVE`
+ branches `→ DECLINED` (client refuse), `→ CANCELLED` (org annule), `→ NEEDS_ATTENTION` (bloqueur).

**Indexation :**
- Formule + version enregistrées dans `pricing_formula_snapshot`.
- Résultat calculé traçable (calcul_at, inputs, source).
- **Jamais** décision finale automatique par défaut — `human_approved_at` requis.

**Document Trust :**
- Avenant → `document_versions` (C45) → `document_trust_requests` pour signature/seal/timestamp.
- `renewal_cases.sent_evidence_id` pointe vers l'evidence de scellement/signature.

**Pas d'auto-renouvellement silencieux :**
- Transition vers `EFFECTIVE` **uniquement** si :
  1. `human_approved_at` posé, OU
  2. Règle contractuelle explicite dans `pricing_formulas` avec `auto_renewal = true`, ET
  3. `client_response_at` non NULL avec source non ambiguë, ET
  4. `cancellation_deadline < now()`.

**RPC prévues :**
- `open_renewal_case(org, contract_id, opened_by)`.
- `propose_renewal_amount(org, case_id, formula_snapshot, amount, currency)` — REVIEW_REQUIRED.
- `approve_renewal_case(org, case_id, approver_user_id)` — APPROVED.
- `send_renewal_proposal(org, case_id, sent_evidence_id, sent_at)` — service_role après appel externe.
- `record_client_response(org, case_id, response, source, at)` — CLIENT_ACCEPTED ou DECLINED.
- `mark_renewal_effective(org, case_id, effective_at)` — garde-fous stricts appliqués.
- `cancel_renewal_case(org, case_id, reason)`.

**Attentions :**
- `RENEWAL_TO_PREPARE` — contrat approche end_date sans case ouvert.
- `RENEWAL_AWAITING_APPROVAL` — REVIEW_REQUIRED > N jours.
- `RENEWAL_CLIENT_DEADLINE_APPROACHING` — window de décision client < N jours.
- `RENEWAL_MISSING_TRUST_EVIDENCE` — READY_TO_SEND sans document trust.
- `RENEWAL_HUMAN_ACTION_REQUIRED` — bloqueur.

**Risques :**
- **R48-1** — Auto-renouvellement illégal. **Mitigation :** garde-fous compound testés offensivement.
- **R48-2** — Formule Syntec hardcodée. **Mitigation :** `pricing_formulas` table + interdiction grep `syntec` dans le code.

**Critères d'acceptation :**
- State transitions testées exhaustivement.
- Formula snapshot immutable après capture.
- Stale approval (session > N jours) → REVIEW_REQUIRED reset.
- Cancellation window respectée avant EFFECTIVE.
- Provider trust pending → READY_TO_SEND bloqué.
- Cross-tenant test.
- Audit + event à chaque transition.
- Aucune EFFECTIVE sans règles satisfaites.

---

### C49 — Gate final d'intégration + read models Dashboard

**Objectif :** clôture ; audit maturité de toutes les extensions ; read model consolidé
pour éviter que `/app` refasse 10 lectures redondantes.

**Ne PAS ajouter de nouvelle feature.**

**Audit par domaine (9 critères, comme C40) :** functional, tenant-safe, auditable,
idempotent, recoverable, honest UI contract, mobile compatibility si concerné,
accessible semantics, no fake provider success, privacy/retention si GPS/SMS,
regulatory wording boundaries, external provider truth.

**Read model consolidé — `get_dashboard_snapshot(org, role, timezone)` :**
Retourne un JSON structuré par rôle avec :

**Status bar :**
- Niveau d'automation (par domaine ou global).
- Dernier timestamp de données observées réellement calculé.
- Services dégradés uniquement.

**Decisions (max 7 côté UI, contrat explicite) :**
- category, title, detail, action, href/entity_ref, priority, observed_at, why_now.
- monetary_value nullable + currency nullable — **jamais** mélange devises.
- source fact / provenance.

**Money (groupé par devise) :**
- quotes awaiting response.
- sold not scheduled.
- overdue invoices.
- renewals ≤ 60d.

**Field today :**
- intervention + technician + vehicle (si dispo).
- dispatch state (C41).
- latest telemetry freshness (C42, si dispo).
- report review count.
- offline conflicts.
- **jamais** ETA/location inventée.

**Regulatory :**
- leak check deadlines.
- attestations expiry.
- export/CERFA gaps.
- **aucun verdict** de conformité.

**Provider states (uniquement si dégradé/pending/actionable) :**
- SMS (C44).
- e-invoicing (C34+C47).
- document trust (C45).
- Trackdéchets (C46).

**Performance :**
- Éviter N+1.
- SQL/RPC/read-model composition avec `organization_id` scope.
- Mesurer nombre de requêtes et documenter.

**Extension `export_organization_snapshot` (G2 du C40) :**
Ajouter au JSON export toutes les nouvelles tables Wave post-C40 :
`field_vehicles`, `intervention_dispatch_assignments`, `technician_availability_blocks`,
`fleet_location_pings`, `fleet_tracking_policies`, `fleet_route_estimates`,
`field_procedure_templates`, `field_procedure_steps`, `intervention_procedure_runs`,
`field_step_results`, `binary_field_artifacts` (metadata sans blob),
`sms_templates`, `sms_opt_outs`,
`document_versions`, `document_trust_requests`, `document_trust_evidence`,
`waste_dossiers`, `trackdechets_submissions`,
`invoice_line_items`, `payment_records`,
`contract_versions`, `renewal_cases`, `amendment_versions`.

**Critères d'acceptation :**
- Output rôle-based (viewer/admin/owner).
- Multi-currency respecté.
- Aucune coerce d'UNAVAILABLE en 0.
- Aucun provider fake state.
- Cross-tenant test.
- Max 7 decisions contract (soit UI, soit RPC).
- Timezone respectée.
- Export INV-07 étendu et testé.

---

## 8. Risques transverses

| ID | Risque | Mitigation |
|---|---|---|
| RX-1 | Prolifération de state machines contradictoires (intervention/dispatch/procedure/invoice/renewal…) | Chaque milestone doit publier une **table de compatibilité** avec les machines existantes, testée offensivement. |
| RX-2 | Explosion du nombre de tables → complexité RLS | Chaque nouvelle table = RLS + 1 offensive test cross-tenant minimum. |
| RX-3 | Faux succès provider silencieux (violation doctrine §7) | Chaque provider seam : TEST + PENDING + gate SQL `record_*_event` service_role. Grep interdit `SUBMITTED` sans passage par RPC service_role. |
| RX-4 | AI Act annexe III — voir REGULATORY §3 (financement) | C42 GPS **ne devient jamais** un scoring conducteur. Grep interdit `driver_score`, `behaviour_score` sur `fleet_*`. |
| RX-5 | Data Act INV-07 régresse | C49 gate étend `export_organization_snapshot` — testé offensivement (comparaison count(*) tables vs count JSON export). |
| RX-6 | Perf : `get_dashboard_snapshot` devient un monster query | Utiliser materialized views ou plusieurs RPC composées côté application ; documenter le nombre de queries exactes. |
| RX-7 | Storage bucket cross-tenant (C43 binaires, C45 evidence raw) | RLS bucket sur `storage.foldername(name)[1] = organization_id::text` + test offensif upload/download cross-tenant. |
| RX-8 | Retention non exécutée (C42 pings, C44 SMS logs) | RPC `purge_expired_*(org)` par domaine + cron/manuel documenté ; test synthétique volume. |

---

## 9. Contrainte de séquence (répétée pour rappel)

- **Un objectif = un commit → STOP.** (Doctrine SESIRA V1 roadmap.)
- Chaque milestone attend `npm run verify` vert, migrations appliquées, types
  régénérés, tests unitaires + intégration, note de validation technique.
- Aucun `push` automatique — commits stay local until Paul valide.
- Aucun assouplissement RLS, idempotence, audit, tenant isolation.

---

## 10. Doctrine wording à respecter (rappel)

Extrait de REGULATORY.md §1.5 et §7 :

- **Interdits UI :** "conforme", "compliant", "eIDAS qualifié", "déclare pour vous",
  "certifié", "déposé automatiquement", "bordereau officiel" (sauf ref provider),
  "signature électronique qualifiée" (sauf level provider effectif).
- **Autorisés :** "Préparer", "Prêt", "Exporté", "Émargement client", "Hash enregistré",
  "Horodatage confirmé par {provider}", "Transmission fournisseur indisponible",
  "En attente confirmation fournisseur".

---

## 11. Extension `AGENTS.md` recommandée

Ajouter à `AGENTS.md` (racine repo) une section "Post-C40 milestones" listant les
9 milestones + rappel des invariants + interdiction wording — pour que tout agent
futur (Claude ou Codex) lise avant de commencer.

**Non fait dans ce commit** — sera fait au démarrage du C41.

---

## 12. Baseline vérification

- `git status` : clean sauf `SESIRA_AUTH_HANDOFF.md` untracked (hors périmètre).
- `git log -5` : dernier commit `8c55ebd docs: record C40 commit hash`.
- `git branch --show-current` : `claude/core-workflows`.
- `npm run verify` : **ROUGE — voir §2.** 1 warning lint + 3 erreurs typecheck sur
  HEAD C40. À corriger dans un commit dédié `fix: restore c40 typecheck baseline`
  avant démarrage C41.

---

## 13. Livrables du PROMPT 0

- [x] `docs/core/CORE_EXTENSIONS_PLAN.md` (ce fichier)
- [ ] Commit : `docs: plan post-c40 core extensions`
- [ ] `npm run verify` vert avant commit
- [ ] `git diff --check` clean

Aucune migration, aucune RPC, aucun code applicatif dans ce commit. La numérotation
`C41→C49` est réservée par ce document.
