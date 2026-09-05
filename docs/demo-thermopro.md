# THERMOPRO SERVICES — démonstration SESIRA

Toutes les personnes, sociétés, montants, références, messages, adresses et situations de cet espace sont fictifs.

## Séparation produit

La démonstration vit exclusivement sous **`/demo`**.

- aucune logique de sélection de tenant n'est ajoutée à `/app` ;
- aucun badge Démo n'est ajouté au shell du vrai produit ;
- aucune page `/app` n'est modifiée pour faire fonctionner la démonstration ;
- la navigation de la démo pointe uniquement vers `/demo/...` ;
- `/demo` est une surface de lecture seule ;
- le tenant Supabase fictif reste isolé avec l'identifiant `10000000-0000-4000-8000-000000000001` ;
- l'accès présentateur est contrôlé par une adhésion ACTIVE à ce tenant ;
- aucun identifiant utilisateur réel n'est versionné.

## Scénario

Organisation : **THERMOPRO SERVICES** — CVC, PAC, climatisation et maintenance en Île-de-France.

Le dataset live contient notamment 15 clients, 22 demandes, 12 opportunités, 18 devis, 12 interventions, 10 factures, 5 contrats d'entretien, 6 équipements et 12 documents fictifs.

Dossiers narratifs principaux : Sophie Lefèvre (PAC 18 450 €), Dupont SARL (groupe froid 22 400 €), Clinique Valmy (délai à revoir), Martin & Fils (contrat 1 840 €/an), Garage Montreuil (facture 12 400 €), Boulangerie Rivet (rapport terrain à valider).

## Sécurité

La démo ne déclenche aucune mutation métier. En plus, la frontière durable `record_outbound_message_intent` refuse les organisations marquées `demo_mode`, afin qu'un futur appel accidentel ne puisse pas atteindre un service d'e-mail externe.

Les données réglementaires de référence ne sont jamais inventées : si une règle n'est pas disponible, l'interface affiche l'état indisponible ou hors périmètre prévu par C40.
