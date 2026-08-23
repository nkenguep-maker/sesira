# SESIRA OS

Socle technique multi-tenant et multi-secteur de SESIRA OS. Le projet est indépendant des autres applications du workspace.

## État

- Next.js 16, React 19 et TypeScript strict
- Supabase Auth, Postgres et RLS
- Vercel pour les previews
- actions externes désactivées par défaut
- statut commercial : **non commercialisable**

La feuille de route active est [SESIRA_OS_TECH_ROADMAP_8_SEMAINES.md](./SESIRA_OS_TECH_ROADMAP_8_SEMAINES.md). Les décisions d'architecture sont dans [docs/architecture.md](./docs/architecture.md).

## Prérequis

- Node.js 24
- npm
- accès au projet Supabase `ubfqffhvomaxcwgerwmr`
- accès au projet Vercel `yema/sesira-os`

## Démarrage local

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Variables requises :

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXTERNAL_ACTIONS_ENABLED=false
```

Ne jamais placer de clé `service_role` ou de secret serveur dans une variable `NEXT_PUBLIC_*`.

## Vérification

```bash
npm run verify
```

Cette commande exécute lint, typecheck, tests unitaires et build de production. La CI reproduit la même séquence.

## Base de données

Les migrations sont dans `supabase/migrations`. La base distante contient deux organisations de démonstration appartenant à des secteurs différents. Elles valident le caractère configurable du noyau ; elles ne représentent aucun client réel.

## Déploiement

Le projet local est lié à Vercel. Les previews restent protégées et `EXTERNAL_ACTIONS_ENABLED` reste à `false` dans tous les environnements actuels. Aucun déploiement production ne doit être considéré comme une autorisation d'envoyer des emails ou de déclencher une intégration externe.
