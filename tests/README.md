# Bancs d'essai

Chaque fichier est un script Node autonome qui ouvre `../MyPilot_Pro.html` dans un
Chromium piloté par Playwright, agit sur l'application comme le ferait une personne,
puis vérifie le résultat. Aucune donnée réelle n'est utilisée.

## Lancer

```bash
npm install playwright
npx playwright install chromium
node verif.js
```

Les suites nommées `testNN.js` affichent `RÉUSSIS n / ÉCHECS n` et sortent en code non
nul si quelque chose a cassé. Les plus récentes :

| Fichier | Ce qu'il vérifie |
|---|---|
| `verif.js` | structure : version, débordement horizontal, erreurs JavaScript |
| `test31.js` | module Idées : dépôt, regroupement, cristallisation, conversion |
| `test32.js` | carte des idées : membranes, cristaux, glisser, zoom, extinction |
| `test33.js` | import : un dossier archivé n'est plus reproposé |
| `test34.js` | lecture tolérante des réponses collées (guillemets courbes, balises) |
| `test35.js` | comptes rendus sur les fiches appel, note et activité |
| `test36.js` | permanence close : plage tenue, durée, appels |
| `test37.js` | champ Affaire de la permanence |
| `test38.js` | fenêtre À propos et journal des versions |
| `test39.js` | contraste des boutons du bandeau, dans tous leurs états |
| `test40.js` | bandeau animé de la fenêtre À propos |
| `test41.js` | « Action terminée » : saisie de la suite suivante, et nom par défaut long |
| `test42.js` | « Passées sans trace » : détection, horizons, écart et reprise |
| `test43.js` | pied des fenêtres : aucun chevauchement, à toute largeur et police |
| `test44.js` | modules de pause : chemins, isolement, lancement, mise en page |
| `test45.js` | minuteur de la fenêtre de module : décompte, bascule, dépassement |
| `test46.js` | réglage par section, bouton Accompagnement, liens |
| `verif-module.js` | contrôle un module de pause contre `docs/modules.md` (outil, pas suite) |
| `test47.js` | filtre de période par défaut, saisie de fiche non perdue |
| `test48.js` | un dossier sans date le reste, à l'ouverture comme à l'enregistrement |
| `test49.js` | dossiers non pilotés, filtre, et page « Charge à venir » |
| `test50.js` | report d'une tâche, et longueur du trait des comptes rendus |
| `test51.js` | exports séparés des appels et des vérifications, écarts de cadence |
| `test52.js` | vue Calendrier : grille, comptes par jour, navigation, détail |
| `test53.js` | la même ligne d'échéance dans les trois écrans qui en listent |
| `test54.js` | les événements remplacent la date unique : reprise, fiche, écrans |
| `test55.js` | onglet Options, et format des dates au choix (navigateur en anglais) |
| `test56.js` | fiche d'activité : une seule convention pour les boutons d'ajout |
| `test57.js` | les messages sur le pilotage disent la même chose que la règle |
| `test58.js` | suivi de projet : jalons cochés, avancement calculé, échéance justifiée |
| `test60.js` | réagencer les champs d'une catégorie : flèches, glisser, défilement |
| `test61.js` | source automatique d'une rubrique, unicité, et garde-fou à la suppression |
| `test62.js` | notes sans rattachement : les retrouver et les ranger |
| `test63.js` | Options en six sections : rien de perdu, et ce qui va ensemble l'est |
| `test64.js` | la rangée d'onglets tient en portrait, et l'on voit où l'on est |
| `test59.js` | le convertisseur de l'ancien format, et le rechargement du résultat |
| `pagi5.js` | pagination du rapport imprimé, sous charge |
| `mesure.js` | mise en page de la carte des idées à plusieurs largeurs |

Les suites `test5.js` à `test30.js` couvrent les versions antérieures : réparation des
catégories, import Excel, archivage, contacts, rapport, aide.

## Deux bancs qui ne figurent pas ici

`testconfig.js` vérifie deux choses : que le modèle de catégories livré avec le code
est bien générique, et qu'importer une configuration le restaure intégralement.
Il a besoin du `mypilot-pro-config.json` réel, qui n'est pas versionné — il reste donc
**local** et `.gitignore` l'exclut.

`test59.js` vérifie `outils/convertir-ancien-fichier.html`, qui convertit un fichier
enregistré avant la v1.0. Cet outil ne sert qu'à qui a utilisé les versions privées, et
il est le seul endroit où les anciennes clés devaient encore être nommées : les deux
restent hors dépôt.

## Écrire une suite

Le squelette est toujours le même :

```js
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
```

puis `p.goto(APP)`, un `p.evaluate()` qui agit, et des assertions sur ce qui en sort.
Deux principes tirés de l'expérience :

- **vérifier ce qui se voit, pas seulement ce qui existe.** Un bouton présent dans le
  DOM peut être invisible : `test39.js` mesure le contraste parce que deux boutons ont
  déjà été livrés noirs sur fond noir.
- **ne rien coder en dur d'un modèle particulier.** Les rangs de colonnes et les libellés se
  lisent depuis `champsImport()` et les listes de `D.parametres`, pas depuis des
  constantes du banc : la configuration change, la mécanique non.
