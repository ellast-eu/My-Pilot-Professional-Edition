/* 3.29.1 — un dossier sans date le reste.
   Régression réelle : une fiche importée sans date d'intervention n'a pas de propriété
   « date » du tout ; le formulaire proposait aujourd'hui et un simple « Enregistrer »
   la faisait atterrir dans le planning du jour. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:950}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+''); await p.waitForTimeout(1500);

 const enregistrer=()=>p.evaluate(()=>[...document.querySelectorAll('#modPied button')]
   .find(e=>e.textContent.trim()==='Enregistrer').click());

 /* --- 1. la fiche sans propriété date ----------------------------------- */
 let r=await p.evaluate(()=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[{id:'x1',categorie:'chantier',libelle:'Dossier sans date',
     reference:'2026-099',statut:'',archive:false}];     /* pas de clé « date » */
   vueActive='chantiers'; rendre(); editerChantier('x1');
   return {champ:document.querySelector('#modCorps [name="date"]').value};
 });
 T('le champ reste vide, pas rempli avec aujourd’hui', r.champ==='', JSON.stringify(r.champ));
 await enregistrer(); await p.waitForTimeout(400);
 r=await p.evaluate(()=>({date:D.chantiers[0].date, planning:chantiersDu(auj()).length}));
 T('enregistrer n’invente pas de date', r.date==='', JSON.stringify(r.date));
 T('  le dossier reste hors du planning du jour', r.planning===0, ''+r.planning);

 /* --- 2. une date vide explicite se comporte pareil ---------------------- */
 r=await p.evaluate(()=>{
   D.chantiers=[{id:'x2',categorie:'chantier',date:'',libelle:'Vide explicite',
     statut:'',archive:false}];
   rendre(); editerChantier('x2');
   const v=document.querySelector('#modCorps [name="date"]').value;
   [...document.querySelectorAll('#modPied button')].find(e=>e.textContent.trim()==='Enregistrer').click();
   return {champ:v, apres:D.chantiers[0].date, planning:chantiersDu(auj()).length};
 }); await p.waitForTimeout(300);
 T('« absente » et « vide » se comportent pareil',
   r.champ==='' && r.apres==='' && r.planning===0, JSON.stringify(r));

 /* --- 3. une date existante n'est pas touchée ---------------------------- */
 r=await p.evaluate(()=>{
   D.chantiers=[{id:'x3',categorie:'chantier',date:'2026-03-04',libelle:'Daté',
     statut:'',archive:false}];
   D=normaliser(D);              /* une fiche datée porte toujours son événement */
   rendre(); editerChantier('x3');
   const v=document.querySelector('#modCorps [name="date"]').value;
   [...document.querySelectorAll('#modPied button')].find(e=>e.textContent.trim()==='Enregistrer').click();
   return {champ:v, apres:D.chantiers[0].date};
 }); await p.waitForTimeout(300);
 T('une date existante est conservée', r.champ==='2026-03-04' && r.apres==='2026-03-04',
   JSON.stringify(r));

 /* --- 4. on peut toujours en poser une ----------------------------------- */
 /* 3.35.0 : on ne date plus une fiche en tapant dans le champ Date — il n'affiche
    que l'événement de référence. Dater, c'est poser un événement ; dévider, c'est
    le retirer. Le résultat observable, lui, est inchangé : c.date suit, et le
    planning du jour ne ramasse que ce qui est daté. */
 await p.evaluate(()=>{
   D.chantiers=[{id:'x4',categorie:'chantier',libelle:'À dater',statut:'',archive:false}];
   rendre(); editerChantier('x4');
 }); await p.waitForTimeout(300);
 T('le champ Date ne se saisit plus à la main',
   await p.evaluate(()=>document.querySelector('#modCorps [name="date"]').disabled)===true);
 await p.click('[data-act="fiche-evt"]'); await p.waitForTimeout(300);
 await p.fill('#fevDate','2026-11-12');
 await p.click('[data-act="fiche-add-evt"]'); await p.waitForTimeout(400);
 T('poser un événement date la fiche', await p.evaluate(()=>D.chantiers[0].date)==='2026-11-12',
   await p.evaluate(()=>D.chantiers[0].date));
 /* et la retirer aussi */
 const idEvt=await p.evaluate(()=>D.chantiers[0].evenements[0].id);
 await p.click('[data-evtsup="'+idEvt+'"]'); await p.waitForTimeout(400);
 r=await p.evaluate(()=>({d:D.chantiers[0].date, n:D.chantiers[0].evenements.length,
   planning:chantiersDu(auj()).length}));
 T('retirer le dernier événement la dédate', r.d==='' && r.n===0 && r.planning===0,
   JSON.stringify(r));

 /* --- 5. une activité créée à la main garde sa date du jour -------------- */
 await p.evaluate(()=>{ D.chantiers=[]; vueActive='jour'; rendre();
   document.querySelector('[data-neuf]').click() }); await p.waitForTimeout(400);
 T('la création propose bien aujourd’hui',
   await p.evaluate(()=>document.querySelector('#modCorps [name="date"]').value)
     ===await p.evaluate(()=>auj()));
 await p.fill('#modCorps [name="libelle"]','Visite du jour');
 await p.evaluate(()=>[...document.querySelectorAll('#modPied button')]
   .find(e=>e.textContent.trim()==='Créer').click()); await p.waitForTimeout(400);
 T('  et la crée dans le planning du jour',
   await p.evaluate(()=>chantiersDu(auj()).length)===1);

 /* --- 6. le champ explique ce que « vide » veut dire --------------------- */
 await p.evaluate(()=>{ D.chantiers=[{id:'x5',categorie:'chantier',libelle:'Sans date',
   statut:'',archive:false}]; rendre(); editerChantier('x5') }); await p.waitForTimeout(300);
 /* 3.35.0 : sur une fiche existante la phrase a changé — ce n'est plus la date qui est
    vide, c'est la liste d'événements qui l'est. Le message doit le dire dans ces
    termes, sinon on renvoie l'utilisatrice vers un champ qu'elle ne peut plus saisir. */
 T('le formulaire dit ce que « sans événement » signifie',
   /Aucun événement : le dossier reste hors planning/.test(
     await p.evaluate(()=>document.getElementById('modCorps').textContent)));

 /* --- 6 bis. fusionner une sauvegarde d'avant la 3.35.0 ------------------ */
 /* Régression réelle, trouvée par ce banc : le mode « Fusionner » poussait les
    activités du fichier telles quelles, sans reprise. Une sauvegarde d'avant la
    bascule entrait donc avec des activités datées mais sans événement — absentes
    du planning, et dédatées au premier enregistrement de leur fiche. */
 r=await p.evaluate(()=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   const ancien={version:1,parametres:{},chantiers:[
     {id:'f1',categorie:'chantier',date:'2026-11-18',heure:'09:00',duree:45,
      libelle:'Venu d’une sauvegarde',statut:'',archive:false}
   ],notes:[],appels:[],idees:[],contacts:[]};
   appliquerTexte(JSON.stringify(ancien),'fusionner');
   const c=D.chantiers.find(x=>x.id==='f1');
   return {n:(c.evenements||[]).length, date:c.date,
     planning:chantiersDu('2026-11-18').length};
 });
 T('fusionner reprend les activités datées en événements', r.n===1, JSON.stringify(r));
 T('  la date de référence est posée', r.date==='2026-11-18', r.date);
 T('  et le dossier entre bien au planning de son jour', r.planning===1, ''+r.planning);

 /* --- 7. l'import n'écrit jamais une date absente ------------------------ */
 r=await p.evaluate(()=>{
   const K=catImport(); if(!K) return {saute:true};
   const c={id:'i1',categorie:'chantier',archive:false};
   appliquerImport(c,{ref_technique:'12345678901234'},false);
   return {date:c.date, type:typeof c.date};
 });
 T('une fiche importée porte toujours une date, vide au besoin',
   r.saute || (r.date==='' && r.type==='string'), JSON.stringify(r));

 /* --- 8. le chargement d'un fichier nettoie l'absence -------------------- */
 r=await p.evaluate(()=>{
   const o=JSON.parse(JSON.stringify(vierge()));
   o.chantiers=[{id:'z1',categorie:'chantier',libelle:'Sans clé date'},
                {id:'z2',categorie:'chantier',libelle:'Date illisible',date:'12/03/2026'},
                {id:'z3',categorie:'chantier',libelle:'Bonne date',date:'2026-03-04'}];
   const v=normaliser(o);
   return v.chantiers.map(c=>String(c.date));
 });
 T('au chargement, toute date absente ou illisible devient vide',
   r.join('|')==='||2026-03-04', r.join('|'));

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
