# SESIRA UI

Frontend-only SESIRA workspace, prepared for integration with the existing SESIRA core.

## Included

- Public landing page
- Login UI
- Password update UI
- Authenticated application shell
- Dashboard
- Onboarding V1 with 6 steps: Entreprise, Équipe, Données, E-mail, Suivi, Observation
- Clients
- Devis
- Suivi
- Équipe
- Intégrations
- Paramètres
- Responsive states and accessible interaction foundations
- Honest empty states: no fabricated business data or fake integration success

## Integration boundary

This repository intentionally contains UI only. Authentication, Supabase calls, persistence, quote data, organization data, members, integrations and tracking should be wired to the SESIRA core instead of being simulated here.

## Run

```bash
npm install
npm run dev
```
