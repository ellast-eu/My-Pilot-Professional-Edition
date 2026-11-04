const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 /* A — en-tête aux largeurs critiques.
    C'était à l'origine une comparaison avant/après la 3.14.0 ; la version de référence
    a disparu avec son dossier temporaire. On mesure désormais le fichier du dépôt, ce
    qui est la seule chose qu'un banc versionné peut vérifier dans la durée. */
 for(const [f,lbl] of [[path.join(RACINE,'MyPilot_Pro.html'),'version courante']]){
  const res=[];
  for(const w of [1280,1100,900,768,640,390]){
   const ctx=await b.newContext({viewport:{width:w,height:900}}); const p=await ctx.newPage();
   await p.goto('file://'+f); await p.waitForTimeout(900);
   const r=await p.evaluate(()=>{
     const et=document.getElementById('etat'), jo=document.querySelector('.jour');
     const ma=document.querySelector('.marque');
     const re=et.getBoundingClientRect(), rj=jo.getBoundingClientRect(), rm=ma.getBoundingClientRect();
     // largeur occupée par le texte d'état quand il change
     const t=document.getElementById('etatTxt');
     const mes=v=>{t.textContent=v; return t.getBoundingClientRect().width};
     const a1=mes('Enregistrement…'), a2=mes('Auto · enregistré 09:47:12'), a3=mes('Aucune modification');
     const l1=Math.min(a1,a2,a3), l2=Math.max(a1,a2,a3);
     return {memeLigne:Math.abs(re.top-rj.top)<4, gauche:Math.round(re.left),
       debordeMarque:re.left<rm.right && Math.abs(re.top-rm.top)<4,
       saut:Math.round(Math.abs(l2-l1)), sw:document.documentElement.scrollWidth};
   });
   res.push(`${String(w).padStart(4)}px état ${r.memeLigne?'même ligne':'2e ligne'} x=${String(r.gauche).padStart(4)} | saut texte ${r.saut}px | scrollW ${r.sw}`);
   await ctx.close();
  }
  console.log('---',lbl); res.forEach(x=>console.log('   ',x));
 }
 // B — la fenêtre de saisie remplace prompt
 const ctx=await b.newContext({viewport:{width:1280,height:900}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 let promptAppele=false;
 await p.addInitScript(()=>{ window.prompt=()=>{ window.__prompt=true; return 'X' } });
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1400);
 const r=await p.evaluate(async()=>{
   fichierCharge=true; D.parametres.categories=modeleCategories();
   D.parametres.types_note=['Suivi','Appel'];
   const pr=saisirValeur('Nouvelle valeur à ajouter à la liste');
   await new Promise(r=>setTimeout(r,120));
   const d=document.querySelector('dialog.saisie-val');
   const ouverte=!!(d&&d.open), focus=document.activeElement===d?.querySelector('input');
   d.querySelector('input').value='Réunion de chantier';
   d.querySelector('[data-s="oui"]').click();
   const v=await pr;
   return {ouverte, focus, valeur:v, promptNatif:!!window.__prompt,
     nettoyee:!document.querySelector('dialog.saisie-val')};
 });
 console.log('--- fenêtre de saisie');
 console.log('    ouverte', r.ouverte, '| focus dans le champ', r.focus, '| valeur rendue', JSON.stringify(r.valeur));
 console.log('    window.prompt appelé :', r.promptNatif, '| retirée du DOM après :', r.nettoyee, '| erreurs', errs.length);
 await ctx.close(); await b.close();
})();
