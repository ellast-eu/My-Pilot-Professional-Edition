#!/usr/bin/env node
/* Vérifie qu'un module tient le contrat de My Pilot Professional Edition.
   Voir docs/modules.md — ce script est la version exécutable de ce document.

     node verif-module.js ../module/jeu.html
     node verif-module.js ../module            (tout le dossier)

   Sort en code non nul si un point BLOQUANT échoue. Les RÉSERVES sont signalées
   sans faire échouer : elles se jugent au cas par cas. */
const path=require('path'), fs=require('fs');

let chromium;
try{ chromium=require('playwright').chromium }
catch(e){
  console.error("Playwright n'est pas installé dans ce dossier.\n"
    +"  npm install playwright\n  npx playwright install chromium");
  process.exit(2);
}

const CIBLE=process.argv[2];
if(!CIBLE || CIBLE==="-h" || CIBLE==="--help"){
  console.log("Vérifie qu'un module tient le contrat de My Pilot (voir docs/modules.md).\n"
    +"\n  node verif-module.js ../module/jeu.html     un module"
    +"\n  node verif-module.js ../module              tout le dossier\n"
    +"\nSort en code non nul si un point bloquant échoue."
    +"\nCHROMIUM=/chemin/vers/chrome pour imposer un navigateur.");
  process.exit(CIBLE?0:2);
}
if(!fs.existsSync(CIBLE)){ console.error("introuvable : "+CIBLE); process.exit(2) }

/* Playwright sait trouver le Chromium qu'il a installé. On ne force un chemin que
   s'il est donné et qu'il existe : sans cela le script ne tourne que sur la machine
   où il a été écrit. */
function lancement(){
  const e=process.env.CHROMIUM||'/opt/pw-browsers/chromium';
  return fs.existsSync(e) ? {executablePath:e} : {};
}

/* Le cadre réel que l'application offre : fenêtre moins 20 px, moins le bandeau. */
const CADRES=[[1280,900],[1024,768],[760,900],[370,700]];
const BANDEAU=44, MARGE=20;

function fichiers(c){
  const s=fs.statSync(c);
  if(s.isFile()) return [path.resolve(c)];
  return fs.readdirSync(c).filter(f=>/\.x?html?$/i.test(f)).sort()
    .map(f=>path.resolve(path.join(c,f)));
}

(async()=>{
 const liste=fichiers(CIBLE);
 if(!liste.length){ console.error("aucun .html à vérifier"); process.exit(2) }
 const b=await chromium.launch(lancement());
 let bloquants=0;

 for(const f of liste){
   const nom=path.basename(f);
   const dur=[],res=[],vus=[];          /* bloquants · réserves · constats */
   const ctx=await b.newContext({viewport:{width:CADRES[0][0]-MARGE,height:CADRES[0][1]-MARGE-BANDEAU}});

   /* Rien ne doit sortir vers le réseau : on coupe, et on note qui a essayé. */
   const sorties=[];
   await ctx.route(u=>/^https?:/i.test(u.href), r=>{ sorties.push(r.request().url()); r.abort() });

   const p=await ctx.newPage();
   const erreurs=[], console_=[];
   p.on('pageerror',e=>erreurs.push(String(e).slice(0,160)));
   p.on('console',m=>{ if(m.type()==='error') console_.push(m.text().slice(0,160)) });
   p.on('dialog',d=>{ res.push("ouvre une boîte de dialogue du navigateur ("+d.type()+")"); d.dismiss() });

   await p.goto('file://'+f).catch(e=>erreurs.push("chargement : "+e.message));
   await p.waitForTimeout(2500);

   /* --- 1. autonomie ----------------------------------------------------- */
   const ext=[...new Set(sorties.map(u=>{try{return new URL(u).host}catch(e){return u}}))];
   if(ext.length) dur.push("appelle l’extérieur : "+ext.join(", ")
     +" — inutilisable sur un poste sans accès");
   else vus.push("autonome : aucune requête réseau");

   const src=fs.readFileSync(f,'utf8');
   const m=src.match(/\b(?:src|href)\s*=\s*["'](https?:)?\/\/[^"']+/gi)||[];
   if(m.length && !ext.length) res.push(m.length+" référence(s) absolue(s) dans le source, non chargée(s) ici");

   /* --- 2. le module vit-il ? --------------------------------------------- */
   if(erreurs.length) dur.push("erreur JavaScript : "+erreurs[0]);
   if(console_.length) res.push("erreur console : "+console_[0]);
   const vivant=await p.evaluate(()=>({
     texte:(document.body.innerText||"").trim().length,
     noeuds:document.body.querySelectorAll('*').length,
     titre:document.title||""
   })).catch(()=>null);
   if(!vivant || (vivant.texte<2 && vivant.noeuds<4))
     dur.push("la page semble vide une fois chargée");
   else vus.push("affiche quelque chose ("+vivant.noeuds+" éléments)");
   if(!vivant || !vivant.titre.trim()) res.push("pas de <title> : le bandeau n’aura rien à afficher");

   /* --- 3. le focus ------------------------------------------------------- */
   const vole=await p.evaluate(()=>{
     const a=document.activeElement;
     return !!(a && a!==document.body && a!==document.documentElement);
   }).catch(()=>false);
   const sortie=/postMessage\s*\(\s*\{[^}]*mypilot/.test(src) || /mypilot\s*:\s*["']fermer/.test(src);
   if(vole && !sortie)
     res.push("prend le focus au chargement sans offrir de sortie : Échap ne fermera pas la fenêtre");
   if(sortie) vus.push("sait rendre la main (postMessage)");

   /* --- 4. la mise en page dans le cadre réel ----------------------------- */
   for(const [w,h] of CADRES){
     const lw=w-MARGE, lh=h-MARGE-BANDEAU;
     await p.setViewportSize({width:lw,height:lh});
     await p.waitForTimeout(500);
     const d=await p.evaluate(()=>({
       deb:document.documentElement.scrollWidth>innerWidth+1,
       trop:document.documentElement.scrollWidth-innerWidth,
       /* Un tiroir volontairement hors cadre (translateX(105%), position:fixed) n'est
          pas un defaut de mise en page : il ne fait pas defiler la page, ce que le
          controle bloquant ci-dessus verifie deja. On ne compte que ce qui deborde
          sans avoir ete deplace exprès. */
       coupe:[...document.body.querySelectorAll('*')].filter(e=>{
         const r=e.getBoundingClientRect();
         if(!(r.width>0 && r.height>0)) return false;
         if(!(r.right>innerWidth+2 || r.left<-2)) return false;
         for(let n=e; n && n!==document.body; n=n.parentElement){
           const st=getComputedStyle(n);
           if(st.position==='fixed') return false;
           if(st.transform && st.transform!=='none') return false;
         }
         return true;
       }).length
     })).catch(()=>null);
     if(!d) continue;
     if(d.deb) dur.push(`déborde en largeur dans un cadre de ${lw}×${lh} (+${d.trop} px)`);
     else if(d.coupe>0) res.push(`${d.coupe} élément(s) hors cadre à ${lw}×${lh}`);
   }
   if(!dur.some(x=>/déborde/.test(x))) vus.push("tient dans le cadre, de 1260 à 350 px");

   /* --- 5. accessibilité : le minimum ------------------------------------- */
   const a11y=await p.evaluate(()=>{
     const lang=document.documentElement.getAttribute('lang')||"";
     const vp=!!document.querySelector('meta[name="viewport"]');
     const imgs=[...document.images].filter(i=>!i.alt && !i.getAttribute('aria-hidden')).length;
     const btns=[...document.querySelectorAll('button,[role="button"]')]
       .filter(e=>!(e.textContent||"").trim() && !e.getAttribute('aria-label')).length;
     return {lang,vp,imgs,btns};
   }).catch(()=>({lang:"",vp:false,imgs:0,btns:0}));
   if(!a11y.lang) res.push('pas d’attribut lang sur <html>');
   if(!a11y.vp) res.push("pas de meta viewport : la mise en page étroite risque de casser");
   if(a11y.imgs) res.push(a11y.imgs+" image(s) sans alt");
   if(a11y.btns) res.push(a11y.btns+" bouton(s) sans libellé accessible");

   /* --- 6. mouvement et thème --------------------------------------------- */
   if(!/prefers-reduced-motion/.test(src))
     res.push("ne tient pas compte de prefers-reduced-motion");
   const poids=Math.round(fs.statSync(f).size/1024);
   vus.push(poids+" Ko");
   if(poids>4096) res.push("fichier très lourd ("+poids+" Ko) : l’ouverture sera lente");

   await ctx.close();

   const etat = dur.length ? "REFUSÉ" : (res.length ? "PASSE AVEC RÉSERVES" : "CONFORME");
   console.log("\n"+nom+"  —  "+etat);
   vus.forEach(x=>console.log("   · "+x));
   dur.forEach(x=>console.log("   ✗ "+x));
   res.forEach(x=>console.log("   ! "+x));
   if(dur.length) bloquants++;
 }

 await b.close();
 console.log("\n"+liste.length+" module(s) vérifié(s) · "+bloquants+" refusé(s)");
 process.exit(bloquants?1:0);
})();
