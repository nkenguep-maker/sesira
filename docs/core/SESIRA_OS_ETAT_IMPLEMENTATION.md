# SESIRA OS — État de l’implémentation

> Version : 1.0  
> Date : 23 août 2026  
> Branche : `main`  
> Statut commercial : **NON COMMERCIALISABLE**

## 1. Résumé exécutif

SESIRA OS dispose maintenant d’un socle technique indépendant, déployé et connecté à sa propre infrastructure Supabase et Vercel.

La plateforme comprend actuellement :

- une application Next.js navigable ;
- l’authentification Supabase ;
- une architecture multi-tenant protégée par PostgreSQL RLS ;
- un modèle métier générique et multi-secteur ;
- un tableau de bord opérationnel initial ;
- un module Clients fonctionnel ;
- des garde-fous empêchant les actions externes hors production ;
- une CI technique et des migrations versionnées ;
- une preview Vercel protégée.

Le parcours complet Demande → Devis → Relance → Réponse n’est pas encore livré. SESIRA OS ne doit donc pas encore être vendu ni connecté à des clients réels.

---

## 2. Projets indépendants créés

### Supabase

- Nom : `sesira-os`
- Project ref : `ubfqffhvomaxcwgerwmr`
- Région : `eu-central-1`
- Statut : actif et sain
- Usage : Auth, PostgreSQL, RLS et futur Storage

### Vercel

- Projet : `yema/sesira-os`
- Project ID : `prj_FSe1mx64X3Hi2UJN41LhVyR484CL`
- Team ID : `team_6ZiRYhxncKVWrpQVApm3SV1V`
- Preview actuelle : [sesira-3v5pgzkv9-yema.vercel.app](https://sesira-3v5pgzkv9-yema.vercel.app)
- Protection : authentification Vercel active
- Production : non publiée

Ces projets ont été créés spécialement pour SESIRA OS. Ils ne sont mélangés avec aucun projet existant.

---

## 3. Stack technique installée

| Domaine | Technologie |
|---|---|
| Application | Next.js 16 App Router |
| Interface | React 19, Tailwind CSS 4, Lucide |
| Langage | TypeScript strict |
| Validation | Zod 4 |
| Backend applicatif | Server Components et Server Actions |
| Authentification | Supabase Auth avec sessions SSR |
| Base de données | Supabase PostgreSQL |
| Autorisation | Row Level Security |
| Hébergement | Vercel |
| Tests | Vitest |
| CI | GitHub Actions |
| Runtime | Node.js 24 |

Les dépendances sont épinglées dans `package.json` et `package-lock.json`.

---

## 4. Fondation applicative livrée

### Routes publiques

- `/` : présentation initiale de SESIRA OS ;
- `/login` : connexion et création de compte ;
- `/auth/confirm` : confirmation Supabase Auth.

### Routes privées

- `/app` : tableau de bord ;
- `/app/attention` : exceptions nécessitant une décision humaine ;
- `/app/customers` : portefeuille clients ;
- `/app/customers/new` : création d’un client ;
- `/app/customers/[customerId]` : fiche client ;
- `/app/requests` : emplacement du futur module Demandes ;
- `/app/quotes` : emplacement du futur module Devis ;
- `/app/automations` : emplacement du futur moteur d’automatisation ;
- `/app/settings` : réglages de l’organisation.

Toutes les routes `/app` sont protégées. Un utilisateur sans session est redirigé vers `/login` avec conservation de sa destination.

### Interface

- shell applicatif Midnight Papyrus ;
- navigation responsive ;
- indication visuelle du module actif ;
- organisation active visible dans la sidebar ;
- états loading, empty, error et not-found ;
- tableau de bord avec métriques clients, demandes, devis et exceptions ;
- indicateur visible du statut des actions externes.

---

## 5. Authentification et onboarding

Le parcours Supabase Auth est opérationnel :

1. l’utilisateur crée un compte ;
2. Supabase crée son identité ;
3. un trigger crée son profil ;
4. une organisation isolée est créée automatiquement ;
5. l’utilisateur devient `OWNER` de cette organisation ;
6. la session SSR est stockée et rafraîchie dans des cookies ;
7. les pages serveur vérifient les claims Supabase.

La plateforme ne fait pas confiance aux informations de rôle ou d’organisation envoyées par le navigateur.

---

## 6. Modèle de données livré

Seize tables publiques ont été créées :

1. `profiles`
2. `organizations`
3. `organization_members`
4. `service_catalog_items`
5. `customers`
6. `requests`
7. `quotes`
8. `messages`
9. `attention_items`
10. `integrations`
11. `automation_configs`
12. `automation_runs`
13. `ai_runs`
14. `events`
15. `incidents`
16. `audit_logs`

### Principes appliqués

- toutes les entités métier appartiennent à une organisation ;
- RLS est active sur les 16 tables exposées ;
- les rôles disponibles sont `OWNER`, `ADMIN`, `MANAGER` et `MEMBER` ;
- les clés étrangères composites empêchent une relation entre deux tenants différents ;
- les colonnes utilisées par les relations et les politiques RLS sont indexées ;
- les événements et journaux d’audit sont orientés append-only ;
- deux organisations de démonstration appartenant à des secteurs différents ont été seedées ;
- aucune donnée de client réel n’a été introduite.

---

## 7. Module Clients livré

### Liste clients

- lecture serveur directe depuis Supabase ;
- isolation par organisation et par RLS ;
- statistiques globales, entreprises et nouveaux clients du mois ;
- recherche par nom ;
- filtre Particulier / Entreprise ;
- pagination par curseur ;
- état vide et état sans résultat ;
- présentation responsive ;
- accès à la fiche client.

### Création client

- formulaire Particulier / Entreprise ;
- validation client et serveur ;
- email normalisé et validé ;
- nom d’entreprise obligatoire pour une fiche Entreprise ;
- `organization_id` déterminé exclusivement côté serveur ;
- mutation exécutée avec la session Supabase de l’utilisateur ;
- redirection vers la fiche créée ;
- message de confirmation.

### Événement métier

Chaque insertion dans `customers` déclenche dans la même transaction PostgreSQL :

```text
customer.created
```

Le trigger est en `SECURITY INVOKER`. Il respecte donc les droits de l’appelant et ne peut pas être invoqué directement par `anon` ou `authenticated`.

### Fiche client

- identité et type de client ;
- coordonnées ;
- date de création ;
- demandes récentes ;
- devis récents ;
- nombre de messages ;
- journal des événements métier ;
- gestion du client introuvable sans fuite cross-tenant.

---

## 8. Sécurité et garde-fous

- aucune clé `service_role` ou `sb_secret_*` n’est utilisée dans l’application ;
- seules l’URL Supabase et la clé publishable sont exposées au navigateur ;
- les fichiers `.env.local` et `.vercel` sont ignorés par Git ;
- le Security Advisor Supabase retourne zéro alerte ;
- les privilèges `anon` sont révoqués sur les tables métier ;
- les fonctions privilégiées sont dans le schéma privé ;
- les actions externes échouent en mode fermé ;
- `EXTERNAL_ACTIONS_ENABLED=true` ne suffit pas : l’environnement doit aussi être `production` ;
- toutes les previews restent en mode sans action externe ;
- la route de démonstration visuelle locale retourne HTTP 404 dans les builds Vercel.

---

## 9. Migrations appliquées

| Version | Migration |
|---|---|
| `20260823115600` | `initial_multi_tenant_foundation` |
| `20260823115710` | `add_foreign_key_indexes` |
| `20260823115916` | `bootstrap_new_user_organization` |
| `20260823124508` | `add_customer_event_trigger` |
| `20260823125831` | `make_customer_event_trigger_security_invoker` |

Les noms et versions des fichiers locaux sont alignés avec l’historique du projet Supabase distant.

---

## 10. Validations effectuées

### Vercel

Le dernier déploiement a validé :

- installation reproductible des dépendances ;
- ESLint ;
- compilation Next.js ;
- TypeScript ;
- génération de toutes les routes ;
- état final du déploiement : `READY`.

### HTTP

- `/` retourne HTTP 200 ;
- `/login` retourne HTTP 200 ;
- `/app` redirige un utilisateur non connecté ;
- `/app/customers` redirige un utilisateur non connecté ;
- `/app/customers/new` redirige un utilisateur non connecté ;
- `/dev/customers` retourne HTTP 404 sur Vercel.

### Supabase

- 16 tables avec RLS active ;
- zéro alerte Security Advisor ;
- aucun index de clé étrangère manquant ;
- trigger `customer_created_event` présent ;
- fonction finale en `SECURITY INVOKER` ;
- exécution directe de la fonction refusée aux rôles publics.

### Tests

- tests du kill switch des actions externes ;
- tests de validation des fiches clients ;
- CI configurée pour lint, typecheck, tests et build.

Le runner Vitest local subit actuellement un ralentissement du filesystem macOS. Les tests initiaux ont réussi ; la validation de compilation de référence reste le build Vercel isolé. La CI complète sera exécutée automatiquement dès que le repository sera relié et poussé vers un hébergeur Git.

---

## 11. Historique Git

| Commit | Contenu |
|---|---|
| `9d22be5` | Fondation indépendante de SESIRA OS |
| `a5416d1` | Module Clients complet |

Le repository local ne possède pas encore de remote Git configuré. Les commits existent uniquement dans le workspace local pour le moment.

---

## 12. Ce qui reste à construire

### Prochaine étape visuelle

Module Demandes :

- liste et filtres ;
- création reliée à un client ;
- qualification générique ;
- statut et assignation ;
- fiche et timeline ;
- événement `request.created` ;
- commit et preview dédiés.

### Étapes suivantes

1. module Devis ;
2. timeline unifiée ;
3. import CSV ;
4. moteur d’automatisation en Shadow Mode ;
5. intégration email ;
6. classification IA structurée ;
7. Control Center et incidents ;
8. tests RLS et E2E complets ;
9. hardening et gate de commercialisation.

---

## 13. Gate commercial actuel

```text
Décision : NON PRÊT
```

Raisons principales :

- le parcours Demande → Devis n’est pas terminé ;
- aucune intégration email n’est active ;
- le moteur d’automatisation n’est pas construit ;
- les tests E2E et RLS complets restent à livrer ;
- le Control Center et l’observabilité métier restent à construire ;
- aucune validation de release candidate n’a encore eu lieu.

La commercialisation ne sera proposée qu’après validation explicite du gate final défini dans `SESIRA_OS_TECH_ROADMAP_8_SEMAINES.md`.
