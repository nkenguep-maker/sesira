export type DemoStoryStep = {
  tool: string;
  label: string;
  detail: string;
  href: string;
};

export type DemoStory = {
  id: string;
  title: string;
  customer: string;
  amount?: string;
  problem: string;
  trigger: string;
  prepared: string;
  boundary: string;
  threadKey?: string;
  decisionLabel: string;
  steps: DemoStoryStep[];
};

export const DEMO_STORIES: DemoStory[] = [
  {
    id: "lefevre",
    title: "Un devis dort depuis 7 jours",
    customer: "Sophie Lefèvre",
    amount: "18 450 €",
    problem: "Le devis DV-2026-0421 a été envoyé le 29 août. Aucune réponse n’a été enregistrée.",
    trigger: "L’échéance de relance arrive et le dossier est toujours sans réponse.",
    prepared: "SESIRA vérifie le dossier, prépare une relance contextualisée et la place dans Relances.",
    boundary: "Le message attend Marc. Rien ne part tant qu’il ne l’a pas validé.",
    threadKey: "demo:lefevre:quote-followup",
    decisionLabel: "Simuler la validation",
    steps: [
      { tool: "Devis", label: "Devis envoyé", detail: "DV-2026-0421 · 18 450 € · envoyé le 29 août", href: "/demo/devis" },
      { tool: "Automatisations", label: "Silence détecté", detail: "7 jours sans réponse enregistrée", href: "/demo/automatisations" },
      { tool: "Relances", label: "E-mail préparé", detail: "Objet et corps proposés à Marc", href: "/demo/relances" },
      { tool: "Aujourd’hui", label: "Décision humaine", detail: "La relance remonte dans la file à traiter", href: "/demo" },
    ],
  },
  {
    id: "valmy",
    title: "Le client demande de revoir le délai",
    customer: "Clinique Valmy",
    amount: "36 200 €",
    problem: "Une réponse arrive sur le devis d’optimisation eau glacée : le client veut revoir le délai d’installation.",
    trigger: "SESIRA reconnaît une demande qui change potentiellement l’engagement commercial.",
    prepared: "La réponse est classée, attachée au dossier et l’automatisation est arrêtée.",
    boundary: "SESIRA ne négocie pas le délai. Le dossier revient à Marc pour décision.",
    threadKey: "demo:valmy:reply",
    decisionLabel: "Simuler l’ouverture de la décision",
    steps: [
      { tool: "Devis", label: "Dossier en cours", detail: "DV-2026-0407 · 36 200 €", href: "/demo/devis" },
      { tool: "Relances", label: "Réponse reçue", detail: "« Pouvez-vous revoir le délai d’installation ? »", href: "/demo/relances" },
      { tool: "Automatisations", label: "Arrêt automatique", detail: "Le sujet demande une décision humaine", href: "/demo/automatisations" },
      { tool: "Aujourd’hui", label: "À décider", detail: "Le dossier remonte comme priorité commerciale", href: "/demo" },
    ],
  },
  {
    id: "dupont",
    title: "Le devis est gagné, mais aucun chantier n’est planifié",
    customer: "Dupont SARL",
    amount: "22 400 €",
    problem: "Le remplacement du groupe froid est vendu. Aucun créneau n’est encore confirmé.",
    trigger: "Le devis passe à Gagné alors qu’aucune intervention n’est planifiée.",
    prepared: "SESIRA crée le sujet planning et propose un prochain geste opérationnel.",
    boundary: "Le créneau et le technicien restent un choix humain.",
    decisionLabel: "Simuler le choix du créneau",
    steps: [
      { tool: "Devis", label: "Gagné", detail: "DV-2026-0412 · 22 400 €", href: "/demo/devis" },
      { tool: "Automatisations", label: "Écart détecté", detail: "Vendu sans intervention planifiée", href: "/demo/automatisations" },
      { tool: "Aujourd’hui", label: "À planifier", detail: "Karim D. est suggéré dans le scénario", href: "/demo" },
      { tool: "Interventions", label: "Créneau confirmé", detail: "Le chantier rejoint ensuite le planning terrain", href: "/demo/interventions" },
    ],
  },
  {
    id: "garage",
    title: "Une promesse de paiement est dépassée",
    customer: "Garage Montreuil",
    amount: "12 400 €",
    problem: "La facture F-2026-0418 est échue et le règlement annoncé pour le 3 septembre n’est pas enregistré.",
    trigger: "La date de promesse de paiement est dépassée.",
    prepared: "SESIRA prépare une relance qui rappelle uniquement les faits du dossier.",
    boundary: "Un litige ou une contestation arrête la relance et exige une décision humaine.",
    threadKey: "demo:garage:invoice-reminder",
    decisionLabel: "Simuler la validation",
    steps: [
      { tool: "Factures", label: "Promesse dépassée", detail: "F-2026-0418 · 12 400 €", href: "/demo/factures" },
      { tool: "Automatisations", label: "Échéance détectée", detail: "La promesse n’est pas marquée payée", href: "/demo/automatisations" },
      { tool: "Relances", label: "Message préparé", detail: "Relance factuelle, sans menace automatique", href: "/demo/relances" },
      { tool: "Factures", label: "Suivi mis à jour", detail: "Le prochain état dépend du retour client", href: "/demo/factures" },
    ],
  },
  {
    id: "rivet",
    title: "Le technicien termine, le bureau récupère un rapport exploitable",
    customer: "Boulangerie Rivet",
    problem: "Karim D. a terminé l’intervention #1842 avec observations et 3 photos fictives.",
    trigger: "Le rapport terrain passe en état relu.",
    prepared: "SESIRA rassemble les données terrain et prépare le message de compte rendu client.",
    boundary: "Le rapport client doit être validé avant envoi.",
    threadKey: "demo:rivet:field-report",
    decisionLabel: "Simuler la validation du rapport",
    steps: [
      { tool: "Interventions", label: "Intervention terminée", detail: "Pressostat remplacé · chambre froide positive", href: "/demo/interventions" },
      { tool: "Documents", label: "Rapport assemblé", detail: "Observations + 3 photos fictives", href: "/demo/documents" },
      { tool: "Aujourd’hui", label: "Validation attendue", detail: "Le bureau vérifie le compte rendu", href: "/demo" },
      { tool: "Relances", label: "E-mail client préparé", detail: "Le compte rendu est prêt, pas envoyé", href: "/demo/relances" },
    ],
  },
  {
    id: "martin",
    title: "Un contrat arrive à échéance",
    customer: "Martin & Fils",
    amount: "1 840 €/an",
    problem: "Le contrat CE-2026-0019 arrive à échéance le 30 septembre.",
    trigger: "Le contrat entre dans la fenêtre de renouvellement.",
    prepared: "SESIRA reprend les conditions actuelles et prépare une proposition de renouvellement.",
    boundary: "SESIRA ne change jamais le prix de son propre chef.",
    threadKey: "demo:martin:renewal",
    decisionLabel: "Simuler la validation",
    steps: [
      { tool: "Maintenance", label: "Échéance proche", detail: "2 visites/an · 3 équipements", href: "/demo/maintenance" },
      { tool: "Automatisations", label: "Fenêtre détectée", detail: "Préparer le renouvellement", href: "/demo/automatisations" },
      { tool: "Relances", label: "Proposition préparée", detail: "1 840 €/an, conditions actuelles", href: "/demo/relances" },
      { tool: "Aujourd’hui", label: "Validation humaine", detail: "Marc choisit d’envoyer ou de modifier", href: "/demo" },
    ],
  },
];
