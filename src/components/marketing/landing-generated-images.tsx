"use client";

import { useEffect } from "react";

type PhotoMatch = { match: string; image: string; position?: string };
type GraphicMatch = { match: string; label: string; tone: "teal" | "warm" | "ink" | "soft" };
type ServiceSignal = {
  match: string;
  label: string;
  icon: string;
  metric: string;
  unit: string;
  note: string;
  tone: "teal" | "warm" | "ink" | "soft";
};

// Keep photography scarce and intentional. Each generated photo is used once.
const PHOTO_MAP: PhotoMatch[] = [
  { match: "Dirigeant et technicien CVC devant une installation", image: "team", position: "center" },
  { match: "Équipe CVC au travail, photo large", image: "planning", position: "center" },
  { match: "Portrait client / dirigeant CVC", image: "client", position: "center" },
  { match: "Visuel éditorial / dirigeant CVC", image: "editorial", position: "center" },
  { match: "Visuel éditorial / finance PME", image: "finance", position: "center" },
];

// The four service cards get product-like signals instead of photography.
const SERVICE_SIGNAL_MAP: ServiceSignal[] = [
  {
    match: "Photo dirigeant CVC / devis client",
    label: "DEVIS",
    icon: "D",
    metric: "7",
    unit: "devis à suivre",
    note: "2 sans réponse depuis plus de 7 jours",
    tone: "warm",
  },
  {
    match: "Photo technicien CVC sur site",
    label: "INTERVENTIONS",
    icon: "T",
    metric: "5",
    unit: "interventions aujourd’hui",
    note: "1 rapport attend encore une validation",
    tone: "teal",
  },
  {
    match: "Photo bureau / suivi facturation",
    label: "FACTURES",
    icon: "€",
    metric: "21,8 k€",
    unit: "échus",
    note: "2 échéances demandent une décision",
    tone: "ink",
  },
  {
    match: "Photo installation CVC / maintenance",
    label: "MAINTENANCE",
    icon: "M",
    metric: "3",
    unit: "échéances < 60 j",
    note: "contrats et dossiers à préparer",
    tone: "soft",
  },
];

// Repeated photo slots become simple SESIRA editorial surfaces instead of reusing the same people everywhere.
const GRAPHIC_MAP: GraphicMatch[] = [
  { match: "Technicien CVC en intervention", label: "TERRAIN", tone: "teal" },
  { match: "Dirigeant PME CVC au bureau", label: "DÉCISION", tone: "ink" },
  { match: "Installation technique", label: "OBLIGATIONS", tone: "soft" },
  { match: "Photo commerciale / client CVC", label: "DEVIS", tone: "warm" },
  { match: "Photo chantier / équipe terrain", label: "TERRAIN", tone: "teal" },
  { match: "Photo administratif / trésorerie", label: "TRÉSORERIE", tone: "ink" },
  { match: "Photo maintenance préventive CVC", label: "ENTRETIEN", tone: "soft" },
  { match: "Visuel éditorial / planning terrain", label: "MÉTHODE", tone: "teal" },
];

function renderServiceSignal(node: HTMLElement, signal: ServiceSignal) {
  const content = node.firstElementChild as HTMLElement | null;
  if (content) content.style.display = "none";

  node.dataset.serviceSignal = signal.tone;
  node.style.backgroundImage = "none";
  node.style.borderStyle = "solid";
  node.setAttribute(
    "aria-label",
    `${signal.label} — ${signal.metric} ${signal.unit}. ${signal.note}. Exemple avec données fictives.`,
  );

  const frame = document.createElement("div");
  frame.className = "landing-service-signal";

  const top = document.createElement("div");
  top.className = "landing-service-signal__top";

  const icon = document.createElement("span");
  icon.className = "landing-service-signal__icon";
  icon.textContent = signal.icon;

  const demo = document.createElement("span");
  demo.className = "landing-service-signal__demo";
  demo.textContent = "DONNÉES FICTIVES";

  top.append(icon, demo);

  const main = document.createElement("div");
  main.className = "landing-service-signal__main";

  const metric = document.createElement("strong");
  metric.textContent = signal.metric;

  const unit = document.createElement("span");
  unit.textContent = signal.unit;

  main.append(metric, unit);

  const footer = document.createElement("div");
  footer.className = "landing-service-signal__footer";

  const note = document.createElement("span");
  note.textContent = signal.note;

  const bars = document.createElement("div");
  bars.className = "landing-service-signal__bars";
  bars.setAttribute("aria-hidden", "true");
  bars.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));

  footer.append(note, bars);
  frame.append(top, main, footer);
  node.append(frame);
}

export function LandingGeneratedImages() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[role="img"][aria-label]'));

    for (const node of nodes) {
      const label = node.getAttribute("aria-label") ?? "";
      const photo = PHOTO_MAP.find((item) => label.includes(item.match));
      const signal = SERVICE_SIGNAL_MAP.find((item) => label.includes(item.match));
      const graphic = GRAPHIC_MAP.find((item) => label.includes(item.match));
      const content = node.firstElementChild as HTMLElement | null;

      if (photo) {
        node.dataset.landingPhoto = "true";
        node.style.backgroundImage = `url(/api/landing-image/${photo.image})`;
        node.style.backgroundSize = "cover";
        node.style.backgroundPosition = photo.position ?? "center";
        node.style.backgroundRepeat = "no-repeat";
        node.style.borderStyle = "solid";
        if (content) content.style.display = "none";
        continue;
      }

      if (signal) {
        renderServiceSignal(node, signal);
        continue;
      }

      if (graphic) {
        node.dataset.landingGraphic = graphic.tone;
        node.dataset.graphicLabel = graphic.label;
        node.style.borderStyle = "solid";
        if (content) content.style.display = "none";
      }
    }
  }, []);

  return (
    <style>{`
      [data-landing-photo="true"]::after { display: none !important; }
      [data-landing-photo="true"] { border-color: rgba(17,45,49,.10) !important; }

      [data-service-signal] {
        position: relative;
        isolation: isolate;
        display: block !important;
        padding: 0 !important;
        border-color: rgba(17,45,49,.08) !important;
      }
      [data-service-signal]::after {
        content: "" !important;
        position: absolute !important;
        width: 160px !important;
        height: 160px !important;
        right: -42px !important;
        top: -58px !important;
        border-radius: 50% !important;
        opacity: .8;
      }
      .landing-service-signal {
        position: relative;
        z-index: 2;
        min-height: 220px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 20px 20px 18px;
      }
      .landing-service-signal__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .landing-service-signal__icon {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 1px solid currentColor;
        border-radius: 10px;
        font-weight: 850;
        font-size: 13px;
        opacity: .92;
      }
      .landing-service-signal__demo {
        font: 800 7px/1.2 var(--font-jetbrains), monospace;
        letter-spacing: .12em;
        opacity: .56;
      }
      .landing-service-signal__main {
        display: grid;
        gap: 3px;
        margin-top: 16px;
      }
      .landing-service-signal__main strong {
        font-size: clamp(30px, 2.2vw, 38px);
        line-height: 1;
        letter-spacing: -.045em;
        font-weight: 720;
      }
      .landing-service-signal__main span {
        font-size: 12px;
        font-weight: 720;
        opacity: .78;
      }
      .landing-service-signal__footer {
        display: grid;
        gap: 10px;
        margin-top: 22px;
      }
      .landing-service-signal__footer > span {
        font-size: 10.5px;
        line-height: 1.35;
        opacity: .68;
      }
      .landing-service-signal__bars {
        height: 4px;
        display: grid;
        grid-template-columns: 1.5fr 1fr .62fr;
        gap: 5px;
      }
      .landing-service-signal__bars i {
        display: block;
        border-radius: 999px;
        background: currentColor;
        opacity: .24;
      }
      .landing-service-signal__bars i:first-child { opacity: .72; }
      .landing-service-signal__bars i:nth-child(2) { opacity: .42; }

      [data-service-signal="teal"] {
        background: linear-gradient(145deg, #dceceb 0%, #edf5f4 58%, #d7e8e5 100%) !important;
        color: #0e6970 !important;
      }
      [data-service-signal="teal"]::after { background: rgba(14,105,112,.15) !important; }
      [data-service-signal="warm"] {
        background: linear-gradient(145deg, #f7eee8 0%, #fbf6f2 62%, #f2ddd1 100%) !important;
        color: #a45739 !important;
      }
      [data-service-signal="warm"]::after { background: rgba(217,120,79,.15) !important; }
      [data-service-signal="ink"] {
        background: linear-gradient(145deg, #173a3f 0%, #112d31 100%) !important;
        color: #eef7f6 !important;
      }
      [data-service-signal="ink"]::after { background: rgba(255,255,255,.08) !important; }
      [data-service-signal="soft"] {
        background: linear-gradient(145deg, #edf3f2 0%, #f8faf9 62%, #e3ecea 100%) !important;
        color: #536a6d !important;
      }
      [data-service-signal="soft"]::after { background: rgba(17,45,49,.07) !important; }

      [data-landing-graphic] {
        position: relative;
        isolation: isolate;
        border-color: rgba(17,45,49,.08) !important;
        background-image: none !important;
      }
      [data-landing-graphic]::before {
        content: attr(data-graphic-label);
        position: absolute;
        left: 22px;
        bottom: 20px;
        z-index: 2;
        font: 800 10px/1.2 var(--font-jetbrains), monospace;
        letter-spacing: .14em;
      }
      [data-landing-graphic]::after {
        content: "" !important;
        display: block !important;
        position: absolute !important;
        width: 46% !important;
        aspect-ratio: 1 !important;
        height: auto !important;
        right: -10% !important;
        top: -24% !important;
        border-radius: 50% !important;
        opacity: .72;
      }
      [data-landing-graphic="teal"] {
        background: linear-gradient(145deg, #dceceb 0%, #edf5f4 58%, #d7e8e5 100%) !important;
        color: #0e6970 !important;
      }
      [data-landing-graphic="teal"]::after { background: rgba(14,105,112,.16) !important; }
      [data-landing-graphic="warm"] {
        background: linear-gradient(145deg, #f7eee8 0%, #fbf6f2 62%, #f2ddd1 100%) !important;
        color: #a45739 !important;
      }
      [data-landing-graphic="warm"]::after { background: rgba(217,120,79,.16) !important; }
      [data-landing-graphic="ink"] {
        background: linear-gradient(145deg, #173a3f 0%, #112d31 100%) !important;
        color: #d5e7e5 !important;
      }
      [data-landing-graphic="ink"]::after { background: rgba(255,255,255,.08) !important; }
      [data-landing-graphic="soft"] {
        background: linear-gradient(145deg, #edf3f2 0%, #f8faf9 62%, #e3ecea 100%) !important;
        color: #536a6d !important;
      }
      [data-landing-graphic="soft"]::after { background: rgba(17,45,49,.07) !important; }

      @media (max-width: 760px) {
        .landing-service-signal { min-height: 250px; padding: 20px; }
        .landing-service-signal__main strong { font-size: 34px; }
      }
    `}</style>
  );
}
