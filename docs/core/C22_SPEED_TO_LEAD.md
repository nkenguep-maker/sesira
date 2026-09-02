# SESIRA C22/U22 — Speed to Lead

## Définition retenue

C22 mesure la première prise en charge interne d’une nouvelle demande.

La mesure commence à `requests.created_at` et se termine au premier changement observé hors du statut `NEW`. Le timestamp `first_handled_at` est écrit par le Core une seule fois et ne peut pas être réécrit ensuite pour améliorer artificiellement la métrique.

Cette mesure ne signifie pas qu’une réponse a été envoyée au client. SESIRA ne fait cette affirmation nulle part dans le Core ni dans l’UI C22.

## Politique par organisation

Aucun délai universel n’est fourni par SESIRA. Un OWNER ou ADMIN peut configurer `value_policies.speed_to_lead.target_minutes` pour son organisation. La politique reste inactive tant qu’elle n’a pas été explicitement configurée et activée.

Quand la politique est active, chaque nouvelle demande reçoit une Attention déterministe avec un `due_at` égal à `created_at + target_minutes`. L’Attention existe de manière durable mais reste invisible dans l’inbox avant son échéance grâce au contrat existant des Attentions futures.

Si la demande est prise en charge avant l’échéance, l’Attention est résolue. Si la politique est désactivée, elle est dismissée. Un changement de cible resynchronise les échéances sans créer de doublon.

## Résumé mesuré

`get_speed_to_lead_summary` expose uniquement des observations tenant scoped :

1. demandes encore en statut Nouvelle
2. demandes au delà du délai choisi
3. attente la plus longue
4. nombre de prises en charge observées sur 30 jours
5. moyenne de prise en charge sur cet échantillon

Les demandes historiques déjà sorties de Nouvelle sans `first_handled_at` ne sont pas rétroactivement inventées.

## Garde fous

C22 n’utilise pas d’IA. C22 n’envoie aucun message. C22 n’autorise aucune action externe. C22 ne qualifie pas une demande à la place de l’équipe. Le délai est une règle interne choisie par l’organisation et sert à faire remonter une exception humaine.

Les clés d’Attention utilisent l’identité stable de la demande. Les lectures et fonctions vérifient l’appartenance à l’organisation. L’UI affiche explicitement qu’il s’agit d’une prise en charge interne et non d’un temps de réponse client.

## Surface U22

Le tableau de bord affiche les nouvelles demandes en attente, celles qui dépassent le délai choisi et la moyenne observée sur 30 jours. La page Politiques permet de configurer le délai sans valeur préremplie par SESIRA.

La production reste verrouillée après C22/U22. Un PASS exige le succès de `npm run verify` sur le head final exact du palier.
