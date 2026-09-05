# THERMOPRO SERVICES — scénario de démonstration

> Toutes les personnes, sociétés, montants, références, messages, adresses et situations de cet espace sont fictifs. Le tenant est réservé aux démonstrations SESIRA.

## Identité

- Organisation : **THERMOPRO SERVICES**
- Activité : CVC · PAC · Climatisation · Maintenance
- Zone : Île-de-France
- Profil fictif : 12 collaborateurs, dont 4 techniciens terrain
- Tenant déterministe : `10000000-0000-4000-8000-000000000001`
- `feature_flags.demo_mode = true`
- `growth_enabled = false`

L'accès présentateur est accordé séparément via `organization_members`. Aucun identifiant d'utilisateur réel ne doit être versionné dans ce document ou dans un seed public.

## Scénario commercial

Le dataset live contient 15 clients, 22 demandes, 12 opportunités et 18 devis.

Dossiers narratifs principaux :

1. **Sophie Lefèvre** — PAC air/eau — devis `DV-2026-0421` de **18 450 €**, envoyé depuis 7 jours, relance à vérifier.
2. **Dupont SARL** — remplacement groupe froid — **22 400 €**, dossier gagné mais chantier encore à planifier.
3. **Clinique Valmy** — réponse client : « Pouvez-vous revoir le délai d’installation ? » ; décision humaine avant réponse.
4. **Martin & Fils** — contrat d'entretien — **1 840 €/an**, échéance proche.
5. **Garage Montreuil** — facture `F-2026-0418` de **12 400 €**, promesse de paiement dépassée.
6. **Boulangerie Rivet** — intervention #1842 terminée, rapport terrain relu, trois photos fictives et validation attendue.

## Aujourd'hui

Le dashboard doit être calculé à partir des vraies tables du tenant. Le scénario courant vise :

- **7** situations à traiter ;
- **12** devis en cours ;
- **6** interventions marquées comme prévues aujourd'hui ;
- **1** facture en retard.

Les sept situations sont produites par les read-models C40 :

- 3 `attention_items` commerciaux/opérationnels ;
- 1 `field_report` en `REVIEWED` ;
- 1 facture `OVERDUE` avec promesse de paiement dépassée ;
- 1 contrat de maintenance dans la fenêtre des 30 jours ;
- 1 `regulatory_attention` non résolue.

Aucune liste de tâches n'est codée en dur dans la page Aujourd'hui.

## Terrain

- 12 interventions fictives dans le tenant ;
- 6 portent `metadata.demo_today = true` pour la journée de démonstration ;
- techniciens d'affichage fictifs : Karim D., Lucas M., Amine R., Nicolas P. ;
- le rapport Rivet est `REVIEWED` et contient trois références photo `demo://...` ; aucune image réelle n'est prétendue stockée.

## Facturation et maintenance

- 10 factures fictives ;
- une seule facture est volontairement `OVERDUE` afin de garder Aujourd'hui compact ;
- 5 contrats de maintenance actifs ; seul Martin & Fils tombe dans la fenêtre immédiate du dashboard.

## Obligations CVC

Le tenant contient six équipements fictifs et une attestation de capacité explicitement marquée démonstration. La référence `DEMO-CAP-2026-014` n'est pas un document réel.

Les valeurs réglementaires de référence ne sont **pas inventées** dans le dataset. Si une règle GWP n'est pas présente dans la base de référence, SESIRA doit afficher l'état indisponible/hors périmètre prévu par C40 plutôt que fabriquer un calcul.

## Résultats

Le scénario ajoute 14 événements fictifs `quote.sent` et quatre attentions historiques résolues afin que la page Résultats puisse montrer des observations sur une période réelle du tenant démo.

Ces données sont des observations **à l'intérieur d'un scénario fictif**, jamais une preuve de ROI ou de causalité SESIRA.

## Sécurité

- le mode Démo est identifié dans le shell et le dashboard ;
- le changement d'organisation est vérifié contre une adhésion `ACTIVE` côté serveur ;
- en l'absence de cookie valide, SESIRA préfère l'organisation non-démo de l'utilisateur ;
- `approveFollowupAction` refuse tout envoi externe quand `viewer.organization.demoMode === true`, même si les variables de production Resend sont actives ;
- aucune donnée du tenant FAMYEP n'est copiée vers THERMOPRO.
