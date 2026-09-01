# SESIRA OS — Plan de lancement commercial en 8 semaines

> **Document remplacé.** À la suite de la décision produit du 23 août 2026, ce plan commercial n'est plus la roadmap active. La référence active est `SESIRA_OS_TECH_ROADMAP_8_SEMAINES.md`. Aucun travail de vente n'est prévu pendant les huit premières semaines.

> Début : 24 août 2026  
> Première vente visée : avant le 20 septembre 2026  
> Mise en service client : avant le 18 octobre 2026  
> Modèle de lancement : pilote payé et accompagné

## Objectif

En huit semaines, Sesira ne lance pas toute la plateforme décrite dans la spécification. Sesira vend et met en service une première offre étroite :

> Sesira surveille vos devis, prépare les relances et fait remonter les réponses qui nécessitent votre attention.

La commercialisation commence avant la fin du développement. Le premier client achète un pilote accompagné avec un périmètre, une durée et des critères de réussite explicites.

## Périmètre obligatoire

- un secteur : CVC ;
- un workflow : suivi et relance des devis ;
- un seul fournisseur email, choisi selon le premier client ;
- import des devis par CSV ou saisie simple ;
- Shadow Mode puis validation humaine ;
- classification des réponses ;
- page À traiter ;
- historique et journal d’activité ;
- résultats simples et vérifiables ;
- support humain rapproché.

## Hors périmètre des huit semaines

- Sesira Growth ;
- publications sociales ;
- interventions et rapports terrain ;
- documents et factures ;
- diagnostic public avancé ;
- application mobile ;
- intégrations multiples ;
- synchronisation CRM bidirectionnelle ;
- automatisation sans validation humaine ;
- analytics avancés ;
- self-service onboarding.

## Offre à vendre

### Pilote Sesira — Suivi des devis

Durée : 30 jours après mise en service.

Inclus :

- audit du processus de devis ;
- configuration de Sesira ;
- import initial ;
- connexion d’une boîte email ou d’un périmètre contrôlé ;
- Shadow Mode ;
- passage en validation humaine ;
- revue hebdomadaire ;
- bilan de fin de pilote.

Prix recommandé pour les premiers clients :

- onboarding et pilote : 2 500–5 000 € HT ;
- puis abonnement cible : 1 500 € HT/mois ;
- remise éventuelle contre disponibilité, feedback structuré et droit d’utiliser une référence uniquement avec accord écrit.

Ne pas proposer un pilote gratuit sauf cas stratégique exceptionnel.

## Timeline

| Semaine | Dates | Produit | Commercial | Résultat attendu |
|---|---|---|---|---|
| 1 | 24–30 août | Prototype du workflow | 10 entretiens, offre et liste de 50 prospects | Problème confirmé et 3 prospects chauds |
| 2 | 31 août–6 septembre | Démo cliquable et design | Démonstrations et propositions pilote | 1–2 accords de principe |
| 3 | 7–13 septembre | Auth, organisations, RLS, devis | Relances commerciales et négociation | Premier pilote proche de la signature |
| 4 | 14–20 septembre | Clients, devis, À traiter, import CSV | Signature et acompte du pilote 1 | Première vente réalisée |
| 5 | 21–27 septembre | Email, planification et Shadow Mode | Audit et collecte des données client | Workflow actif en environnement contrôlé |
| 6 | 28 septembre–4 octobre | Réponses, IA structurée, validation et logs | Onboarding client et vente du pilote 2 | Pilote 1 installé |
| 7 | 5–11 octobre | Tests, doublons, retries, kill switch | Shadow Mode réel et formation | Décisions comparées aux humains |
| 8 | 12–18 octobre | Corrections et résultats simples | Passage en validation et lancement limité | Offre commercialisable auprès de 3–5 clients |

## Semaine 1 — Vendre le problème

- interviewer 10 entreprises CVC ;
- documenter leurs volumes de devis et méthodes de relance ;
- identifier le fournisseur email du meilleur prospect ;
- créer une présentation commerciale de 8 à 10 slides ;
- créer une page d’offre simple ;
- préparer une liste de 50 prospects ;
- prendre 10 rendez-vous ;
- définir contrat, prix et critères du pilote.

Gate : au moins trois prospects confirment la douleur et acceptent une démonstration.

## Semaine 2 — Démontrer et pré-vendre

- construire une démo cliquable avec données CVC réalistes ;
- montrer Accueil, Devis, À traiter et une relance préparée ;
- réaliser cinq démonstrations ;
- remettre une proposition sous 24 heures ;
- demander un accord de principe et une date de démarrage ;
- sélectionner le fournisseur email selon le pilote le plus avancé.

Gate : au moins un prospect souhaite démarrer dans les 30 jours.

## Semaines 3–4 — Construire le socle et signer

- authentification et organisations ;
- RLS et autorisation serveur ;
- clients, devis et statuts ;
- import CSV ;
- page À traiter ;
- timeline d’un devis ;
- feature flags et blocage des actions externes ;
- contrat pilote, acompte et calendrier d’onboarding.

Gate commercial : premier pilote signé et payé avant le 20 septembre.

Gate produit : deux organisations de test isolées et workflow utilisable avec des données seedées.

## Semaines 5–6 — Workflow réel

- connecter le fournisseur email retenu ;
- associer emails, threads et devis ;
- calculer les échéances de manière déterministe ;
- préparer les relances ;
- activer Shadow Mode ;
- détecter et classifier les réponses ;
- arrêter les cas sensibles ;
- permettre la validation humaine ;
- tracer actions, AI runs et erreurs ;
- installer le premier client.

Gate : parcours devis → relance → réponse → À traiter fonctionnel sans envoi automatique.

## Semaines 7–8 — Sécuriser et lancer

- tester les doublons, opt-out, plaintes et objections prix ;
- tester les tokens expirés et pannes fournisseurs ;
- ajouter retries bornés et kill switch ;
- vérifier l’isolation des organisations ;
- corriger les erreurs observées en Shadow Mode ;
- former les utilisateurs ;
- passer en mode Validation ;
- produire un rapport simple de résultats ;
- signer ou préparer le pilote 2.

Gate de lancement : aucun bug P0/P1, aucun envoi en double, aucune action sensible autonome et reprise manuelle possible.

## Équipe minimale

- 1 fondateur/Product & Sales à plein temps ;
- 1 lead engineer full-stack à plein temps ;
- 1 second engineer ou spécialiste intégrations à plein temps ;
- 1 product designer pendant les deux premières semaines puis à temps partiel ;
- QA/sécurité ciblée pendant les semaines 7 et 8.

Avec un seul développeur, huit semaines restent possibles uniquement si l’intégration email est simple et si le fondateur prend en charge la vente, les données et l’onboarding.

## Budget de lancement

Enveloppe indicative sur huit semaines :

| Poste | Budget |
|---|---:|
| Engineering | 25–45 k€ |
| Produit et design | 6–12 k€ |
| Intégration et automation | 6–12 k€ |
| QA, sécurité et observabilité | 5–10 k€ |
| Commercial, onboarding et juridique | 5–10 k€ |
| Réserve | 5–10 k€ |

Une partie du budget global de 100 k€ doit rester disponible après la semaine 8 pour corriger les retours pilotes et préparer la montée en charge.

## Indicateurs des huit semaines

### Commercial

- 50 prospects ciblés ;
- 10 entretiens ;
- 5 démonstrations ;
- 2 propositions ;
- 1 pilote payé avant la semaine 4 ;
- 1 second pilote en négociation avant la semaine 8.

### Produit

- deux organisations isolées ;
- 100 scénarios de réponse minimum ;
- zéro envoi en double ;
- 100 % des plaintes, opt-out et objections prix escaladés ;
- 80 % des suggestions acceptées ou corrigées légèrement ;
- workflow récupérable manuellement.

## Règle de lancement

À huit semaines, Sesira est commercialisé comme un service logiciel accompagné. Le produit gagne progressivement en autonomie après les pilotes.

La promesse vendue doit correspondre exactement à ce qui fonctionne : suivi des devis, relances préparées, validation humaine et détection des réponses importantes.
