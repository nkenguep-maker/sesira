# SESIRA — Inventaire complet des layouts UI

> Destination : Claude Design  
> Source : implémentation produit actuelle  
> Objet : retravailler l’interface sans modifier les parcours, les données ou l’architecture

## 1. Périmètre

L’interface actuelle contient 29 écrans produit répartis en quatre espaces :

- site public et acquisition ;
- espace de travail PME ;
- Sesira Growth ;
- Control Center interne.

Les routes `/dev/customers` et `/dev/settings` sont des vues de développement et ne doivent pas devenir des écrans produit.

## 2. Système visuel actuel

### Identité SESIRA v6

- encre et fonds sombres : `#0E1418` ;
- texte secondaire : `#4A555E` ;
- labels et métadonnées : `#8A949C` ;
- fond d’application : `#EEF1F3` ;
- surfaces : `#FFFFFF` ;
- bordures : `#DCE2E6`, `#E4E9EC` et `#C9D2D8` ;
- accent d’action unique : `#1D4ED8` ;
- accent clair sur fond encre : `#7FA0F5` ;
- sable réservé aux estimations : `#FFFBF3` ;
- police de titres, chiffres et montants : Archivo 600 ;
- police de texte et d’interface : Public Sans 400/500/600 ;
- rayon nul partout, sauf puces d’état et avatars.

### Intention à conserver

- calme, précis, crédible pour une PME ;
- valeur métier avant la technologie ;
- gros chiffres uniquement lorsqu’ils facilitent une décision ;
- bleu comme unique couleur d’action ;
- blanc et encre pour les données observées ;
- sable uniquement pour une estimation ou une hypothèse ;
- rouge réservé aux erreurs et incidents réels.

### À éviter

- halos et dégradés flous ;
- esthétique de produit « IA » générique ;
- icônes décoratives dans des bulles ;
- multiplication des cartes et des coins très arrondis ;
- jargon technique ;
- graphiques sans information utile ;
- faux témoignages, faux clients ou faux résultats.

## 3. Structures communes

### A. Site public

- header horizontal avec marque, navigation courte, connexion et CTA ;
- contenu centré dans une largeur maximale ;
- sections pleine largeur séparées par une bordure fine ;
- footer minimal ;
- navigation mobile réduite à la marque et au CTA principal.

### B. Espace PME

- sidebar desktop persistante ;
- navigation mobile compacte ;
- zone de contenu avec largeur confortable ;
- `PageHeader` avec titre, explication et action principale ;
- cartes de métriques puis contenu opérationnel ;
- listes sous forme de tableau sur desktop et de cartes sur mobile.

Navigation principale :

1. Vue d’ensemble
2. Clients
3. Demandes
4. Devis
5. À traiter
6. Résultats
7. Automatisations
8. Marketing
9. Paramètres

### C. Pages de liste

Ordre recommandé :

1. titre et action de création ;
2. métriques utiles ;
3. recherche et filtres ;
4. liste ou tableau ;
5. pagination ;
6. état vide, sans résultat ou erreur.

### D. Pages de détail

Ordre recommandé :

1. retour à la liste ;
2. identité de l’objet et statut ;
3. actions contextuelles ;
4. informations principales ;
5. relations client → demande → devis ;
6. activité chronologique.

### E. Formulaires

- une colonne principale ;
- sections courtes ;
- labels toujours visibles ;
- aide seulement lorsqu’elle est nécessaire ;
- erreurs sous le champ concerné ;
- action principale et annulation en bas ;
- état de sauvegarde, succès et formulaire modifié non enregistré.

### F. États partagés

Chaque module doit posséder :

- chargement par skeleton ;
- premier état vide avec action claire ;
- aucun résultat après recherche ;
- erreur avec possibilité de réessayer ;
- ressource introuvable pour les détails ;
- session expirée avec retour à la connexion ;
- focus clavier visible ;
- contenu long sans débordement ;
- grands montants lisibles sur mobile.

## 4. Site public et acquisition

### 01 — Landing page

Route : `/`

Objectif : expliquer simplement comment Sesira aide une PME et rendre le gain potentiel compréhensible.

Structure actuelle :

1. header : marque, « Ce que vous gagnez », « Potentiel », « Mise en place », connexion, CTA ;
2. hero : promesse « Moins de tâches administratives. Plus de demandes et de devis suivis. » ;
3. aperçu produit : trois dossiers — nouvelle demande, devis envoyé, décision humaine ;
4. bénéfices : ne pas perdre une demande, savoir quel devis suivre, garder les décisions importantes ;
5. potentiel financier : formule lisible et exemple fictif ;
6. CTA vers le diagnostic ;
7. mise en place en trois étapes ;
8. contrôle humain : ce que Sesira prépare et ce que l’équipe décide ;
9. CTA final et footer.

Élément majeur : bloc de calcul avec temps récupéré, marge potentielle, hypothèses visibles et avertissement indiquant qu’il ne s’agit pas de revenu déjà généré.

Mobile : hero en une colonne, aperçu produit sous le CTA, navigation secondaire masquée, blocs financiers empilés.

### 02 — Diagnostic public

Route : `/diagnostic`

Objectif : donner une première estimation avant toute demande de contact.

Parcours :

1. Votre activité — choix du secteur ;
2. Votre entreprise — taille et caractéristiques ;
3. Votre fonctionnement — demandes, devis et temps administratif ;
4. Vos résultats — priorités et scénarios prudent, probable et haut potentiel ;
5. formulaire de contact affiché après les résultats.

Secteurs initiaux : chauffage/climatisation, solaire, maintenance/services techniques, construction/rénovation.

Résultat : top 3 priorités, hypothèses visibles, scénarios comparables, aucune référence à un faux benchmark.

Mobile : une question principale par écran, progression visible, champs pleine largeur, résultats empilés.

### 03 — Connexion et création de compte

Route : `/login`

Structure :

- colonne éditoriale avec la promesse Sesira ;
- panneau d’authentification ;
- modes connexion et création de compte ;
- email et mot de passe ;
- nom complet et entreprise lors de la création ;
- erreur ou confirmation sous le formulaire.

Mobile : colonne éditoriale raccourcie puis formulaire pleine largeur.

### 04 — Page introuvable globale

Route : toute route publique inconnue.

Structure : message court, explication simple, retour à l’accueil ou à l’espace Sesira.

## 5. Espace PME

### 05 — Vue d’ensemble

Route : `/app`

Objectif : montrer ce qui compte aujourd’hui.

Structure :

- salutation et nom de l’entreprise ;
- métriques synthétiques ;
- éléments demandant une action ;
- activité récente ;
- raccourcis vers clients, demandes et devis.

La page doit privilégier les décisions du jour, pas devenir un tableau de bord analytique dense.

### 06 — Liste des clients

Route : `/app/customers`

Structure :

- titre et bouton « Nouveau client » ;
- synthèse du portefeuille ;
- recherche ;
- filtres utiles ;
- liste avec nom, entreprise, contact, type et date ;
- pagination.

Mobile : cartes cliquables, nom et entreprise en premier, informations secondaires réduites.

### 07 — Nouveau client

Route : `/app/customers/new`

Structure : formulaire unique avec type de client, nom, entreprise, email et téléphone. Actions « Créer le client » et « Annuler ».

### 08 — Détail client

Route : `/app/customers/[customerId]`

Objectif : comprendre toute la relation avec ce client.

Structure :

- nom, type et informations de contact ;
- action « Nouvelle demande » ;
- chemin visuel Client → Demandes → Devis → Activité ;
- demandes liées ;
- devis liés avec montant et statut ;
- timeline métier unifiée.

État spécifique : client introuvable ou appartenant à une autre organisation.

### 09 — Liste des demandes

Route : `/app/requests`

Structure :

- métriques : total, nouvelles, informations manquantes, prêtes ;
- bouton « Nouvelle demande » ;
- recherche ;
- filtre de statut ;
- filtre de source si disponible ;
- liste avec titre, client, source, date et statut ;
- pagination.

Libellés prioritaires : Nouvelles demandes, À qualifier, Informations manquantes, Prêt pour votre équipe.

### 10 — Nouvelle demande

Route : `/app/requests/new`

Structure :

- client existant obligatoire ;
- titre ou type de demande ;
- source ;
- description ;
- informations de qualification disponibles ;
- création et annulation.

Contexte possible : client prérempli lorsque le formulaire est ouvert depuis son détail.

### 11 — Détail demande

Route : `/app/requests/[requestId]`

Structure :

- titre et statut ;
- client lié ;
- action « Créer un devis » ;
- source, description, qualification, date et assignation ;
- changement de statut simple ;
- devis liés ;
- événements liés à la demande.

État spécifique : demande introuvable ou non autorisée.

### 12 — Liste des devis

Route : `/app/quotes`

Structure :

- bouton « Nouveau devis » ;
- synthèse des devis ;
- recherche par client ou devis ;
- filtre de statut ;
- filtre de date pertinente ;
- liste avec client, demande, montant, statut, date d’envoi, prochaine date et responsable ;
- pagination.

Le montant doit être visuellement plus important que les autres colonnes.

### 13 — Nouveau devis

Route : `/app/quotes/new`

Structure :

- client obligatoire ;
- demande optionnelle ;
- titre ;
- montant et devise ;
- statut initial ;
- dates d’envoi et d’expiration lorsqu’elles sont applicables ;
- création et annulation.

Contexte possible : client et demande préremplis depuis le parcours métier.

### 14 — Détail devis

Route : `/app/quotes/[quoteId]`

Structure :

- titre, statut et montant très visible ;
- actions « Voir le client », « Voir la demande » et « Ajouter à traiter » ;
- client, demande, envoi, expiration et responsable ;
- changement de statut, dont « Envoyé » lorsque permis ;
- activité la plus récente ;
- messages associés lorsqu’ils existent ;
- timeline métier.

États : brouillon, envoyé, à suivre, réponse reçue, à voir, gagné, perdu, expiré.

### 15 — Boîte « À traiter »

Route : `/app/attention`

Objectif : servir de boîte de décision humaine.

Structure :

- onglets ouverts et résolus ;
- filtres de priorité et catégorie ;
- cartes répondant à trois questions : que s’est-il passé, pourquoi Sesira le montre, que faire ;
- entité liée : client, demande ou devis ;
- date d’échéance et responsable si disponibles ;
- action contextuelle vers l’objet ;
- bouton « Résoudre » ;
- pagination si nécessaire.

La priorité et les décisions sensibles utilisent l’or avec retenue.

### 16 — Nouvel élément à traiter

Route : `/app/attention/new`

Structure :

- rappel du devis concerné ;
- titre ;
- explication ;
- priorité ;
- catégorie ;
- action suggérée si disponible ;
- création et retour au devis.

### 17 — Résultats

Route : `/app/results`

Objectif : distinguer clairement les faits observés des estimations.

Structure :

- sélecteur de période ;
- section `OBSERVÉ` : nouvelles demandes, devis créés, devis envoyés, éléments à traiter, éléments résolus ;
- section `ESTIMATION` : temps récupéré, valeur du temps, gain potentiel, potentiel total, valeur pour 1 € investi ;
- étiquettes `HYPOTHÈSE` ;
- explication visible des hypothèses ;
- graphiques minimaux uniquement si une évolution réelle existe.

États particuliers : aucune donnée, données observées partielles, estimation seulement, valeurs nulles et erreur.

### 18 — Automatisations

Route : `/app/automations`

Objectif : expliquer les capacités autorisées sans simuler une exécution.

Cartes possibles :

- Relancer les devis ;
- Traiter les nouvelles demandes ;
- Trier les emails ;
- Créer les rapports ;
- Relancer les factures.

Contenu de chaque carte : statut, niveau, santé, activité récente, dernier succès, dernier problème, actions autorisées et décisions toujours humaines.

Niveaux visibles : Observation, Observation en conditions réelles, Validation par votre équipe, Automatique.

Le message Shadow est : « Sesira aurait effectué cette action. » Il ne doit apparaître que comme état préparé, jamais comme fausse exécution.

### 19 — Paramètres

Route : `/app/settings`

Navigation interne :

1. Entreprise
2. Équipe
3. Connexions
4. Notifications
5. Données
6. Facturation

Layouts :

- Entreprise : formulaire des informations persistées ;
- Équipe : membres et rôles existants ;
- Connexions : Microsoft 365, Gmail, CRM et Calendrier, sans faux état actif ;
- Notifications : demande urgente, réponse à un devis, objection prix, incident d’automatisation ;
- Données : export, rétention et demande de suppression sécurisée ;
- Facturation : plan actuel et offre, sans paiement Stripe actif.

États : sauvegarde, succès, erreur de validation, permission insuffisante et modifications non enregistrées.

## 6. Sesira Growth

### Structure commune Growth

- navigation locale Marketing, Idées, Contenus, Publications ;
- bloc « Votre entreprise » pour les connaissances de marque ;
- contenu de démonstration explicitement présenté comme tel ;
- aucune action ne doit prétendre publier réellement.

### 20 — Accueil Marketing

Route : `/app/marketing`

Structure :

- Idées à préparer ;
- Contenus à valider ;
- Publications prévues ;
- raccourcis vers chaque espace ;
- résumé de « Votre entreprise ».

### 21 — Idées

Route : `/app/marketing/ideas`

Structure : liste de sujets réalistes avec titre, angle, canal possible, date et état. Action de consultation ou de préparation uniquement.

### 22 — Contenus

Route : `/app/marketing/content`

Structure : liste ou cartes avec titre, extrait, canaux, date de mise à jour et statut.

Statuts : Idée, Brouillon, À valider, Validé, Planifié, Publié.

### 23 — Publications

Route : `/app/marketing/publications`

Structure : calendrier léger ou liste chronologique avec contenu, canal, date et statut.

Canaux : LinkedIn, Facebook, Instagram, Google Business et Email.

## 7. Control Center interne

### Structure commune

- espace visuellement distinct de l’application client ;
- navigation Overview, Organizations, Runs, AI Runs, Incidents, Integrations ;
- bandeau indiquant qu’il s’agit d’un espace interne ;
- routes indisponibles aux utilisateurs ordinaires ;
- aucune visualisation de secret, impersonation libre ou override de production.

### 24 — Vue d’ensemble Control Center

Route : `/control`

Structure : organisations, santé des automatisations, taux de succès, incidents ouverts et coûts IA/infrastructure. Les données manquantes doivent apparaître comme indisponibles, pas comme zéro fictif.

### 25 — Organisations

Route : `/control/organizations`

Tableau : organisation, secteur, modules, santé, intégrations et incidents. Ligne ouvrable vers un futur détail, sans impersonation.

### 26 — Exécutions

Route : `/control/runs`

Tableau : organisation, automatisation, statut, date, durée. Filtres simples par organisation et statut.

### 27 — Traitements Sesira

Route : `/control/ai-runs`

Tableau : fonctionnalité, modèle, confiance, latence, coût et statut. Aucun prompt sensible ou secret affiché.

### 28 — Incidents

Route : `/control/incidents`

Tableau : organisation, gravité, catégorie, statut, création et dernière mise à jour. Les incidents ouverts sont prioritaires visuellement.

### 29 — Intégrations

Route : `/control/integrations`

Tableau : organisation, fournisseur, santé, dernière synchronisation, expiration ou problème. Aucun token ni secret visible.

## 8. Composants partagés existants

À retravailler comme un système cohérent sans sur-abstraction :

- `PageHeader` ;
- `MetricCard` ;
- `StatusBadge` ;
- `EmptyState` ;
- `ErrorState` ;
- `LoadingSkeleton` ;
- `FilterBar` ;
- `ActivityTimeline` / timeline métier ;
- cartes À traiter ;
- champs de recherche ;
- sections de formulaire ;
- sections de détail ;
- affichage des montants ;
- indicateur de santé ;
- badge d’estimation ;
- pagination ;
- navigation principale ;
- navigation Growth ;
- navigation Control Center.

## 9. Contraintes à donner à Claude Design

- conserver exactement les routes et le parcours Client → Demande → Devis → Timeline → À traiter ;
- ne pas ajouter de fonctionnalité backend ;
- ne pas inventer d’automatisation, d’intégration ou de donnée ;
- ne pas transformer Sesira en CRM complet ;
- ne pas rendre l’interface dépendante d’illustrations décoratives ;
- proposer desktop 1440 px, desktop 1280 px, tablette 768 px et mobile 390 px ;
- produire pour chaque famille un état chargé, vide, erreur et mobile ;
- garder le français simple ;
- rendre le montant des devis et la prochaine décision immédiatement visibles ;
- distinguer visuellement `OBSERVÉ`, `ESTIMATION` et `HYPOTHÈSE` ;
- distinguer l’espace client du Control Center interne ;
- préserver l’accessibilité clavier, les contrastes et les zones tactiles.

## 10. Prompt maître pour Claude Design

```text
Redessine l’interface complète de SESIRA à partir de l’inventaire fourni.

SESIRA est une plateforme destinée aux PME françaises. Elle réunit les clients,
les nouvelles demandes, les devis, les décisions humaines et les résultats dans
un espace simple. Le produit doit sembler premium, calme et opérationnel, sans
esthétique de SaaS IA générique.

Conserve les routes, la hiérarchie de l’information et les parcours métier.
Ne crée aucune nouvelle fonctionnalité. Ne simule aucune automatisation, aucune
intégration active, aucun revenu et aucun benchmark.

Travaille d’abord le système global, puis les layouts desktop 1440 px et mobile
390 px. Utilise les mêmes composants pour les états chargement, vide, aucun
résultat, erreur et introuvable. Les décisions, montants et prochaines actions
doivent être compris en moins de cinq secondes.

Direction : premium français, précis, sobre, humain. Évite halos, dégradés flous,
icônes dans des bulles, jargon IA, dashboards surchargés et cartes inutiles.
```
