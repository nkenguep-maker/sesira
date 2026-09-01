# SESIRA

SESIRA is being assembled in two layers:

- **UI** — canonical frontend and interaction system in this repository
- **Core** — authentication, Supabase, persistence, business logic and integrations, to be merged into the UI without visual regression

## UI status

Implemented:

- Public landing page
- Login and password-recovery entry
- New-password screen with client-side confirmation validation
- Authenticated application shell
- Dashboard
- Clients
- Devis
- Suivi
- Équipe
- Intégrations
- Paramètres
- Responsive foundations
- Onboarding V1 with 6 steps: Entreprise, Équipe, Données, E-mail, Suivi, Observation
- Onboarding draft preserved across all six UI steps
- Honest empty/unconnected states — no fabricated business data

## Core integration boundary

The typed UI contracts live in:

`src/lib/core/ui-contracts.ts`

The integration instructions for the incoming core live in:

`docs/CORE_HANDOFF.md`

The core should map its own domain/database models to these UI DTOs instead of replacing the canonical SESIRA screens.

## Environment

Copy `.env.example` to `.env.local` locally and populate real values there. Never commit `.env.local` or secrets.

## Run

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run build
```

## Integration principles

- Server-side authorization is mandatory for protected data/actions.
- No fake success states.
- No demo customer, quote, member, revenue or integration data in production code.
- Preserve the SESIRA naming and visual system.
- Keep backend/domain models independent from UI DTOs.
