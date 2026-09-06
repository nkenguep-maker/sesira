# SESIRA — Dashboard Stitch strict

Source visuelle unique: ZIP `stitch_modern_customer_dashboard_ux`, design system `Editorial Technical Utility`.

## Règles
- Le Core fournit uniquement données, états et actions.
- L'UI du dashboard ne réutilise pas le langage visuel legacy SESIRA.
- Palette, typographie, densité, bordures, rayons et hiérarchie suivent Stitch.
- Navigation desktop horizontale sur le dashboard.
- Pas de flèches décoratives dans les actions ou liens.
- Pas de gradient ajouté hors écrans Stitch.
- Pas de carte SaaS molle/pills structurelles.
- Les métriques utilisent JetBrains Mono/tabular nums.
- Les libellés réglementaires SESIRA restent prudents: préparation, échéance, données manquantes, document à joindre; aucun verdict.
- `/app` = mêmes composants visuels avec données Core réelles.
- `/demo` = même langage visuel avec données fictives explicitement étiquetées.

## Hiérarchie dashboard
1. Header de régie / navigation.
2. Bandeau supervision + synthèse du jour.
3. File de décisions immédiates (max 7, une action principale par ligne).
4. Progression de la journée si donnée disponible.
5. Cockpit financier & cash-flow (4 métriques).
6. Aujourd'hui sur le terrain.
7. Registre obligations CVC / F-Gas / CERFA.
8. État SESIRA uniquement si dégradé.
