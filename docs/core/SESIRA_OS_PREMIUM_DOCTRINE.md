# SESIRA OS — Doctrine Premium

> Version : 1.0  
> Statut : Doctrine d’investissement et de qualité  
> Budget de référence : 50 000–100 000 € hors acquisition commerciale et TVA  
> Positionnement : plateforme B2B premium, opérée comme un service de confiance

Cette doctrine complète la spécification produit et engineering de Sesira OS. Elle définit le niveau d’exigence attendu lorsqu’un budget de 50–100 k€ est engagé.

Elle ne signifie pas qu’il faut construire davantage de fonctionnalités. Elle signifie qu’il faut construire moins de surface, mais avec davantage de cohérence, de fiabilité, de finition et de capacité opérationnelle.

---

## 1. Définition de « premium »

Pour Sesira, premium ne veut pas dire luxe visuel, accumulation d’intelligence artificielle ou catalogue d’intégrations.

Premium signifie :

- une promesse immédiatement compréhensible ;
- une expérience calme, rapide et sans ambiguïté ;
- des automatisations prévisibles et réversibles ;
- aucune action sensible sans contrôle approprié ;
- une donnée fiable, traçable et isolée par organisation ;
- une prise en charge humaine lorsqu’un cas sort du cadre ;
- une mise en service accompagnée, mesurée et documentée ;
- une qualité constante pour chaque client, même lorsque le nombre de clients augmente.

La règle fondatrice est :

> Un produit premium ne promet pas que tout est automatique. Il prouve que rien d’important n’est perdu, envoyé par erreur ou laissé sans responsable.

---

## 2. Doctrine d’investissement

Le budget doit financer une capacité commercialisable et opérable, pas seulement un prototype.

Répartition indicative :

| Poste | 50 k€ | 100 k€ | Finalité |
|---|---:|---:|---|
| Produit, UX et design system | 8–12 k€ | 16–22 k€ | Expérience claire, cohérente et premium |
| Engineering V1 et architecture | 18–24 k€ | 35–45 k€ | Vertical slice fiable et multi-tenant |
| Intégrations et automatisations | 6–9 k€ | 12–18 k€ | Email, suivi des devis, retries, idempotence |
| Sécurité, qualité et observabilité | 5–7 k€ | 10–14 k€ | RLS, audit, tests, incidents, monitoring |
| Onboarding, données et pilote | 5–7 k€ | 10–15 k€ | Configuration client, shadow mode, mesure |
| Réserve de stabilisation | 5–8 k€ | 10–15 k€ | Inconnues, corrections, durcissement |

Ces montants sont des enveloppes de décision, non un budget à consommer mécaniquement. La réserve ne doit pas être supprimée pour ajouter des fonctionnalités.

### Arbitrage obligatoire

Lorsqu’un choix oppose une nouvelle fonctionnalité à la fiabilité d’un workflow existant, la fiabilité est prioritaire.

Lorsqu’un choix oppose une intégration supplémentaire à la qualité de l’intégration principale, la qualité de l’intégration principale est prioritaire.

Lorsqu’un choix oppose l’autonomie apparente à la contrôlabilité, la contrôlabilité est prioritaire.

---

## 3. Périmètre premium V1

La V1 premium doit se concentrer sur une promesse unique :

> Sesira surveille les devis, prépare les bonnes relances et fait remonter les réponses qui nécessitent une décision humaine.

Le parcours doit être complet :

```text
Connexion email
→ import ou réception d’un devis
→ association au client
→ échéance de relance
→ préparation ou envoi contrôlé
→ réception de la réponse
→ classification
→ À traiter si nécessaire
→ décision humaine
→ journal et résultat
```

La V1 ne doit pas être considérée comme premium tant que ce parcours n’est pas :

- démontrable en moins de 10 minutes ;
- compréhensible par un dirigeant non technique ;
- testable sur plusieurs organisations ;
- récupérable après une erreur fournisseur ;
- entièrement traçable ;
- désactivable immédiatement ;
- protégé contre les doublons et les envois indésirables.

Les autres modules peuvent exister en lecture seule, en démonstration ou derrière un flag, mais ne doivent pas diluer le niveau de finition du workflow principal.

---

## 4. Expérience premium

### 4.1 Le produit doit expliquer son comportement

Chaque action automatisée importante doit rendre visibles :

- le déclencheur ;
- la règle appliquée ;
- la source de la donnée ;
- le niveau de confiance lorsque l’IA intervient ;
- l’action prévue ou effectuée ;
- la personne responsable de la suite ;
- la possibilité d’annuler, corriger ou reprendre la main.

Une formulation comme « Sesira a traité le dossier » est insuffisante. Préférer :

> Le devis n’a reçu aucune réponse depuis 7 jours. Une relance est prête selon la règle de votre entreprise. Aucun message ne sera envoyé sans validation.

### 4.2 La qualité perçue vient des détails

Chaque écran critique doit avoir :

- un état de chargement crédible ;
- un état vide utile ;
- une erreur explicite avec prochaine action ;
- une confirmation après action ;
- une conservation du contexte après navigation ;
- une terminologie française stable ;
- une hiérarchie visuelle nette ;
- un affichage adapté aux données longues et aux écrans d’ordinateur portables.

### 4.3 Le produit doit rester calme

Le nombre d’alertes n’est pas un indicateur de valeur. Une notification qui n’appelle aucune décision est probablement du bruit.

La page « À traiter » doit privilégier :

1. les conséquences commerciales ou opérationnelles ;
2. l’urgence réelle ;
3. la clarté de la décision attendue ;
4. l’assignation ;
5. la fermeture explicite.

---

## 5. Doctrine de confiance et d’automatisation

### 5.1 La confiance se mérite par étapes

Tout client suit un parcours contrôlé :

```text
Observation
→ Shadow Mode
→ Validation par l’équipe
→ Automatisation limitée
→ Extension progressive
```

Le passage au niveau suivant exige des preuves sur les données du client, pas uniquement des tests de démonstration.

### 5.2 Matrice de risque

| Action | Niveau de risque | Mode par défaut |
|---|---|---|
| Classer un email | Faible | Automatique si confiance suffisante |
| Préparer une relance | Faible | Validation |
| Envoyer une relance commerciale standard | Modéré | Validation puis automatique sous règles |
| Répondre à une objection prix | Élevé | Humain obligatoire |
| Répondre à une plainte ou un litige | Élevé | Humain obligatoire |
| Modifier un prix, contrat ou statut financier | Critique | Humain obligatoire, double contrôle si nécessaire |
| Supprimer ou écraser une donnée | Critique | Action explicite, confirmation et audit |

La confiance IA ne remplace jamais une règle de sécurité. Une confiance de 99 % n’autorise pas une action classée critique.

### 5.3 Kill switch

Chaque organisation doit disposer d’un arrêt immédiat des actions externes. Le Control Center doit permettre de suspendre :

- toutes les actions sortantes ;
- une automatisation ;
- une intégration ;
- un canal ;
- une organisation entière.

L’arrêt doit être visible, audité et réversible par une personne autorisée.

---

## 6. Doctrine d’architecture premium

L’architecture premium reste monolithique et modulaire au démarrage. Elle sépare clairement :

- présentation ;
- autorisation ;
- domaine métier ;
- intégrations ;
- orchestration ;
- persistance ;
- observabilité.

Les principes non négociables sont :

- toute requête métier est résolue dans le contexte de l’organisation autorisée ;
- toute action externe possède une clé d’idempotence ;
- toute tâche asynchrone possède un statut, un retry limité et une issue visible ;
- tout changement critique est auditable ;
- aucun état métier critique ne vit exclusivement dans n8n ;
- les réponses IA sont validées par schéma avant utilisation ;
- les secrets ne sont jamais exposés au navigateur ;
- une migration peut être appliquée et vérifiée de façon reproductible.

### Dette technique acceptable

La dette est acceptable pour les écrans secondaires, les intégrations futures et les fonctions non utilisées par le pilote.

Elle n’est pas acceptable pour :

- l’isolation multi-tenant ;
- les permissions ;
- la gestion des actions sortantes ;
- la journalisation ;
- la planification des relances ;
- la récupération après erreur ;
- les données utilisées pour les résultats et le ROI.

---

## 7. Sécurité, confidentialité et posture européenne

La sécurité doit être présentable à un prospect B2B avant même une certification formelle.

Le produit doit disposer d’un dossier interne contenant :

- cartographie des données ;
- fournisseurs et sous-traitants ;
- flux d’intégration ;
- règles de rétention ;
- procédure de suppression et d’export ;
- procédure de réponse à incident ;
- matrice des rôles et accès ;
- journal des changements sensibles ;
- séparation développement, préproduction et production.

La communication commerciale doit rester exacte : les contrôles techniques ne doivent pas être présentés comme une garantie juridique ou une certification inexistante.

Avant chaque pilote, vérifier explicitement :

- quelles données entrent dans Sesira ;
- quelles données peuvent être envoyées à un fournisseur IA ;
- combien de temps elles sont conservées ;
- qui peut les consulter ;
- comment le client les récupère ou les supprime ;
- comment les actions externes sont désactivées.

---

## 8. Qualité et critères de sortie

Une version est prête pour un pilote seulement si elle passe les gates suivants.

### Gate produit

- le bénéfice principal est compris en moins d’une minute ;
- le premier écran montre une prochaine action utile ;
- aucune fonctionnalité critique ne finit sur un écran muet ;
- le français est relu et cohérent ;
- les états d’erreur et d’absence de données sont utiles.

### Gate technique

- deux organisations de test sont isolées par RLS ;
- les scénarios critiques sont automatisés dans les tests ;
- les webhooks et emails dupliqués ne produisent pas de doublon ;
- les retries et erreurs permanentes sont distingués ;
- les runs, incidents et actions sont inspectables ;
- les logs ne contiennent pas de secrets inutiles.

### Gate opérationnel

- un opérateur peut comprendre un incident sans lire le code ;
- un client peut être mis en pause sans déploiement ;
- un workflow peut être repris manuellement ;
- chaque pilote a un objectif et une date de revue ;
- un responsable est assigné à chaque exception ouverte.

### Gate commercial

- le pilote mesure un résultat observable ;
- les estimations sont séparées des faits ;
- aucun chiffre de revenu n’est présenté sans preuve ;
- le client sait ce qui est inclus, surveillé et hors périmètre ;
- le prix est défendable par la valeur du workflow, pas par la quantité de fonctionnalités.

---

## 9. Déploiement et exploitation

Le lancement doit se faire par cohortes réduites :

```text
organisation interne
→ organisation pilote 1
→ organisation pilote 2
→ 3–5 clients proches du profil idéal
→ extension progressive
```

Chaque déploiement suit une checklist :

1. configuration de l’organisation ;
2. rôles et responsables ;
3. connexion des intégrations ;
4. vérification des données importées ;
5. activation Shadow Mode ;
6. revue des actions prévues ;
7. passage en validation ;
8. mesure à 7, 14 et 30 jours ;
9. revue des incidents et faux positifs ;
10. décision d’extension ou de correction.

Le support premium doit être traité comme un produit : historique des demandes, niveau de gravité, délai de réponse, responsable, résolution et apprentissage réinjecté dans le système.

---

## 10. Mesure de la valeur

Le reporting premium sépare toujours :

### Observé

- nombre de devis surveillés ;
- relances réellement envoyées ;
- réponses reçues ;
- objections détectées ;
- actions validées ou refusées ;
- temps de traitement mesuré lorsqu’il est disponible.

### Estimé

- temps récupéré ;
- opportunités réactivées ;
- valeur commerciale potentielle ;
- coût évité.

### Inconnu

- valeur influencée sans attribution fiable ;
- revenu futur ;
- gain causal non vérifié.

Le produit doit préférer « 9 devis ont reçu une réponse après relance » à « Sesira a généré 12 000 € » lorsque le lien causal n’est pas démontré.

---

## 11. Cadence de pilotage

Pendant la construction et les premiers pilotes :

- revue produit hebdomadaire ;
- revue incidents et erreurs hebdomadaire ;
- revue des coûts IA et fournisseurs toutes les deux semaines ;
- revue valeur client à J+7, J+14 et J+30 ;
- revue de périmètre à chaque jalon ;
- décision explicite de continuer, corriger, réduire ou arrêter une initiative.

Chaque fonctionnalité doit avoir :

- un propriétaire ;
- un problème client identifié ;
- une métrique de succès ;
- un niveau de risque ;
- un plan de désactivation ;
- une date de réévaluation.

---

## 12. Règles finales de la doctrine premium

1. La fiabilité du suivi des devis passe avant l’étendue de la plateforme.
2. La clarté du produit passe avant la sophistication technique visible.
3. La preuve passe avant la promesse.
4. La réversibilité passe avant l’autonomie.
5. La donnée observée passe avant l’estimation.
6. La sécurité multi-tenant passe avant la vitesse de démonstration.
7. L’onboarding et l’exploitation font partie du produit.
8. Chaque exception doit avoir une explication et un responsable.
9. Toute action externe doit pouvoir être retrouvée, arrêtée et expliquée.
10. À budget premium, on achète de la confiance, pas seulement du code.

