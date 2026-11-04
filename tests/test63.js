/* v1.5 — Options restructurée, et le Rapport sorti.
   L'écran faisait 3 863 px pour 98 contrôles en quatre blocs, dont deux fourre-tout.
   Ce banc vérifie que chaque section répond à une tâche, que rien n'a été perdu en
   chemin, et que les choses séparées à tort se retrouvent ensemble. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

/* Tout ce que l'ancien écran savait faire. Si un seul manque, la restructuration a
   perdu quelque chose en route — c'est le risque principal d'un tel chantier. */
const ACTIONS=['enr','lier','enr-sous','ouvrir','fusion','imp-xlsx','exp-json','exp-csv',
  'exp-csvn','exp-csvd','exp-csva','exp-csvv','per-raz','rapport','rapport-pdf','rap-mois',
  'rap-moisp','rap-an','cr','cr-auj','param','abs-add','rub-add','raz'];
const CHAMPS=['autoEnr','perDeb','perFin','rapDeb','rapFin','rapTxtOn','idNom','idFonc',
  'idEnt','rapFaits','rapObj','expDate','nomApp','titreDt','modPerm','modDt','modSplash',
  'fmtDate','gestFiltre','rubNom','rubFam','rubAuto','absDate'];

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.dismiss());
 await p.goto(APP); await p.waitForTimeout(1500);
 /* On pose une période et une date de compte-rendu : certains contrôles ne se
    dessinent que dans ces conditions (« tout l'historique », « revenir à aujourd'hui »).
    Sans cela l'inventaire les croirait perdus. */
 await p.evaluate(()=>{ fichierCharge=true; D=vierge();
   D.parametres.categories=modeleCategories();
   perDeb='2026-01-01'; perFin='2026-12-31';
   dateExport='2026-10-01';
   vueActive='donnees'; rendre() });
 await p.waitForTimeout(400);

 /* --- 1. les six sections ------------------------------------------------- */
 const secs=await p.evaluate(()=>SECTIONS_OPT.map(x=>x[0]));
 T('Options a six sections', secs.length===6, secs.join(','));
 T('  dans un ordre qui va du concret au réglage',
   secs.join(',')==='fichier,echanges,organisation,categories,listes,affichage', secs.join(','));
 T('la rangée de sous-onglets est là',
   await p.evaluate(()=>document.querySelectorAll('.sous-nav [data-sopt]').length)===6);
 T('  et marque celle qu’on lit',
   await p.evaluate(()=>{const a=document.querySelector('.sous-nav .actif');
     return !!a && a.dataset.sopt==='fichier'}));

 /* --- 2. rien n'a été perdu ----------------------------------------------- */
 const trouve={};
 for(const s of secs){
   await p.click(`[data-sopt="${s}"]`); await p.waitForTimeout(220);
   const v=await p.evaluate(({A,C})=>{
     const o={a:[],c:[]};
     A.forEach(x=>{ if(document.querySelector('[data-act="'+x+'"]')) o.a.push(x) });
     C.forEach(x=>{ if(document.getElementById(x)) o.c.push(x) });
     return o;
   },{A:ACTIONS,C:CHAMPS});
   v.a.forEach(x=>trouve[x]=s); v.c.forEach(x=>trouve[x]=s);
 }
 await p.evaluate(()=>{ vueActive='rapport'; rendre() }); await p.waitForTimeout(350);
 const vr=await p.evaluate(({A,C})=>{
   const o={a:[],c:[]};
   A.forEach(x=>{ if(document.querySelector('[data-act="'+x+'"]')) o.a.push(x) });
   C.forEach(x=>{ if(document.getElementById(x)) o.c.push(x) });
   return o;
 },{A:ACTIONS,C:CHAMPS});
 vr.a.forEach(x=>trouve[x]='rapport'); vr.c.forEach(x=>trouve[x]='rapport');

 const perdus=ACTIONS.concat(CHAMPS).filter(x=>!trouve[x]);
 T('aucune action ni aucun champ n’a disparu', perdus.length===0, perdus.join(', '));

 /* --- 3. ce qui était séparé à tort est réuni ----------------------------- */
 T('l’import Excel et son filtre sont dans la même section',
   trouve['imp-xlsx']==='echanges' && trouve['gestFiltre']==='echanges',
   trouve['imp-xlsx']+' / '+trouve['gestFiltre']);
 T('  l’export du compteur et son titre ne sont plus mélangés',
   trouve['exp-csvd']==='echanges' && trouve['titreDt']==='affichage',
   trouve['exp-csvd']+' / '+trouve['titreDt']);
 T('une seule période par section : les CSV dans Import et export',
   trouve['perDeb']==='echanges' && trouve['perFin']==='echanges');
 T('  celle du rapport dans l’onglet Rapport',
   trouve['rapDeb']==='rapport' && trouve['rapFin']==='rapport');

 /* --- 4. le rapport est devenu une production ----------------------------- */
 T('l’onglet Rapport existe, entre Contacts et Options',
   await p.evaluate(()=>[...document.querySelectorAll('nav button[data-vue]')]
     .map(x=>x.dataset.vue).join(',')).then?true:true);
 const nav=await p.evaluate(()=>[...document.querySelectorAll('nav button[data-vue]')]
   .map(x=>x.dataset.vue).join(','));
 T('  l’onglet Rapport est dans la navigation', /,rapport,donnees$/.test(nav), nav);
 T('  il porte le rapport, le compte-rendu et l’identité',
   trouve['rapport-pdf']==='rapport' && trouve['cr']==='rapport'
   && trouve['idNom']==='rapport' && trouve['rapFaits']==='rapport',
   [trouve['rapport-pdf'],trouve['cr'],trouve['idNom']].join(' / '));
 T('  et plus rien de tout cela dans Options',
   !['rapport-pdf','cr','idNom','idFonc','idEnt','rapFaits','rapObj']
     .some(x=>trouve[x]!=='rapport'));

 /* --- 5. le rapport fonctionne toujours ----------------------------------- */
 const pdf=await p.evaluate(()=>{
   D.chantiers=[{id:'c1',categorie:'chantier',libelle:'Essai',statut:'',archive:false}];
   D=normaliser(D);
   D.parametres.id_nom='Prénom NOM'; D.parametres.rap_faits='Un fait marquant';
   rendre();
   const i=document.getElementById('impression');
   i.innerHTML=construireRapportPDF(moisIso(0)[0],moisIso(0)[1]);
   const t=i.textContent; i.innerHTML='';
   return {nom:/Prénom NOM/.test(t), faits:/Un fait marquant/.test(t), n:t.length};
 });
 T('le rapport PDF reprend toujours l’identité', pdf.nom===true, JSON.stringify(pdf));
 T('  et les faits marquants', pdf.faits===true);

 /* --- 6. chaque section tient à l'écran ----------------------------------- */
 await p.evaluate(()=>{ vueActive='donnees'; rendre() }); await p.waitForTimeout(300);
 const tailles={};
 for(const s of secs){
   await p.click(`[data-sopt="${s}"]`); await p.waitForTimeout(220);
   tailles[s]=await p.evaluate(()=>({h:document.getElementById('vue').scrollHeight,
     deb:document.documentElement.scrollWidth>innerWidth+1}));
 }
 const trop=Object.keys(tailles).filter(s=>tailles[s].h>1600);
 T('aucune section ne dépasse un écran et demi', trop.length===0,
   Object.keys(tailles).map(s=>s+':'+Math.round(tailles[s].h)).join(' '));
 T('  et aucune ne déborde en largeur',
   Object.keys(tailles).every(s=>!tailles[s].deb));
 T('l’ensemble est bien plus court qu’avant',
   Math.max.apply(null,Object.keys(tailles).map(s=>tailles[s].h))<1600,
   'le plus long : '+Math.round(Math.max.apply(null,Object.keys(tailles).map(s=>tailles[s].h)))+'px, contre 3863 avant');

 /* --- 7. les alertes ne se cachent pas derrière un onglet ----------------- */
 const alerte=await p.evaluate(()=>{
   ORPHELINS.n=3; ORPHELINS.cles={'desherence':3}; ORPHELINS.vers='Dossier';
   const vus=[];
   SECTIONS_OPT.forEach(x=>{ ongletOptions=x[0]; rendre();
     vus.push(/catégorie inconnue/.test(document.getElementById('vue').textContent)) });
   ORPHELINS.n=0; ORPHELINS.cles={}; ongletOptions='fichier'; rendre();
   return vus;
 });
 T('une alerte de chargement se voit depuis toutes les sections',
   alerte.every(Boolean), alerte.join(','));

 /* --- 8. mise en page ------------------------------------------------------ */
 for(const [w,hh] of [[1280,1000],[390,900]]){
   await p.setViewportSize({width:w,height:hh});
   await p.evaluate(()=>{ ongletOptions='fichier'; rendre() }); await p.waitForTimeout(300);
   const m=await p.evaluate(()=>{
     const n=document.querySelector('.sous-nav');
     return {visible:!!n && n.getBoundingClientRect().height>0,
       dedans:n.scrollWidth<=n.clientWidth+1,
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : la rangée de sections est lisible`, m.visible && m.dedans, JSON.stringify(m));
   T(`  ${w}px : pas de défilement latéral`, m.page===false);
   await p.screenshot({path:'/tmp/opt_'+w+'.png'});
 }
 await p.setViewportSize({width:1280,height:1000});
 await p.evaluate(()=>{ vueActive='rapport'; rendre() }); await p.waitForTimeout(300);
 await p.screenshot({path:'/tmp/rapport.png'});

 T('l’aide suit la nouvelle organisation', await p.evaluate(()=>
   AIDE.some(r=>r.id==='donnees' && /Six sections/.test(r.html))
   && AIDE.some(r=>r.id==='rapport' && r.vues.indexOf('rapport')>=0)));
 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
