# My Pilot — Professional Edition

Outil de pilotage d'activité : vos dossiers, vos rendez-vous, ce que vous en faites,
le temps que vous y passez, et ce qu'il en reste à présenter.

**Un seul fichier HTML, qui fonctionne hors ligne.** Aucune connexion, aucun service
tiers, aucune dépendance extérieure. Les données vivent dans un fichier JSON que vous
choisissez, sur votre poste.

---

## Démarrer

1. Téléchargez `MyPilot_Pro.html`.
2. Ouvrez-le dans **Microsoft Edge** ou **Chrome** (double-clic, ou `file://`).
3. **Lier un fichier** → choisissez où enregistrer vos données (`mypilot-pro-data.json`).

C'est tout. Pas d'installation, pas de serveur, pas de compte.

> **Firefox et Brave** ne permettent pas l'écriture directe dans un fichier choisi
> (*File System Access API*). L'application le détecte, le signale dans le bandeau, et
> bascule sur un téléchargement à chaque enregistrement. Le diagnostic du poste, dans
> **Données**, dit précisément ce dont dispose votre navigateur.

### Le tampon du navigateur n'est pas une sauvegarde

L'application conserve un tampon local pour assurer la continuité en cours de session.
De nombreux postes d'entreprise l'effacent chaque nuit. **Seul le fichier lié conserve
durablement vos données.**

---

## Ce que l'application fait

| | |
|---|---|
| **Aujourd'hui / Prochain jour ouvré** | points de vigilance, planning, tâches en attente, journal, permanence, compteur |
| **Calendrier** | grille mensuelle des rendez-vous et des échéances, détail du jour choisi |
| **Activités** | tous les dossiers, recherche, filtres, archivage qualifié |
| **Idées** | capture, regroupement automatique par similarité, cristallisation, conversion en activité |
| **Journal** | notes et appels, suites à donner, rattachement aux dossiers |
| **Contacts** | personnes et organisations détectées depuis l'activité, graphe de relations |
| **Rapport** | rapport d'activité imprimable en PDF, sur la période de votre choix, charge à venir |
| **Import Excel** | lecture native des `.xlsx` / `.xlsm`, sans bibliothèque |

Comptes rendus en texte brut depuis une fiche d'appel, de note ou d'activité ;
assistance téléphonique avec rappels périodiques ; aide intégrée (bouton **Aide**,
touche **F1** contextuelle, 15 rubriques).

---

## Le modèle de catégories

Le code est livré avec un **modèle générique** : Dossier, Convocation, Animation,
Transverse. Il sert de point de départ et d'exemple.

Les catégories sont **entièrement configurables** : apparence, champs, cycle de vie,
colonnes d'import. Une configuration complète s'exporte et se réimporte en un fichier :

> **Données → Paramètres → Exporter / Importer une configuration**

**Le code livré ici ne contient aucun modèle particulier** : il ne connaît que des
catégories, des champs et des listes, tous configurables. Une configuration réelle vit
dans un `mypilot-pro-config.json` local que `.gitignore` exclut, et ne fait pas partie
du dépôt.

Pour restaurer un modèle : **Importer une configuration**, puis choisir le fichier.
Les catégories, les listes de valeurs et la cartographie des colonnes d'import sont
rétablies ensemble.

---

## Contenu du dépôt

```
MyPilot_Pro.html      l'application — un seul fichier, c'est la source
CHANGELOG.md          journal des versions, copie de celui du code
LICENSE               texte intégral de la GNU GPL v3
docs/modules.md       contrat d'écriture d'un module de pause
tests/                bancs d'essai Playwright
```

**`MyPilot_Pro.html` est la source**, pas un artefact de construction : il n'y a ni
étape de compilation, ni bundler, ni dépendance. On l'édite directement.

---

## Bancs d'essai

Les tests pilotent un Chromium réel et vérifient l'application telle qu'elle s'exécute :
contenu, mise en page à plusieurs largeurs, absence d'erreur JavaScript, pagination du
rapport imprimé, contraste des boutons du bandeau.

```bash
cd tests
npm install playwright
npx playwright install chromium
node verif.js      # contrôle de structure : version, débordement, erreurs
node test38.js     # une suite ciblée
node verif-module.js ../module   # vérifier ses modules de pause
```

Chaque suite affiche `RÉUSSIS n / ÉCHECS n` et sort en code non nul si quelque chose a
cassé. Les jeux d'essai de `tests/fixtures/` sont **synthétiques** : aucune donnée
réelle n'est versionnée.

---

## Contraintes de conception

Elles ne sont pas négociables, et expliquent beaucoup de choix du code :

- **Un seul fichier.** Pas de CDN, pas de module externe, pas de bibliothèque.
  Ce qui ne tient pas dans le fichier est réécrit — la carte des idées, par exemple,
  est une simulation de forces de cent lignes plutôt que 273 Ko de d3.
- **Aucun accès réseau.** Ni `fetch`, ni `XMLHttpRequest`, ni ressource distante.
  C'est cette absence qui rend l'outil acceptable sur un poste professionnel.
- **Les données appartiennent à l'utilisateur.** Un fichier JSON lisible, qu'il
  choisit, qu'il déplace, qu'il sauvegarde. Rien d'autre.
- **Compatible navigateurs d'entreprise.** JavaScript sans transpilation, syntaxe
  conservatrice.

---

## Licence

**GNU General Public License v3 ou ultérieure** — texte intégral dans `LICENSE`.

Ce programme est un logiciel libre. Vous pouvez l'utiliser, l'étudier, le redistribuer
et le modifier. La seule contrepartie est le partage : **toute version modifiée que vous
distribuez doit l'être sous la même licence, code source compris.**

Il est distribué dans l'espoir qu'il sera utile, mais **sans aucune garantie** ; sans
même la garantie implicite de qualité marchande ou d'adéquation à un usage particulier.

> `MyPilot_Pro.html` est à la fois le programme et son code source complet. Quiconque
> reçoit le fichier dispose donc de la source correspondante au sens de la licence :
> l'obligation de fourniture du source est satisfaite par construction.

L'avis de licence figure en tête de `MyPilot_Pro.html` et dans la fenêtre **À propos**
de l'application.

© 2026 Stella Caltagirone
