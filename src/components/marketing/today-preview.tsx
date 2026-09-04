"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const TODAY_ITEMS = [
  {
    kind: "DEVIS",
    title: "18 450 € · Sophie Lefèvre",
    detail: "Envoyé il y a 6 jours. Aucune relance faite.",
    action: "Relancer",
  },
  {
    kind: "CHANTIER",
    title: "Dupont SARL",
    detail: "Le client a signé. Aucune date au planning.",
    action: "Planifier",
  },
  {
    kind: "RAPPORT TERRAIN",
    title: "Intervention #1842",
    detail: "Le technicien a terminé. Rapport à valider.",
    action: "Valider",
  },
  {
    kind: "FACTURE",
    title: "12 400 €",
    detail: "Paiement annoncé vendredi. Rien reçu depuis.",
    action: "Réclamer",
  },
  {
    kind: "ENTRETIEN",
    title: "Martin & Fils",
    detail: "Renouvellement dans 26 jours.",
    action: "Préparer",
  },
] as const;

type PanelLine = {
  value: string;
  label?: string;
  strong?: boolean;
};

type ExamplePanel = {
  label: string;
  title: string;
  lines: readonly PanelLine[];
  actions: readonly string[];
  boundary: string;
};

const PANELS: readonly ExamplePanel[] = [
  {
    label: "DEVIS",
    title: "Relance préparée",
    lines: [
      { label: "Objet", value: "Votre devis pompe à chaleur air/eau — 18 450 €" },
      { value: "Bonjour Madame Lefèvre," },
      { value: "Je reviens vers vous concernant le devis envoyé le 29 août. Souhaitez-vous qu'on en reparle cette semaine ?" },
    ],
    actions: ["Envoyer", "Modifier"],
    boundary: "SESIRA a écrit le message. Rien ne part tant que vous n'avez pas cliqué.",
  },
  {
    label: "CHANTIER",
    title: "Créneau proposé",
    lines: [
      { value: "Mardi 9 septembre · 08:00 – 12:00", strong: true },
      { value: "Karim D. — disponible, secteur nord" },
      { value: "Remplacement groupe froid · Dupont SARL, Meaux" },
      { value: "Devis signé le 2 septembre · 22 400 €" },
    ],
    actions: ["Planifier", "Choisir un autre créneau"],
    boundary: "SESIRA propose un créneau à partir du planning. Vous choisissez.",
  },
  {
    label: "RAPPORT TERRAIN",
    title: "Rapport à valider",
    lines: [
      { value: "Intervention #1842 · Boulangerie Rivet, Chelles", strong: true },
      { value: "Chambre froide positive — remplacement du pressostat" },
      { value: "Fluide R-449A · aucun ajout, aucune récupération" },
      { value: "Contrôle d'étanchéité : aucune fuite relevée" },
      { value: "3 photos · Karim D. · 3 septembre, 14:20" },
    ],
    actions: ["Valider et envoyer au client", "Demander une correction"],
    boundary: "Le rapport part au client une fois validé. Pas avant.",
  },
  {
    label: "FACTURE",
    title: "Relance de paiement préparée",
    lines: [
      { value: "Facture F-2026-0418 · 12 400 € — échue depuis 11 jours", strong: true },
      { value: "Le client avait annoncé un règlement pour le vendredi 29 août." },
      { label: "Objet", value: "Facture F-2026-0418 — 12 400 €" },
      { value: "Bonjour, sauf erreur de notre part, le règlement annoncé pour le 29 août ne nous est pas parvenu. Pouvez-vous nous dire où il en est ?" },
    ],
    actions: ["Envoyer", "Modifier", "Marquer en litige"],
    boundary: "Un litige ne se traite jamais tout seul. SESIRA vous le signale, vous décidez.",
  },
  {
    label: "ENTRETIEN",
    title: "Renouvellement préparé",
    lines: [
      { value: "Contrat d'entretien · Martin & Fils — échéance 30 septembre", strong: true },
      { value: "2 visites par an · 3 équipements suivis" },
      { value: "Reconduction aux conditions actuelles : 1 840 € par an" },
    ],
    actions: ["Envoyer la proposition", "Modifier le montant"],
    boundary: "Le montant vient du contrat en cours. SESIRA ne change jamais un prix.",
  },
];

type TodayPreviewProps = {
  compact?: boolean;
};

export function TodayPreview({ compact = false }: TodayPreviewProps) {
  const [interactive, setInteractive] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    setInteractive(true);
  }, []);

  const closePanel = useCallback(() => {
    const originIndex = activeIndex;
    setActiveIndex(null);
    window.requestAnimationFrame(() => {
      if (originIndex !== null) triggerRefs.current[originIndex]?.focus();
    });
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>("[data-dialog-focus]");
    firstFocusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => !element.hasAttribute("aria-hidden"));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex, closePanel]);

  function openPanel(index: number) {
    setActiveIndex(index);
  }

  function onHandlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragStartY.current = event.clientY;
  }

  function onHandlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    if (event.clientY - dragStartY.current > 72) closePanel();
    dragStartY.current = null;
  }

  const activePanel = activeIndex === null ? null : PANELS[activeIndex];

  return (
    <>
      <div
        className={compact ? "cvc-today-preview compact" : "cvc-today-preview"}
        aria-label="Exemple de SESIRA Aujourd'hui"
      >
        <div className="cvc-product-chrome">
          <div><i /><i /><i /></div>
          <span>SESIRA · AUJOURD&apos;HUI</span>
          <b>EXEMPLE · DONNÉES FICTIVES</b>
        </div>
        <div className="cvc-product-body">
          <div className="cvc-product-heading">
            <div>
              <span>VENDREDI 4 SEPTEMBRE</span>
              <h3>5 choses à traiter</h3>
            </div>
            <div className="cvc-product-count"><strong>5</strong><span>à voir</span></div>
          </div>
          <div className="cvc-today-list">
            {TODAY_ITEMS.map((item, index) => {
              if (!compact && interactive) {
                return (
                  <article key={`${item.kind}-${item.title}`} className="cvc-today-interactive-row">
                    <button
                      ref={(node) => { triggerRefs.current[index] = node; }}
                      type="button"
                      className="cvc-today-row-trigger"
                      onClick={() => openPanel(index)}
                      aria-haspopup="dialog"
                    >
                      <TodayRow item={item} />
                    </button>
                  </article>
                );
              }

              return (
                <article key={`${item.kind}-${item.title}`}>
                  <TodayRow item={item} />
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {activePanel ? (
        <div
          className="cvc-example-overlay"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closePanel();
          }}
        >
          <div
            ref={dialogRef}
            className="cvc-example-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cvc-example-title-${activeIndex}`}
          >
            <div
              className="cvc-example-drag-handle"
              aria-hidden="true"
              onPointerDown={onHandlePointerDown}
              onPointerUp={onHandlePointerUp}
            ><i /></div>
            <header className="cvc-example-header">
              <div>
                <span>{activePanel.label}</span>
                <small>exemple</small>
              </div>
              <button
                type="button"
                className="cvc-example-close"
                onClick={closePanel}
                aria-label="Fermer l'exemple"
                data-dialog-focus
              >×</button>
            </header>

            <div className="cvc-example-content">
              <h3 id={`cvc-example-title-${activeIndex}`}>{activePanel.title}</h3>
              <div className="cvc-example-lines">
                {activePanel.lines.map((line, lineIndex) => (
                  <p key={`${line.value}-${lineIndex}`} className={line.strong ? "strong" : undefined}>
                    {line.label ? <><b>{line.label} :</b> </> : null}{line.value}
                  </p>
                ))}
              </div>

              <div className="cvc-example-fake-actions" aria-hidden="true">
                {activePanel.actions.map((action) => <span key={action}>{action}</span>)}
              </div>

              <p className="cvc-example-boundary">{activePanel.boundary}</p>
            </div>

            <Link className="cvc-example-cta" href="/diagnostic">
              Voir ce que ça donnerait chez moi <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TodayRow({ item }: { item: (typeof TODAY_ITEMS)[number] }) {
  return (
    <>
      <div className="cvc-today-copy">
        <span>{item.kind}</span>
        <strong>{item.title}</strong>
        <p>{item.detail}</p>
      </div>
      <b className="cvc-today-action-label">{item.action}</b>
    </>
  );
}
