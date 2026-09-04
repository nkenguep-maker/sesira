# REGULATORY.md — Cadre réglementaire SESIRA

> **Statut :** référence opérationnelle pour les milestones C33, C34, C35, C37 et les invariants transverses.
> **Format :** conforme à la section 19 du driver — chaque entrée porte *source · date de vérification · hypothèse retenue · frontière configurable*.
> **Règle :** Claude Code code contre ce document, pas contre sa mémoire. Toute règle datée est une **donnée de référence** (table avec `effective_from` / `effective_to`), jamais un `if` dans le code.
> **Avertissement :** rédigé à partir de sources publiques vérifiées le 2026-09-04. Ce n'est pas un avis juridique. Les points marqués `⚖ AVOCAT` doivent être validés par un conseil avant le premier client payant.

---

## 0. Invariants transverses (s'appliquent à tous les milestones)

| ID | Invariant | Pourquoi | Test attendu |
|---|---|---|---|
| INV-01 | **SESIRA ne déclare jamais la conformité.** Aucune surface, aucun événement, aucun export ne produit un verdict « conforme » / « non conforme ». SESIRA calcule une échéance et signale une *absence de donnée*. | Défense contentieuse + doctrine produit | Grep interdit : `conforme`, `compliant`, `non conforme` dans les libellés d'`attention_items` et des exports ; test de wording. |
| INV-02 | **Chaque alerte réglementaire est horodatée deux fois** : `created_at` et `seen_at` (première ouverture par un humain). | Preuve en cas de litige « le logiciel ne m'a pas prévenu » | Test : ouverture d'un attention_item réglementaire ⇒ `seen_at` posé, immuable, audité. |
| INV-03 | **Toute valeur de référence réglementaire utilisée dans un calcul est stockée avec le calcul** (id de version de la règle, GWP, grille, date). Jamais recalculée rétroactivement. | Une révision future ne doit pas réécrire l'historique | Test : modifier une règle de référence ne change aucune échéance déjà calculée. |
| INV-04 | **Aucune action externe réglementaire sans validation humaine tracée** (dépôt, envoi, transmission). Automatic mode exclu pour ces actions. | Sect. 2 & 7 du driver | Test offensif : tentative d'envoi en mode automatic ⇒ refus + incident. |
| INV-05 | **SESIRA ne touche jamais aux fonds.** Pas d'encaissement, pas d'initiation de paiement, pas de détention. | Hors PSD2 / agrément ACPR | Revue de schéma : aucune table de solde, d'IBAN de tiers ou de paiement. |
| INV-06 | **SESIRA ne score jamais une personne physique** (solvabilité, éligibilité, émotion, fiabilité). | AI Act annexe III (haut risque) | Grep interdit dans `ai_runs` : `score`, `eligib`, `sentiment`, `emotion` sur des entités personne. |
| INV-07 | **L'export complet des données du client est gratuit, en format ouvert, dans tous les paliers.** | Data Act art. 23-31 (en vigueur depuis 2025-09-12) | Test : export org complet ⇒ JSON + CSV, sans dépendre du palier ni de l'état d'abonnement. |

---

## 1. C33 — F-Gas, CERFA, bilan annuel

### 1.1 Textes de référence

| Objet | Source | Vérifié le | Hypothèse retenue |
|---|---|---|---|
| Règlement F-Gas III | [Règlement (UE) 2024/573](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202400573) — publié 2024-02-20, applicable 2024-03-11, remplace 517/2014 | 2026-09-04 | Texte en vigueur. Art. 5 = contrôles d'étanchéité. |
| Fiche d'intervention | [AFF — CERFA 15497\*04](https://www.aff-froid.fr/actualites/entree-en-vigueur-du-cerfa-15497-04) — arrêté du 2024-05-29, obligatoire depuis **2024-07-06** | 2026-09-04 | **Une fiche par intervention.** Version \*04 intègre les HFO aux côtés des CFC/HCFC/HFC. |
| Bilan annuel opérateurs | [DEKRA — mode opératoire](https://www.dekra-certification.fr/faq/quel-est-le-mode-operatoire-pour-effectuer-la-declaration-des-bilans-de-fluides-frigorigenes.html) · [SYDEREP FAQ](https://syderepv1.ademe.fr/fr/faq/gf/0/index/question/categorie/1/question/3) | 2026-09-04 | Les **opérateurs** déposent leur bilan auprès de **leur organisme agréé** (DEKRA, Cemafroid, Socotec, Bureau Veritas…) du 1er au 31 janvier. SYDEREP est le canal des **producteurs / distributeurs** (jusqu'au 31 mars). |
| Attestations | [SYNASAV — nouveau cadre](https://synasav.fr/actualites-synasav/detail/fluides-frigorigenes-un-nouveau-cadre-pour-les-attestations-de-capacite-et-d-aptitude) · [Arrêté du 2025-11-21](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053004604) | 2026-09-04 | Décrets en vigueur 2025-12-07 (capacité) et 2025-12-11 (aptitude). **Anciennes attestations valables jusqu'au 2026-12-31.** Catégories **A1, A2, B, C, D, E** remplacent I–IV. Périmètre étendu aux fluides non fluorés (CO₂, NH₃, HC). Recyclage avant **2029-03-12**. Aptitude : 7 ans. Capacité : 5 ans. |
| Liste des opérateurs attestés | [ADEME REP-GF](https://www.data.gouv.fr/datasets/rep-gf-liste-des-operateurs-attestes-1) — Licence Ouverte 2.0, CSV, rafraîchi tous les 15 jours | 2026-09-04 | Réutilisable pour valider l'attestation d'un client et pour la prospection. |

### 1.2 Grille des contrôles d'étanchéité (art. 5, 2024/573) — **table `leak_check_rules`, pas du code**

| Gaz annexe I (tCO₂eq) | Gaz annexe II §1 (kg) | Fréquence de base | Avec système de détection de fuite |
|---|---|---|---|
| ≥ 5 et < 50 | ≥ 1 et < 10 | 12 mois | 24 mois |
| ≥ 50 et < 500 | ≥ 10 et < 100 | 6 mois | 12 mois |
| ≥ 500 | ≥ 100 | 3 mois | 6 mois |

Modificateurs à modéliser comme colonnes de la table :

- `hermetic` : exempt si < **10** tCO₂eq (annexe I) ou < **2** kg (annexe II) ; < **3** kg en bâtiment résidentiel si étiqueté hermétiquement scellé.
- `leak_detection_system` : double chaque intervalle ; **obligatoire** ≥ 500 tCO₂eq.
- `mobile_equipment` : art. 5(3) b et c non applicables avant **2027-03-12** → `effective_from`.
- Double seuil : un équipement est soumis si **l'un ou l'autre** des seuils est atteint. Un modèle « tCO₂eq seulement » rate tout le parc HFO.

### 1.3 GWP — **table `gwp_values`, versionnée**

- Le règlement utilise **AR4 pour les HFC** (annexe I) et **AR6 pour les autres gaz fluorés**. Un GWP AR6 appliqué au R-410A donne un tCO₂eq faux, donc une fréquence légale fausse.
- Colonnes : `substance`, `gwp`, `assessment_report` (AR4/AR5/AR6), `source_url`, `effective_from`, `effective_to`.
- Le calcul `charge_kg × gwp / 1000` stocke l'`gwp_value_id` utilisé (INV-03).

### 1.4 Interdictions de mise sur le marché — **table `market_bans`**

Grille dense et par classe d'équipement (source : [ABC Clim](https://www.abcclim.net/reglementation-des-gaz.html), à recouper avec l'annexe IV du règlement avant usage en production). Dates connues : 2025 (monoblocs PRP ≥ 150), 2027 (> 12 kW R-410A ; chillers PRP ≥ 750), 2029 (≤ 12 kW), 2030 (HFC PRP ≥ 150 tous systèmes), 2032, 2033, 2035. **Jamais de `if year >= 2027` dans le code.**

### 1.5 Frontières

- SESIRA **produit** la fiche d'intervention (données CERFA 15497\*04) et l'**export du bilan annuel** ; le client **dépose** auprès de son organisme agréé. Aucun portail d'organisme agréé n'expose d'API publique connue → export fichier, pas de transmission.
- **Interdiction de wording :** ne jamais écrire « SESIRA déclare pour vous » — ni dans l'interface, ni dans un contrat, ni dans un export. Libellé produit : « Préparer le bilan », « Produire l'export », « Exporter le dossier », jamais « Déclarer ».
- Catégories d'attestation = **données de référence datées** (I–IV `effective_to = 2026-12-31`, A1–E `effective_from = 2025-12-07`). Pas un enum applicatif.
- Alerte d'attestation expirant : Attention, jamais blocage d'assignation (sect. 2 du driver : surface l'exception, l'humain décide).
- `⚖ AVOCAT` : déclaration de rejet/fuite en DREAL — sources secondaires contradictoires, non modélisé tant que non confirmé sur Légifrance.

---

## 2. C34 — Facturation électronique

### 2.1 Textes de référence

| Objet | Source | Vérifié le | Hypothèse retenue |
|---|---|---|---|
| Calendrier | [Pennylane — dates officielles](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/facturation-electronique-dates-cles-et-calendrier) · [impots.gouv — guide de démarrage](https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/guide_pratique_facturation_electronique.pdf) | 2026-09-04 | **2026-09-01** : réception obligatoire pour toutes les entreprises assujetties à la TVA ; émission obligatoire GE/ETI. **2027-09-01** : émission obligatoire PME/TPE + e-reporting. |
| Statut de SESIRA | [Cegid — OD vs PA](https://www.cegid.com/fr/glossaire/facture-electronique-quest-ce-quun-operateur-de-dematerialisation/) · [impots.gouv — plateformes agréées](https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees) | 2026-09-04 | SESIRA est un **opérateur de dématérialisation (OD)** : aucune immatriculation requise, mais **aucune reconnaissance fiscale** — SESIRA ne peut pas transmettre lui-même. Transmission via une **plateforme agréée (PA)** partenaire (137 immatriculées). |

### 2.2 Frontières

- `provider abstraction` obligatoire (driver §18) : interface `EInvoicingProvider` + test double déterministe dès C34. **Décision produit 2026-09-04 : aucune API PA réelle au démarrage.** Aucun code ne présume que SESIRA est la PA et aucun adaptateur fournisseur concret n'est requis pour valider C34 techniquement.
- Tant qu'aucune PA réelle n'est intégrée, le provider de production reste explicitement `PRODUCTION_PROVIDER_INTEGRATION_PENDING` et les actions externes restent désactivées.
- Événements `submitted` / `accepted` / `rejected` **uniquement** sur retour d'une PA réelle (driver §7). Le test double peut simuler ces retours en test, jamais en production.
- Idempotence durable par `(organization_id, invoice_id, provider)` ; rejeu de callback = no-op tracé.
- Formats : Factur-X / UBL / CII sont décidés par la PA partenaire → paramètre de l'adaptateur, pas une constante.
- Placement tarifaire : **tous les paliers** (obligation légale). Observe : réception. Core+ : émission.
- `⚖ AVOCAT` : si la société SESIRA est établie en France, **ses propres factures** tombent sous le mandat (émission 2027-09-01 si PME).

---

## 3. C35 — Financement

### 3.1 Textes de référence

| Objet | Source | Vérifié le | Hypothèse retenue |
|---|---|---|---|
| Régime de l'indicateur | [Actu-Juridique — l'indicateur](https://www.actu-juridique.fr/affaires/bancaire-credit/un-intervenant-peu-connu-en-matiere-de-delivrance-de-credits-lindicateur/) · art. **R519-2 CMF** | 2026-09-04 | L'indicateur **peut** : signaler un établissement, transmettre les coordonnées du prospect, percevoir une commission. Pas d'inscription ORIAS. Il **ne peut pas** : conseiller, présenter plusieurs offres, analyser les besoins, **collecter ou transmettre des documents contractuels**. |
| IOBSP | [ACPR — FAQ IOBSP](https://acpr.banque-france.fr/system/files/2025-01/201703_faq_iobsp.pdf) | 2026-09-04 | Au-delà de l'indication : ORIAS, capacité professionnelle (formation 150 h ou expérience), RC pro IOBSP, devoir de conseil, restrictions de rémunération (L519-6). |
| AI Act — haut risque | [aiacto — art. 50 et annexe III](https://www.aiacto.eu/fr/blog/article-50-transparence-impacts-concrets-entreprises-cas-usage) | 2026-09-04 | L'évaluation de solvabilité de **personnes physiques** est un usage à haut risque. Les clients finaux d'un CVC sont souvent des ménages. |

### 3.2 Décision produit retenue — **Option A : Indicateur**

**Décision Paul, 2026-09-04 : SESIRA sera indicateur pour C35 V1.** L'option IOBSP est hors périmètre jusqu'à décision juridique et commerciale explicite ultérieure.

| Ce que SESIRA fait | Ce que SESIRA ne fait pas |
|---|---|
| Signale un financeur partenaire ; transmet nom/coordonnées du client final avec son accord ; suit un **statut** (`initiated`, `in_review`, `accepted`, `declined`, `abandoned`) déclaré par l'humain ; signale au client CVC quelles pièces **il** doit réunir. | Ne stocke pas, ne collecte pas, ne transmet pas les pièces du dossier. Ne compare pas d'offres. Ne calcule aucun taux ni mensualité. Ne conseille pas un financement. |

**Conséquence sur le driver :** le « required-document tracking » de C35 signifie exclusivement *checklist côté client* (ce qu'il doit avoir). Les pièces de financement **n'entrent pas** dans le module Documents (C27) et aucune API de transmission documentaire au financeur n'est construite en C35 V1.

### 3.3 Frontières

- INV-05 et INV-06 s'appliquent intégralement.
- Aucun champ `income`, `credit_score`, `debt_ratio` sur une personne physique.
- Commission d'apport : tracée en `audit_logs`, jamais conditionnée à un statut que SESIRA fixerait lui-même.

---

## 4. C37 — Voix / accueil téléphonique

### 4.1 Textes de référence

| Objet | Source | Vérifié le | Hypothèse retenue |
|---|---|---|---|
| AI Act art. 50 | [aiacto](https://www.aiacto.eu/fr/blog/article-50-transparence-impacts-concrets-entreprises-cas-usage) · [donneespersonnelles.fr](https://www.donneespersonnelles.fr/transparence-ia-article-50-ai-act) | 2026-09-04 | **En application depuis le 2026-08-02.** Informer la personne qu'elle interagit avec une IA **avant** le début de l'échange. Audio synthétique → marquage lisible par machine. Conserver la preuve (journaux). Sanction jusqu'à 7,5 M€ / 1,5 % CA. |
| Enregistrement d'appels | [Leto — enregistrement et RGPD](https://www.leto.legal/guides/enregistrement-telephonique-et-rgpd) · [CNIL — preuve de contrat](https://www.cnil.fr/fr/lenregistrement-des-conversations-telephoniques-afin-detablir-la-preuve-de-la-formation-dun-contrat) | 2026-09-04 | Information **avant** enregistrement + droit d'opposition. Conservation recommandée : **6 mois** (qualité), **1 an** (analyses dérivées), prescription (preuve de contrat). Côté employeur (le client) : information des salariés, consultation du CSE. |
| Reconnaissance des émotions | AI Act annexe III / art. 5 | 2026-09-04 | Interdite au travail ; à haut risque ailleurs. **Exclue de C37.** |

### 4.2 Frontières — **table `voice_policies` par organisation**

| Paramètre | Valeur par défaut | Configurable |
|---|---|---|
| `ai_disclosure_message` | annonce en tête d'appel, obligatoire, non désactivable | texte oui, suppression non |
| `recording_notice` | annonce + touche d'opposition | oui |
| `retention_recording_days` | 180 | oui, ≤ 180 sauf finalité « preuve de contrat » documentée |
| `retention_transcript_days` | 365 | oui |
| `opt_out_behavior` | pas d'enregistrement, transcription désactivée, prise de message humaine | oui |
| `synthetic_audio_watermark` | actif si voix synthétique | non |

- Purge automatique à échéance, tracée.
- Aucune analyse de ton, d'émotion ou de fiabilité (INV-06).
- Aucun diagnostic technique ni prix en sortie d'appel (driver C37).
- Preuve art. 50 : `audit_logs` enregistre l'annonce jouée (horodatage, version du message) pour chaque appel.
- DPA client : mention explicite « données vocales et transcriptions ».

---

## 5. Transverse — RGPD

| Objet | Source | Vérifié le | Hypothèse retenue |
|---|---|---|---|
| Rôle de SESIRA | RGPD art. 28 | 2026-09-04 | **Sous-traitant** pour le compte de chaque organisation cliente. |

Obligations minimales : DPA signé avec chaque client (annexe aux CGV) · registre des traitements · **hébergement exclusivement en Europe** pour les données et traitements SESIRA · liste des sous-traitants ultérieurs (fournisseur IA, PA, fournisseur voix) tenue à jour · procédure de violation (notification 72 h) · DPO non obligatoire à ce stade.

**Décision Paul, 2026-09-04 :** SESIRA n'hébergera les données et traitements du produit qu'en Europe. C37 ne passe pas le gate de production tant que la région effective de Supabase, Vercel et du fournisseur voix n'a pas été vérifiée et documentée comme européenne.

**DPA :** Paul produit le DPA SESIRA. Le code ne doit pas inventer de clauses contractuelles ; le gate commercial exige seulement que le DPA fourni soit référencé dans l'onboarding/contrat avant le premier client payant. Le module Documents (C27) et la voix (C37) doivent être explicitement couverts par ce DPA.

---

## 6. Transverse — Data Act

| Objet | Source | Vérifié le | Hypothèse retenue |
|---|---|---|---|
| Changement de fournisseur | [Altij — Data Act et SaaS](https://www.altij.fr/detail-actualites/detail-actualites-public/data-act-quelles-consequences-sur-vos-contrats-saas) | 2026-09-04 | En application depuis **2025-09-12**, toutes tailles. Export gratuit, format ouvert et interopérable, préavis et transition ≤ 2 mois. Frais de changement « réduits » aujourd'hui, **interdits à partir du 2027-01-12**. Nullité des clauses limitant la responsabilité pour faute intentionnelle ou faute lourde. |

Conséquence produit : INV-07. Conséquence contrat : pas de frais de sortie, clause de réversibilité explicite.

---

## 7. Transverse — Contrat, responsabilité, assurance (`⚖ AVOCAT`)

| Objet | Source | Vérifié le | Hypothèse retenue |
|---|---|---|---|
| Clause limitative | [Initial — validité des clauses](https://initial.legal/blog/clause-de-limitation-de-responsabilite-redaction-et-validite) · art. 1170 C. civ. (Faurecia) · art. L442-1 C. com. | 2026-09-04 | Valide en B2B si elle ne vide pas l'obligation essentielle, exclut dol et faute lourde, et n'est pas un déséquilibre significatif. Plafond usuel : **12 mois de redevances**, ×2 pour données/confidentialité. |

Clauses à inscrire dans les CGV :

1. Obligation de **moyens**.
2. SESIRA ne fournit ni conseil juridique, fiscal ou réglementaire ; ne garantit pas la conformité ; le client reste responsable de ses déclarations et de leur dépôt.
3. Plafond 12 mois, ×2 données ; exclusion des dommages indirects ; carve-outs dol / faute lourde / dommages corporels.
4. SLA écrit ; crédits de service = unique remède.
5. Réversibilité et export conformes au Data Act, sans frais.
6. DPA en annexe.
7. Droit français, tribunal de commerce désigné, médiation préalable.

Assurances : **RC professionnelle éditeur de logiciel** (exigée par les partenaires PA) · **cyber-assurance** · RC pro IOBSP *uniquement* si option B retenue en C35.

---

## 8. Décisions produit

### 8.1 Décisions fermées

| # | Décision | Impact code | Décidé par |
|---|---|---|---|
| D-1 | **C35 = Indicateur (Option A)** pour V1 | Pas de collecte/transmission de pièces, pas de comparaison d'offres, pas de scoring ; checklist seulement | Paul · 2026-09-04 |
| D-3 | **C34 démarre sans API PA réelle** | Construire `EInvoicingProvider`, test double et frontières provider ; laisser `PRODUCTION_PROVIDER_INTEGRATION_PENDING` jusqu'au choix d'une PA | Paul · 2026-09-04 |
| D-5 | **Hébergement SESIRA exclusivement en Europe** | Gate C37 : vérifier/documenter régions Supabase, Vercel et fournisseur voix ; aucune production voix hors Europe | Paul · 2026-09-04 |
| D-6 | **DPA produit par Paul** | Le produit référence le DPA fourni ; Claude Code ne rédige pas de clauses juridiques de substitution | Paul · 2026-09-04 |

### 8.2 Décisions encore ouvertes

| # | Décision | Impact code | Qui |
|---|---|---|---|
| D-2 | Pays d'établissement de la société (DE ou FR) | Mandat e-facture sur les propres factures ; fiscalité/contrats partenaires | Paul |
| D-4 | Déclaration DREAL des rejets — confirmer sur Légifrance | Ajout éventuel d'un objet en C33 | Claude Code (recherche) |
| D-7 | Choix futur d'une PA partenaire avec API | Adaptateur production C34 ; **non bloquant pour la maturité technique C34** | Paul |

---

## 9. Journal des vérifications

| Date | Périmètre | Par |
|---|---|---|
| 2026-09-04 | Création — F-Gas, CERFA, attestations, e-facture, indicateur/IOBSP, AI Act art. 50, CNIL appels, Data Act, clauses B2B | Cowork |
| 2026-09-04 | Décisions Paul figées — C35 Indicateur, C34 abstraction sans API initiale, C33 export/client dépose, C37 Europe-only, DPA produit par Paul | Paul + ChatGPT |

Toute mise à jour d'une entrée ajoute une ligne ici et met à jour la colonne *Vérifié le* de l'entrée concernée.
