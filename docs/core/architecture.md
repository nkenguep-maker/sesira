# Architecture SESIRA OS

## Frontières du système

SESIRA OS est une application Next.js unique, déployée sur Vercel et adossée à Supabase. Le noyau métier reste générique ; les variantes sectorielles passent par la configuration d'organisation, le catalogue et, plus tard, des templates versionnés.

```text
Navigateur
  -> Next.js App Router (Vercel)
      -> Supabase Auth
      -> Supabase Postgres + RLS
      -> services métier
          -> événements et audit
          -> automatisations externes (désactivées par défaut)
```

## Décisions structurantes

- Une organisation est la frontière de tenant.
- Chaque table métier porte `organization_id`.
- Les clés étrangères composites empêchent aussi les associations cross-tenant au niveau PostgreSQL.
- RLS est active sur toutes les tables du schéma `public` exposées par l'API.
- Le serveur vérifie l'identité avec les claims Supabase ; il ne fait pas confiance à un tenant envoyé par le navigateur.
- Une inscription crée un profil, une organisation isolée et un membership `OWNER`.
- Les événements et journaux d'audit sont orientés append-only.
- Toute action externe doit passer par un garde-fou central : flag explicite et environnement Vercel `production`.
- Aucun secret Supabase privilégié n'est requis par l'application actuelle.

## Environnements

| Environnement | Base | Actions externes | Usage |
|---|---|---:|---|
| Local | Projet Supabase SESIRA | Non | Développement |
| Preview | Projet Supabase SESIRA | Non | Validation technique |
| Production | Projet Supabase SESIRA | Non par défaut | Futur release candidate |

Avant données réelles, les environnements de données devront être séparés afin qu'une preview ne partage pas la production.

## Convention de migration

Les migrations versionnées de `supabase/migrations` sont la source de vérité du schéma. Leur préfixe est aligné sur l'historique du projet distant. Toute modification DDL passe par une nouvelle migration ; aucun changement manuel silencieux dans le dashboard.

## État actuel

Le socle couvre l'identité, l'isolation multi-tenant, le schéma transversal, le shell applicatif et les écrans d'état vide. Il ne couvre pas encore le parcours métier complet, les tests E2E/RLS automatisés, l'intégration email ni le Control Center. La plateforme n'est donc pas encore commercialisable.
