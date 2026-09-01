# SESIRA OS — Roadmap de production et de commercialisation

> **Document remplacé pour le cycle initial.** La roadmap active est `SESIRA_OS_TECH_ROADMAP_8_SEMAINES.md`. Les activités commerciales décrites ici sont suspendues jusqu'à validation du gate technique de commercialisation.

> Version : 1.0  
> Date de départ de référence : 24 août 2026  
> Budget produit : 50 000–100 000 € hors acquisition commerciale, TVA et coûts internes  
> Objectif : première version commercialisable entre février et mars 2027  
> Périmètre commercial initial : suivi et relance intelligente des devis pour PME CVC françaises

Cette roadmap traduit la spécification produit et la doctrine premium en étapes de production concrètes. Elle privilégie une première promesse entièrement opérationnelle plutôt qu’une plateforme large mais inachevée.

---

## 1. Résultat attendu

À la fin du programme, Sesira doit pouvoir être vendu, installé et exploité auprès de PME CVC avec le parcours suivant :

```text
Diagnostic commercial
→ audit du processus de devis
→ configuration de l’organisation
→ connexion de la messagerie
→ import ou synchronisation des devis
→ Shadow Mode
→ validation humaine
→ automatisation limitée
→ suivi des réponses et exceptions
→ mesure des résultats
→ support et revue mensuelle
```

La plateforme est commercialisable lorsque :

- le workflow de suivi des devis fonctionne de bout en bout ;
- deux organisations pilotes l’ont utilisé sur des données réalistes ;
- aucune anomalie P0/P1 connue n’est ouverte ;
- les actions externes sont contrôlables, traçables et désactivables ;
- l’onboarding peut être reproduit sans modifier le code ;
- le support peut diagnostiquer un incident depuis le Control Center ;
- la proposition commerciale, le contrat pilote et les supports d’onboarding sont prêts ;
- les résultats observés sont séparés des estimations.

---

## 2. Hypothèses de production

### Scénario recommandé — budget proche de 100 k€

Équipe moyenne :

- 1 product lead / fondateur disponible chaque semaine ;
- 1 lead engineer full-stack ;
- 1 développeur full-stack ou automation engineer ;
- 1 product designer à temps partiel ;
- 1 spécialiste QA/sécurité ponctuel ;
- 1 responsable onboarding et opérations à temps partiel pendant les pilotes.

Durée cible : 24 à 28 semaines.

### Scénario contraint — budget proche de 50 k€

Équipe moyenne :

- 1 product lead / fondateur très impliqué ;
- 1 lead engineer full-stack ;
- design, QA et automation en interventions ciblées ;
- opérations pilote prises en charge par le fondateur.

Durée cible : 28 à 34 semaines.

Dans ce scénario, Growth, le diagnostic avancé, les publications et les intégrations CRM bidirectionnelles sortent du périmètre de lancement.

### Coûts non compris dans le budget produit

Prévoir séparément :

- acquisition et prospection ;
- frais juridiques et DPO externes ;
- assurance professionnelle et cyber ;
- abonnements Vercel, Supabase, OpenAI, Sentry, n8n et email ;
- production de contenus commerciaux ;
- matériel ou salaires internes déjà engagés.

---

## 3. Timeline exécutive

| Phase | Dates de référence | Durée | Résultat principal |
|---|---|---:|---|
| 0. Cadrage et preuve terrain | 24 août–6 septembre 2026 | 2 semaines | Périmètre et pilotes identifiés |
| 1. Produit, UX et architecture | 7–27 septembre | 3 semaines | Parcours validé et fondations décidées |
| 2. Fondations techniques | 28 septembre–25 octobre | 4 semaines | Multi-tenancy, auth, RLS, design system |
| 3. Domaine métier et interfaces | 26 octobre–22 novembre | 4 semaines | Clients, devis, messages, À traiter |
| 4. Workflow de relance | 23 novembre–20 décembre | 4 semaines | Shadow Mode et validation de bout en bout |
| Buffer de fin d’année | 21 décembre–3 janvier 2027 | 2 semaines | Rattrapage et disponibilité réduite |
| 5. Exploitation et résultats | 4–24 janvier | 3 semaines | Control Center, onboarding et mesure |
| 6. Hardening et release candidate | 25 janvier–14 février | 3 semaines | Sécurité, QA, incidents, performance |
| 7. Pilote 1 | 15 février–7 mars | 3 semaines | Validation sur première entreprise |
| 8. Pilote 2 et stabilisation | 8–28 mars | 3 semaines | Reproductibilité et corrections finales |
| 9. Lancement commercial contrôlé | À partir du 29 mars 2027 | continu | Vente à une première cohorte de 3–5 clients |

Cette timeline est une baseline prudente adaptée à une production premium. Avec une équipe complète, des pilotes disponibles dès le départ et peu d’inconnues d’intégration, le lancement contrôlé peut être avancé à février 2027.

---

## 4. Phase 0 — Cadrage et preuve terrain

### Dates

24 août–6 septembre 2026.

### Objectif

Transformer la vision en un problème commercial vérifié et obtenir l’accès à des données réalistes.

### Travail produit

- réaliser 8 à 12 entretiens avec dirigeants, responsables administratifs et commerciaux CVC ;
- documenter le parcours réel d’un devis dans 3 entreprises ;
- identifier les logiciels utilisés, volumes, délais, exceptions et responsabilités ;
- confirmer que le suivi des devis est la première douleur monétisable ;
- définir le profil de client pilote ;
- sélectionner les deux premières messageries à supporter, avec une seule prioritaire pour le pilote ;
- constituer un jeu de données anonymisé ou synthétique réaliste.

### Travail commercial

- obtenir deux lettres d’intention ou accords de pilote ;
- définir le format du pilote, sa durée et ses indicateurs ;
- tester une proposition de prix ;
- rédiger une fiche d’offre d’une page.

### Livrables

- Problem Brief ;
- cartographie du workflow actuel ;
- définition du V1 ;
- liste des non-objectifs ;
- critères de succès du pilote ;
- registre initial des risques ;
- deux entreprises pilotes pressenties.

### Gate de sortie

Ne pas engager la construction complète si aucun prospect ne donne accès à un processus réel ou si le suivi des devis n’est pas reconnu comme une priorité budgétaire.

---

## 5. Phase 1 — Produit, UX et architecture

### Dates

7–27 septembre 2026.

### Objectif

Éliminer les décisions structurantes avant que le développement principal commence.

### Produit et UX

- prototyper Accueil, À traiter, liste des devis, détail devis, Automatisations et Réglages ;
- tester le prototype avec 5 utilisateurs du secteur ;
- figer le vocabulaire français client ;
- définir les états vides, chargements, erreurs et confirmations ;
- préciser le parcours d’onboarding et le passage Observation → Shadow → Validation ;
- établir les composants du design system Midnight Papyrus.

### Architecture

- produire le modèle de données initial ;
- établir le modèle d’autorisation et de membership ;
- définir les frontières entre application, Supabase et n8n ;
- définir le format des événements, runs, incidents et audit logs ;
- sélectionner la première intégration email ;
- décider de la stratégie de déploiement dev, preview et production ;
- rédiger le threat model initial.

### Livrables

- prototype haute fidélité ;
- design tokens et composants de base ;
- architecture decision records ;
- schéma de données ;
- matrice RBAC ;
- catalogue des événements ;
- plan de test critique ;
- backlog ordonné.

### Gate de sortie

Le workflow principal doit être démontrable dans le prototype et compris sans explication technique par au moins 4 utilisateurs sur 5.

---

## 6. Phase 2 — Fondations techniques

### Dates

28 septembre–25 octobre 2026.

### Objectif

Créer une base sécurisée et reproductible pour tous les modules suivants.

### Production

- initialiser Next.js, TypeScript strict, Tailwind et composants Sesira ;
- créer Supabase Auth, organisations, memberships et rôles ;
- écrire les migrations et politiques RLS ;
- créer deux organisations seedées ;
- protéger routes, actions serveur et API ;
- mettre en place les environnements dev, preview et production ;
- ajouter les feature flags et le garde-fou `EXTERNAL_ACTIONS_ENABLED` ;
- installer observabilité, erreurs, logs structurés et corrélation des requêtes ;
- créer le shell du Control Center ;
- mettre en place CI, lint, typecheck, tests et preview deployments.

### Tests obligatoires

- accès autorisé aux données de sa propre organisation ;
- refus des accès cross-tenant ;
- refus des rôles insuffisants ;
- impossibilité d’utiliser un `organization_id` arbitraire ;
- secrets absents du client et des logs ;
- actions externes bloquées en dev et preview.

### Gate de sortie

Zéro défaut connu d’isolation. Toutes les migrations sont reproductibles sur une base vide.

---

## 7. Phase 3 — Domaine métier et interfaces

### Dates

26 octobre–22 novembre 2026.

### Objectif

Construire le socle utilisateur permettant de suivre un devis dans son contexte complet.

### Production

- clients et contacts ;
- devis et statuts ;
- messages et threads ;
- événements domaine ;
- attention items ;
- timeline du devis ;
- recherche, filtres et pagination ;
- assignation à un membre ;
- Accueil opérationnel ;
- détail client simplifié ;
- détail devis ;
- page À traiter ;
- audit des changements de statut et décisions humaines.

### UX à finaliser

- responsive laptop et tablette ;
- clavier et focus visibles ;
- contrastes et labels accessibles ;
- états longs, contenus tronqués et pièces jointes ;
- feedback après chaque action ;
- conservation des filtres utiles.

### Gate de sortie

Un utilisateur peut retrouver un devis, comprendre son historique, identifier la prochaine action et l’assigner sans assistance.

---

## 8. Phase 4 — Workflow de relance commercial

### Dates

23 novembre–20 décembre 2026.

### Objectif

Livrer le premier workflow complet, encore sans autonomie risquée.

### Production

- connexion de la première messagerie ;
- import et association des emails aux devis ;
- planification déterministe J+3, J+7, J+14 configurable ;
- templates de relance versionnés ;
- préparation de message ;
- Shadow Mode ;
- mode Validation ;
- envoi contrôlé ;
- détection des réponses ;
- classification structurée par IA ;
- validation des sorties IA ;
- escalade objection prix, plainte, opt-out et confiance basse ;
- prévention des doublons ;
- idempotence des webhooks et envois ;
- retries bornés et incidents ;
- kill switch organisation et automatisation ;
- journal de chaque action.

### Scénarios obligatoires

- aucune réponse ;
- intérêt ;
- question ;
- objection prix ;
- demande de recontact ultérieur ;
- refus ;
- plainte ;
- désinscription ;
- email ou webhook dupliqué ;
- mauvais thread ;
- timeout email, IA ou base ;
- JSON IA invalide ;
- token expiré ;
- devis fermé manuellement avant relance.

### Gate de sortie

Le parcours email → devis → relance → réponse → classification → À traiter passe de bout en bout sur deux organisations de test sans envoi en double.

---

## 9. Buffer de fin d’année

### Dates

21 décembre 2026–3 janvier 2027.

Cette période absorbe les retards, congés, revues de sécurité et indisponibilités fournisseurs. Aucun jalon commercial critique ne doit dépendre de décisions prises pendant cette fenêtre.

---

## 10. Phase 5 — Exploitation, onboarding et résultats

### Dates

4–24 janvier 2027.

### Objectif

Rendre le produit installable et opérable sans intervention constante des développeurs.

### Control Center

- organisations et modules activés ;
- état des intégrations ;
- runs et AI runs ;
- incidents et gravité ;
- pause et reprise d’une automatisation ;
- retry manuel autorisé ;
- consommation et coûts ;
- audit des actions internes.

### Onboarding

- checklist d’installation ;
- import initial des clients et devis ;
- configuration des règles de relance ;
- vérification des expéditeurs et signatures ;
- responsables des exceptions ;
- règles d’escalade ;
- activation Shadow Mode ;
- validation de lancement signée.

### Résultats

- devis surveillés ;
- relances préparées et envoyées ;
- réponses reçues ;
- exceptions détectées ;
- décisions humaines ;
- estimation du temps récupéré avec hypothèses visibles ;
- export de synthèse pilote.

### Gate de sortie

Une nouvelle organisation peut être configurée avec un template et des paramètres, sans branche de code dédiée.

---

## 11. Phase 6 — Hardening et release candidate

### Dates

25 janvier–14 février 2027.

### Objectif

Passer d’une beta fonctionnelle à une release candidate utilisable avec de vraies données.

### Qualité

- 500 événements réalistes minimum ;
- objectif de 1 000 scénarios synthétiques de réponses ;
- tests end-to-end du parcours critique ;
- tests de charge ciblés ;
- revue des indexes et requêtes ;
- revue de l’accessibilité ;
- tests sur desktop, laptop, tablette et mobile utile ;
- revue complète du français ;
- sauvegarde et restauration testées ;
- procédure de rollback documentée.

### Sécurité et confidentialité

- revue RLS indépendante ;
- revue des accès Control Center ;
- vérification des webhooks ;
- rate limiting des endpoints sensibles ;
- nettoyage des logs et données IA ;
- cartographie des données et fournisseurs ;
- procédure d’export et suppression ;
- procédure d’incident ;
- règles de rétention initiales.

### Gate release candidate

- zéro bug P0/P1 connu ;
- aucun scénario critique bloqué ;
- success rate du workflow supérieur à 99 % hors pannes fournisseurs simulées ;
- erreurs visibles et récupérables ;
- alertes opérationnelles testées ;
- rollback réalisable ;
- validation Product, Engineering et Operations.

---

## 12. Phase 7 — Pilote 1

### Dates

15 février–7 mars 2027.

### Objectif

Valider le produit sur une première entreprise avec un périmètre limité.

### Semaine 1

- connecter une seule boîte ou un groupe contrôlé ;
- importer un historique limité ;
- activer Shadow Mode ;
- comparer les décisions Sesira aux décisions humaines ;
- corriger les associations et règles.

### Semaine 2

- passer en mode Validation ;
- faire approuver chaque relance ;
- suivre faux positifs, faux négatifs et temps de traitement ;
- former les utilisateurs principaux.

### Semaine 3

- activer une automatisation limitée uniquement si les critères sont atteints ;
- mesurer l’usage, les incidents et la valeur observée ;
- réaliser une revue exécutive avec le client ;
- décider de poursuivre, corriger ou arrêter.

### Critères de réussite pilote 1

- aucune communication erronée grave ;
- aucun envoi en double ;
- 100 % des exceptions sensibles arrêtées ou escaladées ;
- plus de 80 % des suggestions validées sans modification majeure ;
- utilisateurs capables de traiter la file sans assistance quotidienne ;
- bénéfice perçu suffisant pour envisager un abonnement.

---

## 13. Phase 8 — Pilote 2 et stabilisation

### Dates

8–28 mars 2027.

### Objectif

Prouver que le produit fonctionne pour une deuxième organisation sans développement sur mesure.

### Production

- onboarder une organisation avec un autre fonctionnement ;
- mesurer le temps réel d’installation ;
- valider les paramètres par organisation ;
- corriger les hypothèses trop spécifiques au pilote 1 ;
- finaliser documentation et support ;
- verrouiller le périmètre de la version commerciale ;
- produire les notes de version et limites connues.

### Gate de commercialisation

- deux pilotes terminés ou en exploitation stable ;
- onboarding reproductible en moins de 5 jours ouvrés ;
- aucun code spécifique par client ;
- support capable de traiter les incidents courants ;
- métriques observées exportables ;
- modèle de prix et conditions contractuelles prêts ;
- références utilisées uniquement avec accord écrit.

---

## 14. Phase 9 — Lancement commercial contrôlé

### Date cible

À partir du 29 mars 2027.

### Cohorte initiale

Limiter le lancement à 3–5 clients proches du profil idéal :

- CVC en France ;
- 20–100 employés ;
- 30 devis ou plus par mois ;
- équipe administrative identifiée ;
- Microsoft 365 ou Gmail supporté ;
- sponsor interne disponible ;
- volonté de commencer en Shadow Mode.

### Offre recommandée

```text
Audit et onboarding
+
Sesira OS — Suivi des devis
+
pilotage mensuel
+
support et supervision
```

Le prix doit distinguer :

- frais d’audit et d’installation ;
- abonnement récurrent ;
- intégrations ou migration hors standard ;
- éventuels volumes supplémentaires.

### Capacité opérationnelle

Ne pas dépasser cinq nouveaux clients tant que :

- le temps d’onboarding médian n’est pas connu ;
- les incidents récurrents ne sont pas éliminés ;
- le support dépend encore systématiquement du lead engineer ;
- le coût fournisseur par client n’est pas mesuré ;
- les métriques de rétention et d’usage ne sont pas disponibles.

---

## 15. Travaux commerciaux à mener en parallèle

### Septembre–octobre 2026

- définir l’ICP et les personas ;
- créer un fichier de 50 prospects ciblés ;
- formaliser l’audit gratuit ou payant ;
- créer le script d’entretien ;
- établir les objections et réponses ;
- préparer une landing page simple avec demande de diagnostic.

### Novembre–décembre 2026

- produire une démonstration scénarisée ;
- préparer la présentation commerciale ;
- définir le contrat pilote ;
- préparer le DPA et les annexes fournisseurs avec conseil juridique ;
- rédiger la documentation sécurité ;
- commencer les conversations avec les futurs clients de la première cohorte.

### Janvier–février 2027

- présenter la release candidate à des prospects qualifiés ;
- planifier les audits de mars et avril ;
- finaliser pricing, conditions, facturation et support ;
- construire les études de cas uniquement à partir des pilotes et avec consentement ;
- préparer les emails d’onboarding et de revue mensuelle.

### Mars 2027

- convertir les pilotes lorsque la valeur est démontrée ;
- signer les 3–5 premiers clients ;
- publier les preuves autorisées ;
- suivre activation, usage, satisfaction et incidents chaque semaine.

---

## 16. Documents nécessaires avant la première vente

### Produit

- fiche fonctionnelle et limites ;
- guide utilisateur ;
- guide administrateur ;
- checklist d’onboarding ;
- matrice des automatisations et validations ;
- notes de version.

### Commercial

- proposition commerciale ;
- grille tarifaire ;
- contrat pilote ;
- contrat d’abonnement ;
- conditions de support ;
- présentation de démonstration ;
- calculateur de valeur avec hypothèses.

### Confiance et conformité

- politique de confidentialité ;
- DPA ;
- liste des sous-traitants ;
- politique de rétention ;
- procédure d’export et suppression ;
- procédure d’incident ;
- description des mesures de sécurité ;
- engagements exacts de disponibilité et de support.

Faire valider les documents juridiques par un professionnel compétent avant leur utilisation commerciale.

---

## 17. Indicateurs de pilotage

### Production

- avancement par gate, pas par pourcentage subjectif ;
- bugs P0/P1/P2 ouverts ;
- taux de réussite des tests critiques ;
- temps de cycle d’une correction ;
- dette bloquant le pilote.

### Produit

- temps jusqu’à la première valeur ;
- taux d’actions comprises sans assistance ;
- taux de suggestions acceptées ;
- taux de modifications avant envoi ;
- faux positifs et faux négatifs ;
- éléments À traiter non résolus.

### Opérations

- temps d’onboarding ;
- incidents par organisation ;
- temps de détection et résolution ;
- interventions nécessitant un développeur ;
- coût fournisseur par organisation ;
- temps mensuel d’exploitation par client.

### Commercial

- prospects qualifiés ;
- audits planifiés ;
- pilotes démarrés ;
- pilotes convertis ;
- durée du cycle de vente ;
- revenu récurrent signé ;
- motifs de refus ou de churn.

---

## 18. Décisions de périmètre par niveau de budget

| Élément | Budget 50 k€ | Budget 100 k€ |
|---|---|---|
| Suivi des devis | Production-grade | Production-grade |
| Messagerie | Un fournisseur prioritaire | Microsoft 365 + Gmail si calendrier tenu |
| CRM | Import CSV ou lecture simple | Un adaptateur CRM prioritaire |
| Growth | Hors lancement | Contenus en V1 limitée après workflow devis |
| Diagnostic public | Formulaire simple | Calculateur complet après pilotes |
| Design | Système compact premium | Système plus complet et tests utilisateurs étendus |
| QA | Tests critiques ciblés | Automatisation E2E et revue indépendante plus large |
| Sécurité | RLS, audit, revue ciblée | Revue indépendante et documentation client renforcée |
| Pilotes | 1–2, pilotés par fondateur | 2–3 avec soutien opérations |
| Lancement cible | Mars–avril 2027 | Février–mars 2027 |

---

## 19. Règles de gouvernance

1. Une seule personne décide du périmètre produit final.
2. Aucun nouveau module n’entre dans le V1 sans retirer un élément équivalent.
3. Chaque phase se termine par une revue et une décision go/no-go.
4. Les pilotes ne commencent pas avec des actions automatiques externes.
5. Les défauts de tenant isolation, doublon ou envoi erroné bloquent toute commercialisation.
6. Les demandes spécifiques client sont d’abord traitées par configuration.
7. Les preuves terrain ont priorité sur les hypothèses internes.
8. La réserve budgétaire reste dédiée au hardening et aux inconnues.
9. Le calendrier peut glisser pour la sécurité ou la fiabilité, pas pour ajouter des fonctions secondaires.
10. La version commerciale reste limitée au suivi des devis tant que ce workflow n’est pas stable et rentable à opérer.

---

## 20. Date de commercialisation recommandée

Avec un démarrage le 24 août 2026 :

- démonstration crédible : fin novembre 2026 ;
- alpha interne : décembre 2026 ;
- release candidate : 14 février 2027 ;
- premier pilote réel : 15 février 2027 ;
- deuxième pilote : 8 mars 2027 ;
- commercialisation contrôlée : 29 mars 2027 ;
- revue d’expansion : fin juin 2027, après 3 mois de données commerciales et opérationnelles.

La date du 29 mars 2027 est une cible, pas une obligation. Les gates de sécurité, fiabilité et reproductibilité priment sur la date.
