const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1500);
 await p.evaluate(()=>{ fichierCharge=true; D.parametres.categories=modeleCategories(); rendre(); });

 const r1=await p.evaluate(()=>({bouton:!!document.getElementById('btnAide'),
   rubriques:window.AIDE.length, titres:window.AIDE.map(r=>r.titre)}));
 console.log('bouton Aide :', r1.bouton, '| rubriques :', r1.rubriques);
 console.log('  ', r1.titres.join(' · '));

 // F1 contextuel sur chaque vue
 for(const [vue,attendu] of [['jour','Aujourd’hui et Prochain jour'],['chantiers','Activités'],
                             ['journal','Journal et notes'],['contacts','Contacts et organisations'],
                             ['donnees','Données, fichier et exports']]){
  const t=await p.evaluate(v=>{ vueActive=v; if(window.fermerAide) window.fermerAide();
    window.ouvrirAide(); return document.querySelector('#paCorps h2').textContent; }, vue);
  console.log(`  F1 depuis « ${vue} » → ${t}`, t===attendu?'✓':'✗ attendu : '+attendu);
 }
 await p.evaluate(()=>window.fermerAide());

 // recherche + surlignage
 const r2=await p.evaluate(async()=>{
   window.ouvrirAide();
   const i=document.getElementById('paCherche'); i.value='archivage';
   i.dispatchEvent(new Event('input',{bubbles:true}));
   await new Promise(r=>setTimeout(r,80));
   return {resultats:document.querySelectorAll('#paNav button').length,
     marques:document.querySelectorAll('#paCorps mark').length,
     rubrique:document.querySelector('#paCorps h2').textContent};
 });
 console.log('recherche « archivage » :', r2.resultats, 'rubrique(s),', r2.marques, 'surlignage(s) → ', r2.rubrique);

 // navigation suivant/precedent
 const r3=await p.evaluate(()=>{
   document.getElementById('paCherche').value=''; window.ouvrirAide('journal');
   const b=[...document.querySelectorAll('#paCorps .pa-pied button')];
   const lib=b.map(x=>x.textContent.trim());
   b[1].click();
   return {pied:lib, apres:document.querySelector('#paCorps h2').textContent};
 });
 console.log('pied de page :', r3.pied.join('  |  '), '→ après clic :', r3.apres);

 // par-dessus une fenetre deja ouverte
 const r4=await p.evaluate(()=>{
   window.fermerAide();
   D.chantiers=[{id:'c1',categorie:'chantier',libelle:'Test',date:auj(),statut:'3 - En attente de tiers'}];
   editerChantier('c1');
   const avant=document.getElementById('modale').open;
   window.ouvrirAide();
   return {modaleAvant:avant, modaleApres:document.getElementById('modale').open,
     aideOuverte:document.getElementById('ppAide').open};
 });
 console.log('au-dessus d’une fiche :', 'fiche avant', r4.modaleAvant, '| fiche après', r4.modaleApres, '| aide', r4.aideOuverte);
 await p.evaluate(()=>{ window.fermerAide(); fermerModale(); });
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
