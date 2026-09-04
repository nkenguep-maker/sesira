#!/usr/bin/env bash
# scripts/check-wording.sh — applique docs/LEXIQUE-REGLEMENTAIRE.md
# Deux niveaux. Niveau 1 : interdits absolus. Niveau 2 : « conforme / conformité »,
# qui exige une exemption explicite et relue.
#
# Exemption : ajouter  wording-ok: <raison>  sur la ligne concernée.
# Une exemption est une décision, pas un contournement : elle se relit en revue de diff.

set -uo pipefail

# Surfaces destinées à un lecteur humain. Ajouter ici toute nouvelle surface publique.
SCAN_PATHS=(src app pages components content emails templates locales i18n marketing site public)

# Le corpus juridique et documentaire cite les formulations interdites pour les interdire :
# il n'est pas scanné.

# ---------- Niveau 1 : interdits absolus ----------
HARD='déclare(r|ons)? pour vous'
HARD+='|déclaration (envoyée|transmise|déposée|effectuée)'
HARD+='|télédéclar|nous déposons|dépôt automatique|déposé pour vous'
HARD+='|vous êtes conforme|êtes-vous conforme|rendu conforme'
HARD+='|non[[:space:]-]?conform|mise en conformité|garantie de conformité|conformité garantie'
HARD+='|vous êtes à jour|contrôle non effectué|en infraction'
HARD+='|meilleure offre|offre recommandée|mensualit|éligib|taux (estimé|proposé)|simulateur de financement'
HARD+='|nous transmettons votre dossier|dossier accepté'
HARD+='|sécurité renforcée'
# équivalents anglais
HARD+='|you (are|re) compliant|fully compliant|we file for you|filed on your behalf|submitted to the authorities'
HARD+='|best offer|estimated monthly|eligible for financing|enhanced security'

# ---------- Niveau 2 : le mot lui-même ----------
SOFT='conform(e|es|ité|ités)'
# « conformément à » est une locution neutre, pas un verdict.
SOFT_ALLOW='conformément'

fail=0
files=""
for p in "${SCAN_PATHS[@]}"; do
  [ -d "$p" ] || continue
  found=$(find "$p" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
    -o -name '*.vue' -o -name '*.svelte' -o -name '*.json' -o -name '*.md' -o -name '*.mdx' \
    -o -name '*.html' -o -name '*.sql' -o -name '*.yml' -o -name '*.yaml' \) \
    -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/dist/*' \
    -not -path '*/build/*' -not -path '*/coverage/*' 2>/dev/null)
  files="$files$found"$'\n'
done

files=$(echo "$files" | grep -v '^$' || true)

if [ -z "$files" ]; then
  echo "check-wording : aucune surface à scanner (répertoires attendus : ${SCAN_PATHS[*]})"
  exit 0
fi

hits1=$(echo "$files" | xargs -r grep -HniE "$HARD" 2>/dev/null | grep -v 'wording-ok' || true)
if [ -n "$hits1" ]; then
  echo "❌ NIVEAU 1 — formulation interdite (docs/LEXIQUE-REGLEMENTAIRE.md §2)"
  echo "$hits1"
  echo
  fail=1
fi

hits2=$(echo "$files" | xargs -r grep -HniE "$SOFT" 2>/dev/null \
        | grep -viE "$SOFT_ALLOW" | grep -v 'wording-ok' || true)
if [ -n "$hits2" ]; then
  echo "❌ NIVEAU 2 — « conforme / conformité » employé sans exemption (INV-01)"
  echo "   SESIRA ne qualifie jamais un état de conformité."
  echo "   Si l'emploi est légitime, ajouter en fin de ligne :  wording-ok: <raison>"
  echo "$hits2"
  echo
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "✅ Lexique réglementaire respecté ($(echo "$files" | wc -l | tr -d ' ') fichiers scannés)"
fi
exit $fail
