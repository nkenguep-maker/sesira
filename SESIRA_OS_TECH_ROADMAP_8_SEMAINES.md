# SESIRA OS — Roadmap technique en 8 semaines

> Version : 1.0  
> Début de référence : 24 août 2026  
> Fin de cycle : 18 octobre 2026  
> Objectif : release candidate fonctionnelle, multi-tenant et multi-secteur  
> Commercialisation : interdite avant validation du gate final

## 1. Décision produit

Les huit premières semaines sont entièrement consacrées à la construction technique.

Il n'y aura pas pendant ce cycle :

- de prospection ;
- de vente ;
- de pilote client réel ;
- d'envoi à de vrais clients ;
- de promesse de date commerciale ;
- de développement dicté par un secteur unique.

Le résultat attendu est une plateforme qui fonctionne de bout en bout dans un environnement contrôlé. À la fin de la huitième semaine, Sesira sera évalué contre un gate de commercialisation. La décision pourra être :

```text
PRÊT
PRÊT SOUS CONDITIONS
NON PRÊT
```

La commercialisation ne commencera que si les critères critiques sont satisfaits.

---

## 2. Doctrine multi-secteur

Sesira doit supporter plusieurs secteurs par configuration, sans dupliquer l'application.

Le modèle commun repose sur des concepts transversaux :

```text
Organisation
Contact
Client
Demande
Opportunité
Devis
Message
Document
Action
Exception
Automatisation
Événement
Résultat
```

Les différences sectorielles doivent vivre dans :

- le profil de l'organisation ;
- le catalogue de services ;
- les champs configurables ;
- les règles de qualification ;
- les templates d'automatisation ;
- les vocabulaires d'interface ;
- les prompts versionnés ;
- les intégrations activées ;
- les règles de calcul de valeur.

Ne jamais coder en dur dans le domaine principal :

- « pompe à chaleur » ;
- « technicien CVC » ;
- des champs propres à un seul métier ;
- une séquence de relance unique ;
- un score de qualification universel ;
- une terminologie métier non configurable.

Le CVC, la rénovation ou les services techniques peuvent servir de datasets de démonstration. Ils ne doivent pas déterminer l'architecture.

### Modèle d'adaptation

```text
Noyau Sesira stable
        +
Configuration d'organisation
        +
Template sectoriel versionné
        +
Intégrations activées
        =
Expérience adaptée au client
```

Un template sectoriel configure le produit. Il ne crée pas une nouvelle branche de code.

---

## 3. Périmètre technique des huit semaines

### Inclus

- application Next.js et design system Midnight Papyrus ;
- Supabase Auth ;
- organisations, memberships et RBAC ;
- isolation multi-tenant par RLS ;
- clients, contacts, demandes, devis et messages ;
- événements, attention items et audit logs ;
- Accueil, À traiter, Clients, Demandes, Devis, Automatisations et Réglages ;
- une intégration email fonctionnelle ;
- import CSV générique ;
- suivi et relance configurable des devis ;
- Shadow Mode et mode Validation ;
- classification structurée des réponses ;
- AI runs, automation runs et incidents ;
- idempotence, retries et prévention des doublons ;
- Control Center ;
- résultats opérationnels simples ;
- deux organisations de test appartenant à des secteurs différents ;
- tests critiques, monitoring et release candidate.

### Exclus

- vente et CRM commercial de Sesira ;
- Growth et publication sociale ;
- facturation Sesira par Stripe ;
- application mobile native ;
- workflows documents, factures et interventions complets ;
- plus d'un fournisseur email ;
- intégration CRM bidirectionnelle ;
- automatisation de messages sensibles ;
- constructeur visuel de workflows ;
- personnalisation spécifique à un client réel.

---

## 4. Stack technique de référence

```text
Application
Next.js App Router
React
TypeScript strict

Interface
Tailwind CSS
shadcn/ui lorsque pertinent
composants Sesira

Backend
Server Components
Server Actions
Route Handlers
services métier séparés de l'interface

Données et identité
Supabase Postgres
Supabase Auth
Supabase Storage
Row Level Security

Validation
Zod ou équivalent unique

Automatisation
n8n pour l'orchestration externe
état métier conservé dans Postgres

IA
OpenAI API
sorties structurées validées
prompts versionnés

Hosting
Vercel

Observabilité
Sentry
logs structurés
Control Center interne

Tests
tests unitaires
tests d'intégration
tests RLS
tests end-to-end du parcours critique
```

Aucun nouveau service d'infrastructure ne sera ajouté sans blocage démontré.

---

## 5. Timeline technique

| Semaine | Dates | Objectif | Résultat vérifiable |
|---|---|---|---|
| 1 | 24–30 août | Fondation et architecture | Projet exécutable, environnements, schéma et design system |
| 2 | 31 août–6 septembre | Auth et multi-tenancy | Deux organisations isolées par RLS |
| 3 | 7–13 septembre | Domaine métier générique | Clients, demandes, devis, messages et événements utilisables |
| 4 | 14–20 septembre | Produit opérationnel | Accueil, À traiter, listes, détails, import et configuration |
| 5 | 21–27 septembre | Moteur d'automatisation | Relances configurables en Shadow Mode |
| 6 | 28 septembre–4 octobre | Email et IA | Réponse reçue, classifiée et routée vers À traiter |
| 7 | 5–11 octobre | Exploitation et résilience | Control Center, incidents, retries, audit et kill switches |
| 8 | 12–18 octobre | Hardening et release candidate | Parcours E2E vérifié et rapport de préparation commerciale |

---

## 6. Semaine 1 — Fondation et architecture

### Construction

- initialiser ou auditer le repository ;
- configurer TypeScript strict, lint, formatage et conventions ;
- créer les environnements local, preview et production ;
- interdire les actions externes hors production ;
- créer le shell Next.js ;
- poser les tokens Midnight Papyrus ;
- créer les premiers composants Sesira ;
- définir le schéma de données ;
- définir les événements et statuts ;
- formaliser les limites application / n8n / IA ;
- créer CI avec typecheck, lint et tests ;
- documenter les décisions structurantes.

### Livrable

Une application déployée en preview, navigable, connectée à une base de développement et reproductible depuis un environnement vierge.

### Gate

- build vert ;
- migrations applicables ;
- aucune clé secrète dans le navigateur ou le repository ;
- architecture multi-secteur approuvée ;
- actions externes désactivées par défaut.

---

## 7. Semaine 2 — Authentification et multi-tenancy

### Construction

- Supabase Auth ;
- organisations ;
- organization memberships ;
- rôles Owner, Admin, Manager et Member ;
- autorisation serveur ;
- politiques RLS ;
- routes protégées ;
- audit des changements d'accès ;
- deux organisations seedées dans des secteurs différents ;
- tests automatiques d'isolation.

### Livrable

Deux utilisateurs appartenant à des organisations différentes voient exclusivement leurs propres données, même en manipulant les requêtes côté client.

### Gate P0

- zéro accès cross-tenant ;
- aucune confiance dans un `organization_id` fourni par le client ;
- clés privilégiées absentes du code client ;
- tests RLS exécutés en CI.

---

## 8. Semaine 3 — Domaine métier générique

### Construction

- customers ;
- contacts ;
- requests ;
- quotes ;
- messages et threads ;
- events ;
- attention items ;
- service catalog ;
- organization profile ;
- champs de métadonnées encadrés ;
- services métier et validations ;
- données seed multi-secteur.

### Principes

- les statuts communs restent stables ;
- les champs sectoriels sont configurés ou stockés comme métadonnées validées ;
- les objets fréquemment recherchés restent dans des colonnes relationnelles ;
- toute entité métier appartient à une organisation ;
- toute mutation importante émet un événement.

### Gate

Les mêmes services permettent de créer et traiter une demande, un client et un devis pour au moins deux secteurs sans condition métier codée en dur dans les composants.

---

## 9. Semaine 4 — Produit opérationnel

### Construction

- navigation configurable par module ;
- Accueil ;
- À traiter ;
- liste et détail des clients ;
- liste et détail des demandes ;
- liste et détail des devis ;
- timeline unifiée ;
- recherche, pagination et filtres serveur ;
- import CSV avec preview, validation et rapport d'erreurs ;
- assignation des exceptions ;
- états loading, empty et error ;
- réglages organisation et catalogue de services ;
- feature flags par organisation.

### Gate

Un utilisateur non technique peut importer des données, trouver un devis, comprendre son état et traiter une exception sans utiliser la base ou les logs.

---

## 10. Semaine 5 — Moteur d'automatisation

### Construction

- automation templates versionnés ;
- automation configs par organisation ;
- automation runs ;
- planification déterministe ;
- niveaux Observation, Validation et Automatic ;
- Shadow Mode obligatoire ;
- préparation de relances ;
- idempotency keys ;
- prévention des actions en double ;
- règles de pause ;
- cas sensibles toujours humains ;
- historique expliquant le déclencheur et la décision.

### Configuration générique

```json
{
  "follow_up_days": [3, 7, 14],
  "language": "fr",
  "automation_level": "SHADOW",
  "sensitive_intents": ["PRICE_OBJECTION", "COMPLAINT", "LEGAL"],
  "minimum_confidence": 0.9
}
```

### Gate

Le système traite 100 échéances simulées sans envoyer de communication et enregistre exactement ce qu'il aurait fait.

---

## 11. Semaine 6 — Email et IA structurée

### Construction

- une intégration email complète ;
- stockage sécurisé des références de credentials ;
- synchronisation ou webhook ;
- association thread / client / devis ;
- détection des réponses ;
- classification structurée ;
- validation de schéma ;
- seuils de confiance configurables ;
- création d'un attention item ;
- mode Validation pour les messages sortants ;
- AI runs, versions de prompt, latence et coût ;
- protection contre prompts ou contenus malformés.

### Intentions minimales

```text
INTERESTED
QUESTION
PRICE_OBJECTION
DELAY
NOT_INTERESTED
COMPLAINT
OPT_OUT
OTHER
UNKNOWN
```

### Gate

Le parcours devis → relance préparée → validation → réponse → classification → À traiter fonctionne de bout en bout dans un environnement contrôlé.

---

## 12. Semaine 7 — Exploitation et résilience

### Construction

- Control Center ;
- liste et détail des organisations ;
- automation runs ;
- AI runs ;
- incidents ;
- intégrations et santé ;
- logs corrélés ;
- retries bornés ;
- distinction erreurs transitoires / permanentes ;
- reprise manuelle ;
- kill switch global, organisation, intégration et automatisation ;
- audit des actions internes ;
- métriques de succès et coûts ;
- procédures incident et restauration.

### Scénarios de panne

- token expiré ;
- timeout fournisseur ;
- webhook dupliqué ;
- email dupliqué ;
- réponse IA invalide ;
- confiance faible ;
- base temporairement indisponible ;
- devis fermé avant exécution ;
- automatisation désactivée pendant un run.

### Gate

Chaque panne simulée produit soit une récupération sûre, soit un incident exploitable. Aucune panne ne déclenche un envoi en double.

---

## 13. Semaine 8 — Hardening et release candidate

### Vérification

- tests unitaires du domaine ;
- tests d'intégration ;
- tests RLS ;
- tests end-to-end ;
- 500 événements réalistes ;
- au moins 200 scénarios synthétiques de réponses ;
- revue accessibilité ;
- revue responsive ;
- revue requêtes et indexes ;
- revue des secrets et logs ;
- test sauvegarde et restauration ;
- test rollback ;
- revue des données envoyées au fournisseur IA ;
- vérification des environnements ;
- documentation d'exploitation ;
- liste des limites connues.

### Livrables

- release candidate déployée ;
- rapport de tests ;
- rapport d'isolation multi-tenant ;
- rapport des incidents ouverts ;
- matrice des risques ;
- procédure de déploiement et rollback ;
- décision de préparation commerciale.

---

## 14. Gate de commercialisation

La plateforme sera déclarée **PRÊTE** seulement si tous les critères suivants sont satisfaits :

### Sécurité

- zéro bug connu de tenant isolation ;
- zéro secret exposé ;
- autorisations serveur vérifiées ;
- actions internes sensibles auditées ;
- webhooks protégés ;
- environnements correctement séparés.

### Fiabilité

- zéro bug P0 ou P1 ouvert ;
- zéro envoi en double dans les tests ;
- idempotence vérifiée ;
- retries bornés ;
- kill switches testés ;
- reprise manuelle possible ;
- échecs visibles dans le Control Center.

### Produit

- workflow principal complet ;
- UI compréhensible sans logs techniques ;
- loading, empty et error states présents ;
- données de deux secteurs traitées par le même noyau ;
- aucune dépendance à un code spécifique client ;
- résultats observés distincts des estimations.

### IA et automatisation

- sorties structurées validées ;
- prompts versionnés ;
- faible confiance escaladée ;
- plaintes, objections prix, opt-out et cas juridiques toujours humains ;
- Shadow Mode fonctionnel ;
- aucun envoi automatique sensible.

### Exploitation

- incidents inspectables ;
- monitoring actif ;
- sauvegarde et restauration testées ;
- coûts IA visibles ;
- procédure de rollback disponible ;
- nouvelle organisation configurable sans changement de code.

Si un critère critique échoue, le statut est **NON PRÊT**. Les écarts seront listés avec leur sévérité, leur correction attendue et une nouvelle date d'évaluation.

---

## 15. Équipe nécessaire

Pour tenir huit semaines avec ce niveau d'exigence :

- 1 lead engineer full-stack ;
- 1 engineer full-stack / intégrations ;
- 1 product designer à temps partiel ;
- 1 product owner disponible pour les décisions ;
- 1 revue QA/sécurité indépendante en semaines 2, 7 et 8.

Avec un seul engineer, il faut retirer soit le Control Center avancé, soit l'intégration email complète, soit prolonger la durée. Les éléments P0 de sécurité ne peuvent pas être retirés.

---

## 16. Définition finale de « plateforme qui marche »

À la fin du cycle, une plateforme qui marche signifie :

1. deux organisations de secteurs différents utilisent le même noyau ;
2. un utilisateur se connecte et ne voit que ses données ;
3. il importe des clients et des devis ;
4. Sesira calcule les relances selon sa configuration ;
5. Shadow Mode montre les actions prévues ;
6. un message peut être validé dans l'environnement de test ;
7. une réponse est associée, classifiée et routée ;
8. une exception apparaît dans À traiter ;
9. chaque action est expliquée et auditée ;
10. les erreurs peuvent être diagnostiquées et reprises ;
11. aucun secteur n'est codé en dur ;
12. le gate final détermine objectivement si la commercialisation peut commencer.
