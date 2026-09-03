# SESIRA C23/U23 — Préparation des devis et réactivation

## Préparation des devis

C23 ajoute une analyse déterministe des informations manquantes d’un brouillon. Le vocabulaire des gaps est fermé et validé. Le prix reste toujours une décision humaine. L’analyse ne produit ni remise, ni diagnostic technique, ni déclaration réglementaire, ni engagement de livraison ou de garantie.

Le Core stocke `draft_gaps` et `draft_analysis_at` sur le devis. Ces champs ne sont pas modifiables directement par un client authentifié. Ils passent par `record_quote_draft_gaps`, qui vérifie l’organisation, la forme des gaps, l’état DRAFT et écrit un audit.

La différence importante avec le prototype historique est que la readiness n’est plus un simple signal UI. Une transition DRAFT vers SENT est refusée en base tant qu’aucune analyse n’a été enregistrée ou qu’un gap reste ouvert. Les autres contrôles d’envoi restent applicables.

## Réactivation

`dormant_opportunities` retourne une liste read only d’opportunités non terminales sans activité depuis une fenêtre donnée. La fonction n’effectue aucune transition et ne crée aucun message sortant.

Une opportunité est exclue si un devis associé porte un opt out, si une automatisation est suspendue pour plainte ou si une objection commerciale ouverte de type plainte existe. Les états Gagnée, Perdue et Annulée sont exclus.

U23 utilise actuellement une fenêtre de travail de 60 jours. Cette valeur reprend le driver historique mais n’est pas présentée comme un benchmark ni comme une vérité métier.

`REAL_WORLD_CALIBRATION=PENDING`

Le seuil de réactivation devra être calibré avec des données client réelles avant toute prétention commerciale ou toute automatisation avancée.

## Surface U23

La page Devis affiche pour chaque brouillon l’état autoritaire de préparation : analyse requise, nombre d’éléments à compléter ou prêt côté Core. Aucun bouton d’envoi de contournement n’est ajouté.

La page Opportunités affiche jusqu’à six candidats de réactivation avec leur dernière activité observée, leur ancienneté et leur valeur connue. La vue est explicitement marquée Observation uniquement. L’opérateur doit ouvrir le dossier et décider.

## Garde fous

C23 ne nécessite aucune IA. C23 ne déclenche aucun provider effect. C23 ne relance aucun client. Le prix reste humain. Les plaintes et opt outs bloquent la réactivation. Les writes restent tenant scoped et auditables.

La production reste verrouillée. C23/U23 ne passe en PASS qu’après succès de `npm run verify` sur le head final exact.
