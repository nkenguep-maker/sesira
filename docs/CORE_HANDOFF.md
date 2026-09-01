# SESIRA — UI → Core handoff

## Objective

The UI in this repository is the visual and interaction contract. The incoming core should provide real data, authentication and persistence without replacing the canonical SESIRA screens.

## Canonical UI surfaces

- `/` — landing
- `/login` — sign-in + password recovery entry
- `/update-password` — new-password form
- `/app` — overview
- `/app/clients`
- `/app/devis`
- `/app/suivi`
- `/app/equipe`
- `/app/integrations`
- `/app/parametres`
- `/app/onboarding` — 6-step onboarding

Shared UI:

- `src/components/sesira/app-shell.tsx`
- `src/components/sesira/logo.tsx`
- `src/components/sesira/ui.tsx`
- `src/components/onboarding/onboarding-experience.tsx`
- `src/app/globals.css`

## Integration contracts

Use `src/lib/core/ui-contracts.ts` as the boundary between the core and the UI.

The core can keep its own database/domain types. Map those models to the UI DTOs at server-component, route-handler or adapter boundaries.

### Auth

Bind:

- `signIn`
- `requestPasswordReset`
- `updatePassword`
- `signOut`

The current UI must never show a fake success. Supabase errors should be converted to clear user-facing messages.

### Dashboard

Populate `DashboardSnapshot` with real values only. Unknown/unavailable values remain `null` and render as empty/unconnected states.

### Lists

Map real backend data to:

- `ClientSummary[]`
- `QuoteSummary[]`
- `FollowUpSummary[]`
- `TeamMemberSummary[]`
- `IntegrationSummary[]`

Do not introduce demo rows in production code.

### Onboarding

The UI preserves all 12 form values across its six steps. Connect the final action to `saveOnboardingDraft` and hydrate the form from `getOnboardingDraft` when available.

Steps are canonical:

1. Entreprise
2. Équipe
3. Données
4. E-mail
5. Suivi
6. Observation

## Integration order

1. Merge core dependencies/config without replacing SESIRA UI files.
2. Restore Supabase/server utilities and auth callback routes.
3. Bind `/login` and `/update-password` to real auth.
4. Protect `/app/**` server-side.
5. Bind organization/workspace identity in `AppShell`.
6. Hydrate dashboard and list screens with real data.
7. Persist/resume onboarding.
8. Bind integrations and follow-up automation only when the backend capability exists.
9. Run typecheck, tests, production build and responsive smoke tests.

## Non-negotiables

- No secrets in Git.
- `.env.local` stays ignored.
- No fabricated customer, quote, revenue, member or integration data.
- No success state unless the backend operation actually succeeded.
- Core authorization must be enforced server-side; UI hiding is not access control.
- Preserve the SESIRA naming and current visual system.
