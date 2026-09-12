"use client";

import { useEffect } from "react";

type PhotoMatch = { match: string; image: string; position?: string };
type GraphicMatch = { match: string; label: string; tone: "teal" | "warm" | "ink" | "soft" };

// Keep photography scarce and intentional. Each generated photo is used once.
const PHOTO_MAP: PhotoMatch[] = [
  { match: "Dirigeant et technicien CVC devant une installation", image: "team", position: "center" },
  { match: "Équipe CVC au travail, photo large", image: "planning", position: "center" },
  { match: "Portrait client / dirigeant CVC", image: "client", position: "center" },
  { match: "Visuel éditorial / dirigeant CVC", image: "editorial", position: "center" },
  { match: "Visuel éditorial / finance PME", image: "finance", position: "center" },
];

// Repeated photo slots become simple SESIRA editorial surfaces instead of reusing the same people everywhere.
const GRAPHIC_MAP: GraphicMatch[] = [
  { match: "Technicien CVC en intervention", label: "TERRAIN", tone: "teal" },
  { match: "Dirigeant PME CVC au bureau", label: "DÉCISION", tone: "ink" },
  { match: "Installation technique", label: "OBLIGATIONS", tone: "soft" },
  { match: "Photo dirigeant CVC / devis client", label: "DEVIS", tone: "warm" },
  { match: "Photo technicien CVC sur site", label: "INTERVENTIONS", tone: "teal" },
  { match: "Photo bureau / suivi facturation", label: "FACTURES", tone: "ink" },
  { match: "Photo installation CVC / maintenance", label: "MAINTENANCE", tone: "soft" },
  { match: "Photo commerciale / client CVC", label: "DEVIS", tone: "warm" },
  { match: "Photo chantier / équipe terrain", label: "TERRAIN", tone: "teal" },
  { match: "Photo administratif / trésorerie", label: "TRÉSORERIE", tone: "ink" },
  { match: "Photo maintenance préventive CVC", label: "ENTRETIEN", tone: "soft" },
  { match: "Visuel éditorial / planning terrain", label: "MÉTHODE", tone: "teal" },
];

export function LandingGeneratedImages() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[role="img"][aria-label]'));

    for (const node of nodes) {
      const label = node.getAttribute("aria-label") ?? "";
      const photo = PHOTO_MAP.find((item) => label.includes(item.match));
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
    `}</style>
  );
}
