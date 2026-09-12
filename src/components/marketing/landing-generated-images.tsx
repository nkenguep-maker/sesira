"use client";

import { useEffect } from "react";

const IMAGE_MAP: Array<{ match: string; image: string; position?: string }> = [
  { match: "Dirigeant et technicien CVC devant une installation", image: "team" },
  { match: "Technicien CVC en intervention", image: "team", position: "center" },
  { match: "Dirigeant PME CVC au bureau", image: "editorial", position: "center" },
  { match: "Installation technique", image: "team", position: "center" },
  { match: "Photo dirigeant CVC / devis client", image: "editorial" },
  { match: "Photo technicien CVC sur site", image: "team" },
  { match: "Photo bureau / suivi facturation", image: "finance" },
  { match: "Photo installation CVC / maintenance", image: "team" },
  { match: "Équipe CVC au travail, photo large", image: "team" },
  { match: "Photo commerciale / client CVC", image: "editorial" },
  { match: "Photo chantier / équipe terrain", image: "planning" },
  { match: "Photo administratif / trésorerie", image: "finance" },
  { match: "Photo maintenance préventive CVC", image: "team" },
  { match: "Portrait client / dirigeant CVC", image: "client" },
  { match: "Visuel éditorial / dirigeant CVC", image: "editorial" },
  { match: "Visuel éditorial / planning terrain", image: "planning" },
  { match: "Visuel éditorial / finance PME", image: "finance" },
];

export function LandingGeneratedImages() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[role="img"][aria-label]'));

    for (const node of nodes) {
      const label = node.getAttribute("aria-label") ?? "";
      const match = IMAGE_MAP.find((item) => label.includes(item.match));
      if (!match) continue;

      node.dataset.landingPhoto = "true";
      node.style.backgroundImage = `url(/api/landing-image/${match.image})`;
      node.style.backgroundSize = "cover";
      node.style.backgroundPosition = match.position ?? "center";
      node.style.backgroundRepeat = "no-repeat";
      node.style.borderStyle = "solid";

      const content = node.firstElementChild as HTMLElement | null;
      if (content) content.style.display = "none";
    }
  }, []);

  return (
    <style>{`
      [data-landing-photo="true"]::after { display: none !important; }
      [data-landing-photo="true"] { border-color: rgba(17,45,49,.10) !important; }
    `}</style>
  );
}
