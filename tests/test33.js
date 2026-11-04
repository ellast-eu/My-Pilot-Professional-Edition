const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
/* 3.16.2 — import des dossiers : un dossier archivé ne doit plus revenir à chaque import */
const {chromium}=require('playwright'); const fs=require('fs');
const ok=[],ko=[];
const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+'');
 await p.waitForTimeout(1500);
 await p.evaluate(()=>{fichierCharge=true; rendre()});

 /* un jeu maîtrisé : 5 dossiers chez moi, le fichier n'en porte que 3 */
 const prep=await p.evaluate(()=>{
   const K=catImport();
   if(!K) return {err:'aucune catégorie d\'import'};
   if(!champFiltre()) reparerImportCat();   /* le jeu t3.json a perdu le filtre (bug 3.2.5) */
   /* le gestionnaire n'est plus pré-rempli dans le code : le test le pose lui-même */
   if(!D.parametres.gestionnaire) D.parametres.gestionnaire='Testeuse';
   const f=champFiltre(), g=D.parametres.gestionnaire;
   const cols=champsImport();
   D.chantiers=D.chantiers.filter(c=>(c.categorie||'chantier')!==K.cle);
   const faire=(ref_technique,lib)=>{
     const c={id:uid(),categorie:K.cle,ref_technique:ref_technique,reference:ref_technique,libelle:lib,
       statut:(jeuStatuts(K.statuts)[0]||[''])[0],date:'',heure:'',duree:0,commentaire:''};
     if(f) c[f]=g;
     D.chantiers.push(c); return c;
   };
   ['A','B','C','D','E'].forEach((x,k)=>faire('3000191000'+k,'Dossier '+x));
   modifie();
   return {cle:K.cle, filtre:f, gest:g, cols:cols.map(c=>c.k), n:D.chantiers.length};
 });
 T('le jeu d’essai est en place', !prep.err && prep.n===5, JSON.stringify(prep));
 T('le filtre gestionnaire est bien configuré', !!prep.filtre && !!prep.gest,
   prep.filtre+' = '+prep.gest);

 /* le fichier ne contient que A, B, C : D et E sont absents */
 const lignes = await p.evaluate(({filtre,gest})=>{
   /* les colonnes sont repérées par leur rang dans le fichier (def.c, 1-based),
      pas par leur ordre dans champsImport() */
   const cols=champsImport();
   const cRef=cols.find(c=>c.k==='ref_technique'), cF=cols.find(c=>c.k===filtre);
   const larg=Math.max(...cols.map(c=>c.c))+1;
   const vide=()=>new Array(larg).fill('');
   const entete=vide(); cols.forEach(c=>entete[c.c-1]=c.lib);
   const l=[vide(),entete];
   ['0','1','2'].forEach(k=>{
     const r=vide();
     r[cRef.c-1]='3000191000'+k;
     if(cF) r[cF.c-1]=gest;
     l.push(r);
   });
   window.__lignes=l;
   window.__cRef=cRef.c; window.__cF=cF?cF.c:0; window.__larg=larg;
   return {lignes:l.length, cRef:cRef.c, cF:cF?cF.c:0, larg};
 }, prep);
 T('le fichier d’essai est formé', lignes.lignes===5, JSON.stringify(lignes));

 /* 1er import : D et E doivent être proposés à l'archivage */
 const r1=await p.evaluate(()=>{
   const r=analyserImport(window.__lignes);
   return {absents:r.absents.map(c=>c.libelle), dejaArch:r.dejaArch||0,
     filtreOk:r.filtreOk, nouv:r.nouv.length, maj:r.maj.length};
 });
 T('le filtre gestionnaire s’applique', r1.filtreOk===true);
 T('le 1er import propose D et E', r1.absents.length===2 &&
   r1.absents.join(',')==='Dossier D,Dossier E', r1.absents.join(','));
 T('aucun déjà-archivé au 1er import', r1.dejaArch===0, ''+r1.dejaArch);

 /* j'archive D, je laisse E */
 await p.evaluate(()=>{
   const d=D.chantiers.find(c=>c.libelle==='Dossier D');
   archiver(d,"absent du fichier d'import","sorti");
   modifie();
 });
 T('Dossier D est archivé', await p.evaluate(()=>
   !!D.chantiers.find(c=>c.libelle==='Dossier D').archive));

 /* 2e import, fichier identique : D ne doit plus être proposé */
 const r2=await p.evaluate(()=>{
   const r=analyserImport(window.__lignes);
   return {absents:r.absents.map(c=>c.libelle), dejaArch:r.dejaArch||0};
 });
 T('le 2e import ne repropose plus D', r2.absents.indexOf('Dossier D')<0, r2.absents.join(','));
 T('mais propose toujours E', r2.absents.length===1 && r2.absents[0]==='Dossier E',
   r2.absents.join(','));
 T('le décompte des écartés est juste', r2.dejaArch===1, ''+r2.dejaArch);

 /* 3e import : rien ne doit dériver */
 await p.evaluate(()=>{
   const e=D.chantiers.find(c=>c.libelle==='Dossier E');
   archiver(e,"absent du fichier d'import","sorti"); modifie();
 });
 const r3=await p.evaluate(()=>{
   const r=analyserImport(window.__lignes);
   return {absents:r.absents.length, dejaArch:r.dejaArch||0};
 });
 T('une fois tout archivé, plus aucune proposition', r3.absents===0, ''+r3.absents);
 T('les deux sont comptés comme écartés', r3.dejaArch===2, ''+r3.dejaArch);

 /* l'écran d'import n'affiche plus la section, et dit pourquoi */
 const ecran=await p.evaluate(()=>{
   ecranImport(analyserImport(window.__lignes));
   const t=document.getElementById('modCorps').textContent;
   return {section:/Dossiers absents du fichier/.test(t),
     mention:/Déjà archivés, non reproposés/.test(t),
     cases:document.querySelectorAll('input.abs').length};
 });
 T('la section « Dossiers absents » disparaît', ecran.section===false);
 T('plus aucune case à cocher', ecran.cases===0, ''+ecran.cases);
 T('le diagnostic explique l’absence', ecran.mention===true);
 await p.evaluate(()=>fermerModale());

 /* un archivé qui REVIENT dans le fichier reste proposé à la réactivation */
 const retour=await p.evaluate(()=>{
   const l=window.__lignes.map(r=>r.slice());
   const r=new Array(window.__larg).fill('');
   r[window.__cRef-1]='30001910003';      /* le Référence technique de Dossier D */
   if(window.__cF) r[window.__cF-1]=D.parametres.gestionnaire;
   l.push(r);
   const a=analyserImport(l);
   return {revenus:a.revenus.map(c=>c.libelle), nouv:a.nouv.length,
     absents:a.absents.length, dejaArch:a.dejaArch||0};
 });
 T('un archivé de retour est bien détecté', retour.revenus.indexOf('Dossier D')>=0,
   retour.revenus.join(','));
 T('il n’est pas recréé en doublon', retour.nouv===0, ''+retour.nouv);
 T('il n’est plus compté parmi les écartés', retour.dejaArch===1, ''+retour.dejaArch);

 /* la réactivation par l'import fonctionne toujours */
 const react=await p.evaluate(()=>{
   const d=D.chantiers.find(c=>c.libelle==='Dossier D');
   desarchiver(d);
   return {archive:!!d.archive};
 });
 T('un dossier se désarchive', react.archive===false);

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));
 console.log('\nRÉUSSIS '+ok.length);
 if(ko.length){ console.log('ÉCHECS  '+ko.length); ko.forEach(x=>console.log('  ✗ '+x)) }
 else console.log('ÉCHECS  0');
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
