# Écrire un module de pause

Un module est une page HTML rangée à côté de l'application. My Pilot la lance dans une
fenêtre, au moment d'une pause. Un mini-jeu, une appli de révision, une mise en
situation — ce que vous voulez.

```
MyPilot_Pro.html
↳ module/
   ↳ jeu.html
```

Ce document est le **contrat**. Son exécutable est `tests/verif-module.js` : il vérifie
automatiquement tout ce qui suit.

### Installer, une fois

Le vérificateur pilote un vrai Chromium ; il lui faut Node et Playwright.

```bash
cd tests
npm install playwright
npx playwright install chromium
```

### Lancer

```bash
cd tests
node verif-module.js ../module/jeu.html     # un module
node verif-module.js ../module              # tout le dossier
npm run modules                             # raccourci du dossier
```

Si Chromium est déjà sur le poste, `CHROMIUM=/chemin/vers/chrome.exe` évite le
téléchargement.

Il sort en code non nul si un point **bloquant** échoue. Les **réserves** se jugent au
cas par cas.

---

## Les quatre règles bloquantes

### 1. Tout tient dans le fichier

Pas de CDN, pas de Google Fonts, pas de bibliothèque distante, aucune requête réseau.
L'application est utilisable sur un poste professionnel **parce qu'elle n'appelle
jamais l'extérieur** ; un module qui le fait casse cette propriété et, surtout, ne
fonctionnera pas là où ça compte.

```html
<!-- non : le module meurt sur un poste sans accès -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Barlow" rel="stylesheet">

<!-- oui : la bibliothèque est dans le fichier, ou à côté -->
<script src="three.min.js"></script>
<style>body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}</style>
```

Les ressources **relatives** (`style.css`, `jeu.js`, `image.png` dans le même dossier)
fonctionnent parfaitement. C'est seulement l'extérieur qui est exclu.

### 2. Le module ne voit pas l'application

Les deux documents ont des origines opaques l'une pour l'autre : `parent.document` est
inaccessible, et l'application ne peut pas entrer dans le module non plus. C'est le
navigateur qui l'impose, pas une politesse.

Conséquences pratiques :

- Aucun accès aux dossiers, notes, contacts ou paramètres. N'essayez pas.
- `localStorage` fonctionne, mais dans l'origine du module, et **beaucoup de postes
  d'entreprise le vident chaque nuit**. Ne comptez pas dessus pour une progression qui
  doit survivre à la journée.
- Le seul canal est `postMessage`, et l'application n'écoute que deux messages :

```js
parent.postMessage({mypilot:"pret"},   "*");  // j'ai démarré — retire le message d'absence
parent.postMessage({mypilot:"fermer"}, "*");  // j'ai fini — rends la main
```

Rien d'autre n'est accepté. L'isolement reste entier.

### 3. Le module remplit le cadre qu'on lui donne

Il n'a pas la fenêtre entière : l'application garde 20 px de marge et environ 44 px de
bandeau. Les tailles réellement offertes :

| Fenêtre | Cadre du module |
|---|---|
| 1280 × 900 | 1260 × 836 |
| 1024 × 768 | 1004 × 704 |
| 760 × 900 | 740 × 836 |
| 370 × 700 | 350 × 636 |

Aucun débordement horizontal à aucune de ces tailles. Une barre de défilement verticale
est normale ; une barre horizontale ne l'est pas.

```html
<meta name="viewport" content="width=device-width,initial-scale=1">
```

### 4. Pas de sortie par Échap

Dès que le focus est dans le module, **Échap lui appartient** : il ne ferme pas la
fenêtre. Le bouton **Fermer** du bandeau rend toujours la main, mais si votre module
prend le focus au chargement — ce que font la plupart des jeux — prévoyez votre propre
sortie :

```js
document.getElementById('fin').onclick = () => {
  try { parent.postMessage({mypilot:"fermer"}, "*") } catch(e) {}
};
```

---

## Les réserves

Elles ne bloquent pas, mais le vérificateur les signale.

- **Un `<title>`** : c'est ce que le bandeau affiche.
- **`lang="fr"`** sur `<html>`.
- **`alt`** sur les images, un libellé sur les boutons.
- **`prefers-reduced-motion`** : une pause ne doit pas donner mal au cœur.

```css
@media (prefers-reduced-motion: reduce){
  *{animation:none !important; transition:none !important}
}
```

- **Le poids.** Au-delà de ~4 Mo l'ouverture se sent. Inliner une bibliothèque 3D coûte
  cher ; vérifiez que vous en avez besoin.
- **Pas de `alert()`, `confirm()` ni `prompt()`** : ils bloquent toute l'application,
  pas seulement le module.

---

## Le temps

L'activité qui porte le module peut porter une **durée**. Le bandeau affiche alors le
temps restant, puis le dépassement en négatif et en rouge. Rien ne s'interrompt.

Écrivez donc un module **finissable** dans sa durée, ou franchement découpé en parties
courtes. Un jeu de 40 minutes sur une pause de 10 n'est pas une pause.

---

## Le squelette

```html
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nom du module</title>
<style>
  :root{color-scheme:light}
  html,body{height:100%;margin:0}
  body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
       padding:20px;box-sizing:border-box;overflow-x:hidden}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
  <h1>Nom du module</h1>
  <!-- votre contenu -->
  <button id="fin">Terminer</button>
<script>
document.getElementById('fin').onclick=function(){
  try{ parent.postMessage({mypilot:"fermer"},"*") }catch(e){}
};
try{ parent.postMessage({mypilot:"pret"},"*") }catch(e){}
</script>
</body>
</html>
```

---

## Installer un module

1. Déposez le `.html` dans le dossier des modules (`module/` par défaut).
2. **Pause** → section voulue → **Parcourir un dossier…**, ou **⚙** sur une ligne
   existante pour associer le fichier à la main.
3. **⚙** ouvre tout l'élément : nom, durée, module, lien. « Parcourir un dossier »
   baptise les modules d'après leurs fichiers — c'est là qu'on les renomme.
3. **▶** le lance pour l'essayer.

Le dossier des modules n'est pas versionné : c'est votre contenu, pas celui du dépôt.
