# SESIRA OS — Master Product & Engineering Specification

> Version: 2.0
> Updated: 24 August 2026
> Market: France first
> Product language: French
> Technical language: English allowed internally
> Product type: Multi-tenant B2B SaaS + managed automation service
> Visual system: Midnight Papyrus
> Commercial status: NOT READY FOR COMMERCIAL PRODUCTION
> Current product branch: codex/product-workflows
> Verified product baseline: c29c155401e3d6de4368bb225accbb42060b6634

---

# 1. Purpose

This document is the principal source of truth for SESIRA.

It defines:

- product vision
- product scope
- current implementation state
- client-facing experience
- SESIRA Growth
- automation doctrine
- human-control rules
- technical architecture
- multi-tenancy
- domain entities
- state machines
- events
- scheduling
- idempotency
- AI architecture
- integrations
- observability
- Control Center
- ROI/results
- public diagnostic
- premium quality doctrine
- release gates
- development ownership
- Codex responsibilities
- Claude Code responsibilities
- maturity roadmap

This is no longer a greenfield specification.

Existing working architecture must be preserved unless a demonstrated problem requires change.

---

# 2. Product name

# SESIRA OS

SESIRA is an operational platform for SMEs.

The customer should not perceive SESIRA as:

- an AI chatbot
- an automation builder
- an n8n interface
- a generic CRM
- a collection of disconnected AI tools

The desired perception is:

> Sesira surveille ce qui se passe dans l'entreprise, traite les tâches répétitives et montre à l'équipe ce qui nécessite réellement une décision.

Core principle:

> Automate the normal.
> Surface the exceptions.
> Keep humans in control.

---

# 3. Main product promise

Preferred customer-facing promise:

> Votre entreprise, mieux organisée.

Operational explanation:

> Sesira aide votre entreprise à traiter les nouvelles demandes, suivre les devis et réduire les tâches répétitives.

Long-term positioning:

> Le système qui veille sur le suivi de votre entreprise.

Do not expose technical concepts unless required.

Avoid client-facing terms such as:

- AI agent
- workflow engine
- orchestration
- LLM
- n8n
- prompt
- state machine
- automation run
- Lead Engine
- Quote Recovery

Prefer:

- Traiter les nouvelles demandes
- Relancer les devis
- Trier les emails
- Créer les rapports
- Traiter les documents
- Relancer les factures
- Validation par votre équipe
- À traiter
- Vos résultats

---

# 4. Product structure

SESIRA consists of two complementary layers.

## 4.1 SESIRA OS

Operational layer.

Main responsibilities:

- customers
- incoming requests
- qualification
- quotes
- quote follow-up
- customer replies
- human decisions
- interventions
- reports
- emails
- documents
- invoices
- automation monitoring
- incidents
- results

## 4.2 SESIRA Growth

Commercial opportunity layer.

Main responsibilities:

- organization knowledge
- content ideas
- content preparation
- approval
- publishing
- conversation detection
- request creation
- marketing attribution

Growth must feed the same Requests/Customers/Quotes system.

Concept:

```text
SESIRA GROWTH
      ↓
Content
Publications
Conversations
      ↓
New Request
      ↓
SESIRA OS
      ↓
Qualification
Quote
Follow-up
Decision
Result
```

Growth is not a separate social-media product.

---

# 5. Initial target market

Initial geography:

France.

Initial vertical:

- CVC
- chauffage
- climatisation
- pompes à chaleur
- génie climatique

Future verticals:

- solaire
- photovoltaïque
- maintenance technique
- construction
- rénovation
- plomberie
- électricité
- toiture
- facility services
- other technical SMEs

Ideal initial organization:

- 20–100 employees
- several administrative employees
- regular inbound demand
- meaningful quote volume
- approximately 30+ quotes/month
- existing software stack
- email infrastructure
- technicians and/or salespeople
- no internal automation/AI team

---

# 6. Premium doctrine

SESIRA is intended to feel and operate as a premium B2B system.

Premium does NOT mean:

- more gradients
- more AI
- more integrations
- more features
- more dashboards

Premium means:

- predictable behavior
- clear value
- reversible actions
- traceability
- tenant isolation
- strong error handling
- human takeover
- calm UX
- useful empty/error states
- reliable onboarding
- operational support

Fundamental rule:

> Rien d'important ne doit être perdu, envoyé par erreur ou laissé sans responsable.

When a new feature conflicts with reliability of Quote Follow-up:

> Quote Follow-up reliability wins.

When another integration conflicts with quality of the primary email integration:

> Primary integration quality wins.

When autonomy conflicts with control:

> Control wins.

---

# 7. Current verified implementation state

SESIRA currently has a working manual multi-tenant product journey:

```text
Customer
→ Request
→ Quote
→ Timeline
→ Attention
```

Existing working capabilities include:

- Next.js application shell
- Supabase Auth
- SSR sessions
- organization memberships
- PostgreSQL RLS
- tenant-aware Server Components
- Server Actions
- Customers
- Requests
- Quotes
- status transitions at application level
- quote sent action
- unified business timeline
- manual Attention
- safe resolution of Attention
- responsive Midnight Papyrus UI
- search
- filters
- cursor pagination
- loading states
- empty states
- error states
- not-found semantics
- fictional multi-organization seed
- external action kill switch
- unit/domain tests
- offensive RLS tests

Current manual journey is stable enough to serve as the product surface for Core Workflow development.

Do not rebuild:

- Customers
- Requests UI
- Quotes UI
- Timeline
- Attention UI
- Midnight Papyrus shell

unless a proven bug exists.

---

# 8. Current technical stack

```text
Frontend
Next.js 16 App Router
React 19
TypeScript strict
Tailwind CSS 4
Lucide

Validation
Zod 4

Backend
Server Components
Server Actions

Authentication
Supabase Auth
Supabase SSR

Database
Supabase PostgreSQL

Authorization
PostgreSQL RLS

Tests
Vitest
SQL offensive RLS tests

Hosting
Vercel

Future AI
OpenAI API

Future orchestration
SESIRA Core + n8n where useful
```

Do not add an ORM without demonstrated need.

Do not create a second REST backend.

Do not replace RLS with application-only authorization.

---

# 9. Current domain tables

Existing tables:

```text
profiles
organizations
organization_members

service_catalog_items

customers
requests
quotes
messages

attention_items

integrations

automation_configs
automation_runs

ai_runs

events
incidents
audit_logs
```

All organization-owned business entities must preserve strict tenant isolation.

---

# 10. Authentication and tenant boundary

User identity comes from Supabase Auth.

Tenant membership comes from:

```text
organization_members
```

Never trust:

```text
organization_id
```

from:

- FormData
- query params
- client state
- browser input

Organization authority must be derived server-side.

Application queries should retain:

```text
organization_id = active organization
```

in addition to RLS.

Known unauthorized resources must behave as:

```text
404 / not found
```

rather than leaking resource existence.

---

# 11. Roles

Current organization roles remain:

```text
OWNER
ADMIN
MANAGER
MEMBER
```

Do not introduce Sales/Operations/Technician RBAC yet unless there is a measured requirement.

Client-facing labels:

```text
OWNER
→ Propriétaire

ADMIN
→ Administrateur

MANAGER
→ Responsable

MEMBER
→ Membre
```

---

# 12. Main client navigation

Target navigation:

```text
Accueil

À traiter

Clients
  Clients
  Nouvelles demandes
  Devis

Marketing
  Idées
  Contenus
  Publications
  Conversations

Interventions
  Aujourd'hui
  Rapports

Gestion
  Emails
  Documents
  Factures

Résultats

Automatisations

Réglages
```

Only enabled modules should appear.

---

# 13. Home

Route:

```text
/app
```

Goal:

Answer within approximately 10 seconds:

> Qu'est-ce qui se passe aujourd'hui ?

Do not turn Home into a generic BI dashboard.

Preferred information hierarchy:

1. attention requiring action
2. current operational activity
3. recent automated work
4. compact result/value summary

Example:

```text
Aujourd'hui

12 nouvelles demandes
9 prêtes pour votre équipe

41 devis surveillés
8 relances effectuées

3 éléments nécessitent votre attention
```

Only show real metrics.

Never invent automation metrics before Core produces them.

---

# 14. Customers

Routes:

```text
/app/customers
/app/customers/new
/app/customers/[customerId]
```

Already implemented.

Customer view aggregates:

- identity
- contact information
- requests
- quotes
- messages
- timeline

SESIRA does not need to become a full CRM.

External CRM identifiers may coexist with internal records.

---

# 15. Requests

Routes:

```text
/app/requests
/app/requests/new
/app/requests/[requestId]
```

Existing status vocabulary:

```text
NEW
PROCESSING
NEEDS_INFO
QUALIFIED
READY
ASSIGNED
CLOSED
SPAM
LOST
```

Canonical transition logic must eventually be enforceable at database/domain boundary.

Current intended graph:

```text
NEW
→ PROCESSING
→ NEEDS_INFO
→ QUALIFIED
→ READY
→ ASSIGNED
→ CLOSED
```

with relevant loss/spam exits.

Claude Core must close the current ASSIGNED gap.

Request creation emits:

```text
request.created
```

Status changes emit:

```text
request.status_changed
```

Do not create a second event architecture.

---

# 16. Quotes

Routes:

```text
/app/quotes
/app/quotes/new
/app/quotes/[quoteId]
```

Status vocabulary:

```text
DRAFT
SENT
FOLLOWING_UP
REPLIED
NEEDS_HUMAN
WON
LOST
EXPIRED
```

Canonical intended graph:

```text
DRAFT
→ SENT
→ FOLLOWING_UP
→ REPLIED
→ NEEDS_HUMAN
→ WON / LOST / EXPIRED
```

Alternative valid edges must remain explicit and tested.

Terminal:

```text
WON
LOST
EXPIRED
```

Quote events:

```text
quote.created
quote.sent
quote.replied
quote.won
quote.lost
quote.status_changed
```

`quote.sent` must only occur on a real stored transition to SENT.

---

# 17. Unified business timeline

Existing event architecture is canonical.

Do not create:

```text
activity_log
business_activity
timeline_events_v2
```

or another parallel model.

Use:

```text
events
```

Timeline client UI should translate technical events into simple French.

Example:

```text
quote.sent
→ Devis envoyé

request.created
→ Nouvelle demande créée
```

Unknown compatible event:

```text
Activité enregistrée
```

---

# 18. À traiter

Route:

```text
/app/attention
```

This is one of the most important SESIRA interfaces.

Attention should show only situations that require judgment or action.

Examples:

- price objection
- complaint
- urgent request
- unusual customer response
- low AI confidence
- integration issue
- financial dispute
- workflow failure requiring intervention

Each Attention item must explain:

1. what happened
2. why Sesira is showing it
3. what decision is expected

Attention statuses:

```text
OPEN
IN_PROGRESS
RESOLVED
DISMISSED
```

Priorities:

```text
LOW
NORMAL
HIGH
URGENT
```

Manual Attention already exists.

Workflow-generated Attention must later be:

- deterministic
- deduplicated
- tenant-safe
- linked to workflow provenance
- auditable

---

# 19. Automation doctrine

Every automation follows progressive trust.

```text
Observation
→ Shadow Mode
→ Validation par l'équipe
→ Automatisation limitée
```

Existing internal configuration levels:

```text
OBSERVATION
SHADOW
APPROVAL
AUTOMATIC
```

Client labels should remain simple.

Sensitive actions never become automatic merely because AI confidence is high.

---

# 20. Risk matrix

## Low risk

Examples:

- classify email
- extract information
- calculate due date
- prepare draft

May be automatic when deterministic/confident enough.

## Moderate risk

Examples:

- send a standard commercial follow-up

Default:

```text
APPROVAL
```

before controlled automation.

## High risk

Examples:

- price objection
- complaint
- dispute
- unusual commercial decision

Always human.

## Critical

Examples:

- price modification
- contract change
- destructive data action
- financial status modification

Explicit human control required.

---

# 21. External action kill switch

Current external-action guard must remain.

An external side effect is allowed only when:

```text
EXTERNAL_ACTIONS_ENABLED=true
AND
VERCEL_ENV=production
```

Shadow Mode never sends real communication.

Every external adapter must call the safety guard immediately before the side effect.

Future Control Center must allow suspension of:

- entire organization
- automation
- integration
- communication channel
- outbound actions globally

Every pause/unpause must be auditable.

---

# 22. Request/Quote Core state machines — P0

Application-level transition maps are not sufficient.

Core Workflow must establish one canonical transition source of truth that tenant-authorized direct Data API calls cannot bypass.

Requirements:

- legal edges explicit
- illegal edges rejected
- terminal statuses protected
- compare-and-set semantics
- stale state rejected
- assignment path explicit
- side effects atomic
- event emitted only for stored transition
- direct tenant API attempts tested

Do not weaken RLS to implement this.

---

# 23. Tenant-safe assignments — P0

Current assignment columns must be constrained to the same organization.

Affected concepts:

```text
requests.assigned_user_id
quotes.owner_user_id
attention_items.assigned_user_id
```

A known UUID belonging to another organization must never be assignable.

Database invariant must involve:

```text
organization_members
```

Add offensive tests.

---

# 24. Quote follow-up safety state — P0

Quote status alone is insufficient.

Core requires first-class queryable state for:

- manual pause
- complaint hold
- review hold
- opt-out

Expected conceptual fields:

```text
automation_paused_at
automation_pause_reason
opted_out_at
```

Exact implementation may differ if it proves the same invariants.

No follow-up is due when quote is:

- paused
- opted out
- replied
- won
- lost
- expired

Complaint:

```text
pause
+
Attention
```

Opt-out must never be silently cleared by a normal status transition.

---

# 25. Follow-up scheduling — P0

Initial default schedule:

```text
J+3
J+7
J+14
```

Organization configuration may override it later.

Core must support deterministic due decisions.

Scheduling must not depend on AI.

Potential execution record fields include:

```text
scheduled_for
next_attempt_at
locked_at
lock_expires_at
```

or an equivalent design.

Requirements:

- two workers cannot claim the same decision
- crashed worker can recover
- retry time deterministic
- permanent errors do not retry
- exhaustion creates one incident family

---

# 26. Idempotency — P0

SESIRA must treat duplicates as normal distributed-system behavior.

Existing:

```text
automation_runs
unique(organization_id, idempotency_key)
```

Extend durable replay protection to:

- external/provider events
- product creation replay
- workflow decisions
- generated Attention
- external effects

Never deduplicate using mutable fields such as:

- email
- amount
- title

Use stable operation/delivery identity.

Replay must not create duplicate:

- event
- run
- Attention
- retry
- external message

---

# 27. Retry doctrine

Transient errors may retry.

Examples:

- provider timeout
- temporary network issue
- temporary email API failure
- temporary AI provider failure

Permanent errors must not blindly retry.

Examples:

- invalid credentials
- permission denied
- opt-out
- validation error
- permanent provider rejection

Use bounded backoff.

Retry exhaustion produces a deduplicated incident.

---

# 28. Incidents

Existing statuses:

```text
OPEN
INVESTIGATING
RESOLVED
IGNORED
```

Severity:

```text
P1
P2
P3
P4
```

Examples:

```text
Microsoft OAuth expired
CRM unavailable
AI provider timeout
Repeated automation failure
Webhook malformed
Unexpected provider response
```

Repeated equivalent failures should converge into one actionable incident family rather than create uncontrolled noise.

---

# 29. Audit logging

Audit is append-oriented.

Log important decisions such as:

- state transition
- automation claim
- automation outcome
- manual approval
- manual rejection
- retry
- pause
- opt-out
- incident resolution
- integration change

Audit metadata must remain minimal.

Do not log:

- credentials
- secrets
- unnecessary full message bodies
- unnecessary personal data

---

# 30. AI architecture

AI is used only where semantic understanding helps.

Appropriate:

- reply classification
- intent detection
- extraction
- summarization
- draft creation
- content generation
- document interpretation

Not appropriate:

- permissions
- tenant boundaries
- dates
- scheduling
- retry decisions
- invoice state
- destructive decisions
- business safety rules

Rule:

> Deterministic logic first.
> AI only where semantic judgment adds value.

---

# 31. Structured AI output

AI output used by application logic must be schema validated.

Example:

```json
{
  "intent": "PRICE_OBJECTION",
  "confidence": 0.97,
  "summary": "Le client reste intéressé mais demande un geste commercial.",
  "recommended_action": "HUMAN_REVIEW"
}
```

Never directly execute arbitrary natural-language model output.

---

# 32. Quote reply classification

Initial intents:

```text
INTERESTED
QUESTION
PRICE_OBJECTION
DELAY
NOT_INTERESTED
COMPLAINT
OTHER
UNKNOWN
```

Default routing:

```text
INTERESTED
→ commercial

QUESTION
→ draft or human depending rules

PRICE_OBJECTION
→ human

DELAY
→ reschedule

NOT_INTERESTED
→ close

COMPLAINT
→ human + pause

OTHER
→ human if ambiguous

UNKNOWN
→ human
```

---

# 33. Messages / Email

Future first external integration should support the flagship Quote Follow-up workflow.

Architecture:

```text
Provider
→ normalized message
→ tenant/entity association
→ deduplicated event
→ deterministic workflow
→ AI classification if required
→ Attention or action
```

Do not directly connect provider callback to uncontrolled business mutation.

---

# 34. SESIRA Results

Route:

```text
/app/results
```

The Results page must separate:

## Observed

Examples:

- requests created/processed
- quotes created
- quotes sent
- real follow-ups
- replies
- Attention resolved

## Estimated

Examples:

- time saved
- estimated time value
- potential commercial value

## Unknown

Examples:

- revenue influence not reliably attributable
- future revenue
- causal impact not measured

Never show estimated revenue as observed revenue.

Preferred wording:

```text
Temps estimé récupéré
Valeur estimée du temps récupéré
Gain potentiel estimé
Pour 1 € investi
```

---

# 35. ROI principles

Prefer contribution margin over revenue when available.

Potential structure:

```text
time_value
commercial_value
operational_value
```

Example:

```text
time_value =
estimated_hours_saved × loaded_hourly_cost
```

Do not double count.

Support scenarios:

```text
Prudent
Probable
Potentiel élevé
```

Assumptions must be inspectable.

---

# 36. Public Diagnostic

Route:

```text
/diagnostic
```

Purpose:

- acquisition
- qualification
- demo
- pre-audit
- lead capture

Flow:

```text
1. Votre activité
2. Votre entreprise
3. Votre fonctionnement
4. Vos résultats
```

Initial sectors:

```text
Chauffage / Climatisation
Solaire / Photovoltaïque
Maintenance / Services techniques
Construction / Rénovation
```

Calculations are deterministic.

Do not use AI to calculate ROI.

Do not use fake benchmarks.

Show result before asking for contact details.

---

# 37. SESIRA Growth

Routes target:

```text
/app/marketing
/app/marketing/ideas
/app/marketing/content
/app/marketing/publications
/app/marketing/conversations
/app/marketing/results
```

Growth lifecycle:

```text
Question / topic
→ Idea
→ Draft
→ Approval
→ Publication
→ Conversation
→ Request
→ Quote
→ Result
```

Client-facing organization knowledge:

```text
Votre entreprise
```

May include:

- services
- locations
- tone
- certifications
- differentiators
- approved claims
- prohibited claims
- common questions
- common objections

Do not claim AI-generated output before real AI execution exists.

---

# 38. Interventions

Future routes:

```text
/app/interventions
/app/interventions/[id]
/app/reports
```

Flow:

```text
Intervention
→ Technician note
→ transcription
→ structured report
→ human approval
→ destination
```

---

# 39. Documents

Future routes:

```text
/app/documents
/app/documents/[id]
```

Flow:

```text
Document
→ classify
→ extract
→ validate
→ business rule
→ destination
or
→ Attention
```

---

# 40. Invoices

Future routes:

```text
/app/invoices
/app/invoices/[id]
```

Lifecycle:

```text
OPEN
DUE_SOON
OVERDUE
REMINDER_SENT
DISPUTED
PROMISED
PAID
CLOSED
```

Payment disputes always go to humans.

---

# 41. Automations product UI

Route:

```text
/app/automations
```

Do not expose n8n.

Do not expose a visual workflow builder.

Cards show:

- process
- state
- automation level
- recent activity
- health
- last problem

Example:

```text
Relancer les devis

Actif

Validation par votre équipe

26 relances

Aucun problème détecté
```

---

# 42. Settings

Route:

```text
/app/settings
```

Sections:

```text
Entreprise
Équipe
Connexions
Notifications
Données
Facturation
```

Integration UI must never fake a real connection.

---

# 43. Control Center

Internal routes:

```text
/control
/control/organizations
/control/runs
/control/ai-runs
/control/incidents
/control/integrations
```

Purpose:

Manage many organizations by exception.

Control Center should eventually show:

- organization health
- enabled modules
- automation health
- failed runs
- incidents
- integration status
- AI cost
- infrastructure cost
- recent operational issues

Never expose:

- secrets
- raw credentials
- unrestricted impersonation

---

# 44. Development ownership

## Codex owns Product

Codex owns:

```text
React
Next.js product pages
components
client-facing UX
public website
Diagnostic
Results UI
Automation UI
Settings UI
Growth UI
Interventions UI
Documents UI
Invoices UI
Control Center frontend
design system
accessibility
UI tests
responsive QA
product copy
```

Codex must NOT own:

```text
Supabase schema
migrations
RLS
state-machine enforcement
workflow engine
retry engine
idempotency engine
AI implementation
email provider integration
incident backend
core external-effect safety
```

---

# 45. Claude Code owns Core

Claude Code owns:

```text
Supabase migrations
database invariants
RLS evolution
state machines
workflow scheduling
automation execution
Shadow Mode
Approval Mode backend
idempotency
duplicate prevention
retries
incidents
audit writer
AI execution
email integration
CRM integration
provider webhooks
background workers
core security tests
```

---

# 46. Shared contract

Canonical communication document:

```text
docs/CORE_API_CONTRACTS.md
```

Codex documents missing Core needs.

Claude implements them.

Example:

```text
NEEDED

getAutomationResultsSummary(period)

status:
REQUESTED
```

Claude later changes to:

```text
IMPLEMENTED
```

Codex then removes mock/adapter behavior and connects real data.

Do not implement competing Core solutions.

---

# 47. Schema ownership

Claude Code owns Supabase schema changes.

Codex must not create migrations except for emergency fixes explicitly agreed.

Schema request flow:

```text
Codex discovers UI need
↓
CORE_API_CONTRACTS / SCHEMA_REQUESTS
↓
Claude reviews invariant
↓
migration
↓
generated types
↓
tests
↓
Codex integration
```

---

# 48. Migration gate

Before any migration:

1. map to a P0/P1 invariant or measured requirement
2. inspect existing constraint/policy/index
3. write focused forward-only migration
4. preserve RLS
5. avoid service_role
6. prefer security-invoker where relevant
7. regenerate database types
8. extend offensive SQL tests
9. test direct tenant API attempts
10. run full verification

Do not speculatively add reporting fields.

---

# 49. Quality gates

## Product gate

- main benefit understood quickly
- useful next action visible
- no dead-end critical screen
- simple French
- meaningful error/empty states
- mobile/laptop usable

## Technical gate

- tenant isolation tested
- duplicate deliveries safe
- retries bounded
- failures inspectable
- audit trace exists
- no secret leakage

## Operational gate

- incident understandable without code
- organization can be paused
- workflow can be manually recovered
- Attention items have owners
- pilot can be disabled immediately

## Commercial gate

- observed value separated from estimates
- no invented revenue
- scope clear
- workflow reliable enough to defend price

---

# 50. Pilot lifecycle

```text
Internal organization
→ Pilot organization 1
→ Pilot organization 2
→ 3–5 close-fit organizations
→ controlled expansion
```

Client activation path:

```text
Observation
→ Shadow
→ Approval
→ limited automatic execution
```

Review at:

```text
J+7
J+14
J+30
```

---

# 51. V1 premium promise

The first premium production workflow is:

> Sesira surveille les devis, prépare les bonnes relances et fait remonter les réponses qui nécessitent une décision humaine.

Required complete journey:

```text
Email connection
→ Quote
→ Customer association
→ Due follow-up
→ Shadow / Approval
→ Controlled send
→ Reply
→ Classification
→ Attention
→ Human decision
→ Audit
→ Result
```

SESIRA must not be called premium until this path is:

- understandable
- traceable
- recoverable
- reversible
- multi-tenant safe
- duplicate-safe
- stoppable
- monitored

---

# 52. Current commercial gate

Current status:

```text
NOT READY
```

Reason:

Real automation execution, email communication and AI classification are not yet complete.

The working manual product is a foundation, not yet the final commercial system.

---

# 53. Release maturity stages

## Stage A — Manual Product Complete

```text
Customer
Request
Quote
Timeline
Attention
```

STATUS:

DONE

## Stage B — Internal Workflow Engine

```text
state machines
scheduler
Shadow Mode
idempotency
Attention generation
retries
incidents
audit
```

## Stage C — Real Quote Follow-up

```text
email
follow-up
reply matching
classification
human routing
```

## Stage D — Pilot Ready

```text
full traceability
operational Control Center
real Results
failure recovery
```

## Stage E — Commercial V1

```text
stable pilot workflow
onboarding
monitoring
support
release hardening
```

## Stage F — OS + Growth

```text
content
publishing
conversation
request
attribution
```

## Stage G — Multi-Operations

```text
interventions
reports
documents
invoices
```

## Stage H — Scale Ready

```text
templates
repeatable onboarding
multi-client health
cost control
backup/recovery
```

## Stage I — Mature Platform

```text
high reliability
low support burden
measured customer value
controlled automation
repeatable expansion
```

---

# 54. Explicit non-goals for current stage

Do not build yet unless scheduled:

- full CRM
- full ERP
- accounting product
- payroll
- generic chatbot builder
- visual automation builder
- Zapier competitor
- autonomous price negotiation
- contract negotiation
- generic agent marketplace
- Kubernetes
- microservices
- proprietary model
- dozens of integrations
- native mobile app

---

# 55. Verification commands

Before stopping a development objective:

```text
lint
typecheck
tests
build
```

Repository canonical verification command should remain:

```bash
npm run verify
```

Critical Core changes must also run offensive Supabase tests.

Never disable tests to pass a gate.

---

# 56. Definition of Done

A feature is not done because its page renders.

Relevant completion includes:

```text
UI
authorization
tenant isolation
validation
loading
empty
error
not-found
responsive
domain rules
events where required
audit where required
tests
build
```

For external action:

```text
idempotency
retry
kill switch
incident
audit
manual recovery
```

are also required.

---

# 57. Final product principle

SESIRA should increasingly feel calmer as it becomes more powerful.

The system should:

- watch
- handle
- explain
- escalate
- measure

The human team should:

- decide
- negotiate
- approve
- resolve exceptions

The mature product equation is:

```text
SESIRA GROWTH
creates/detects opportunities

+

SESIRA OS
processes and follows operational activity

+

À TRAITER
keeps judgment human

+

RÉSULTATS
shows measurable value

+

CONTROL CENTER
keeps the system operable at scale
```

---

# END OF MASTER SPECIFICATION
