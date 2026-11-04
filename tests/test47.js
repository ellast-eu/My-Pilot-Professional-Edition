/* 3.29.0 — la vue Activités s'ouvre sur tout, et une note ou une tâche saisie
   dans une fiche ne se perd plus par aucune sortie. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const J=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:950}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 let confirmations=0, reponse=true;
 p.on('dialog',d=>{ if(d.type()==='confirm'){ confirmations++; reponse?d.accept():d.dismiss() } else d.accept() });
 await p.goto(''+APP+''); await p.waitForTimeout(1500);

 /* --- 1. le filtre de période ------------------------------------------- */
 T('le filtre s’ouvre sur « Tous »',
   await p.evaluate(()=>filtreCh.periode)==='tous',
   await p.evaluate(()=>filtreCh.periode));

 const poser=()=>p.evaluate(({hier,dem})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   const a=(id,d,lib)=>({id:id,categorie:'chantier',date:d,heure:'09:00',libelle:lib,
     commune:'SAINT-MARTIN',reference:'R-'+id,statut:'',archive:false});
   D.chantiers=[a('p1',hier,'Dossier passé'),a('f1',dem,'Dossier à venir'),
                a('s1','','Dossier sans date')];
   D.notes=[]; vueActive='chantiers'; filtreCh.periode='tous'; rendre();
 },{hier:J(-5),dem:J(5)});
 await poser(); await p.waitForTimeout(400);
 const vus=await p.evaluate(()=>({
   n:document.querySelectorAll('[data-chantier]').length,
   sel:(document.getElementById('fperiode')||{}).value}));
 T('les trois périodes sont listées d’emblée', vus.n===3, ''+vus.n);
 T('  et la liste déroulante le montre', vus.sel==='tous', vus.sel);
 T('le filtre « À venir » fonctionne toujours',
   await p.evaluate(()=>{ filtreCh.periode='futur'; rendre();
     return document.querySelectorAll('[data-chantier]').length })===1);
 await p.evaluate(()=>{ filtreCh.periode='tous'; rendre() }); await p.waitForTimeout(300);

 /* --- 2. une note saisie et non ajoutée ---------------------------------- */
 const ouvrirFiche=async()=>{ await p.evaluate(()=>editerChantier('p1')); await p.waitForTimeout(350) };
 await ouvrirFiche();
 await p.click('[data-act="fiche-note"]'); await p.waitForTimeout(250);
 await p.fill('#fnTxt','Courrier envoyé au propriétaire');
 const avant=await p.evaluate(()=>D.notes.length);

 confirmations=0;
 await p.evaluate(()=>[...document.querySelectorAll('#modPied button')]
   .find(e=>e.textContent.trim()==='Enregistrer').click()); await p.waitForTimeout(400);
 let e=await p.evaluate(()=>({
   ouverte:document.getElementById('modale').open,
   txt:(document.getElementById('fnTxt')||{}).value,
   marque:(document.getElementById('fnTxt')||{classList:{contains:()=>false}}).classList.contains('manque'),
   focus:document.activeElement.id,
   notes:D.notes.length}));
 T('« Enregistrer » est bloqué', e.ouverte===true);
 T('  aucune confirmation n’est demandée : c’est un refus', confirmations===0, ''+confirmations);
 T('  le texte est conservé', e.txt==='Courrier envoyé au propriétaire', e.txt);
 T('  le champ est marqué en défaut', e.marque===true);
 T('  et reçoit le focus', e.focus==='fnTxt', e.focus);
 T('  rien n’a été écrit', e.notes===avant, e.notes+'/'+avant);

 /* taper à nouveau efface la marque */
 await p.fill('#fnTxt','Courrier envoyé au propriétaire, AR demandé');
 await p.waitForTimeout(200);
 T('la marque disparaît dès qu’on corrige',
   await p.evaluate(()=>!document.getElementById('fnTxt').classList.contains('manque')));

 /* vider le champ débloque */
 await p.fill('#fnTxt','   ');
 await p.evaluate(()=>[...document.querySelectorAll('#modPied button')]
   .find(e=>e.textContent.trim()==='Enregistrer').click()); await p.waitForTimeout(450);
 T('champ vidé : l’enregistrement passe',
   await p.evaluate(()=>document.getElementById('modale').open===false));

 /* --- 3. ajouter, puis enregistrer --------------------------------------- */
 await ouvrirFiche();
 await p.click('[data-act="fiche-note"]'); await p.waitForTimeout(250);
 await p.fill('#fnTxt','Visite effectuée');
 await p.click('[data-act="fiche-add-note"]'); await p.waitForTimeout(500);
 T('la note ajoutée est bien écrite',
   await p.evaluate(()=>D.notes.length)===avant+1);
 T('  et la fiche se rouvre sans saisie en attente',
   await p.evaluate(()=>!document.getElementById('fnTxt')));
 await p.evaluate(()=>[...document.querySelectorAll('#modPied button')]
   .find(e=>e.textContent.trim()==='Enregistrer').click()); await p.waitForTimeout(400);
 T('  l’enregistrement passe ensuite',
   await p.evaluate(()=>document.getElementById('modale').open===false));

 /* --- 4. une tâche se comporte pareil ------------------------------------ */
 await ouvrirFiche();
 await p.click('[data-act="fiche-tache"]'); await p.waitForTimeout(250);
 await p.fill('#ftTxt','Faire instruction du dossier');
 await p.evaluate(()=>[...document.querySelectorAll('#modPied button')]
   .find(e=>e.textContent.trim()==='Enregistrer').click()); await p.waitForTimeout(400);
 e=await p.evaluate(()=>({ouverte:document.getElementById('modale').open,
   marque:document.getElementById('ftTxt').classList.contains('manque')}));
 T('une tâche non ajoutée bloque aussi', e.ouverte===true);
 T('  et son champ est marqué', e.marque===true);

 /* --- 5. les sorties volontaires demandent confirmation ------------------ */
 confirmations=0; reponse=false;
 /* par le libellé : l'indice des boutons dépend de l'état de la fiche */
 const parTexte=async t=>p.evaluate(x=>{
   const b=[...document.querySelectorAll('#modPied button')].find(e=>e.textContent.trim()===x);
   if(!b) throw new Error('bouton introuvable : '+x);
   b.click();
 },t);
 await parTexte('Fermer'); await p.waitForTimeout(400);
 T('« Fermer » demande confirmation', confirmations===1, ''+confirmations);
 T('  refuser garde la fiche ouverte',
   await p.evaluate(()=>document.getElementById('modale').open===true));
 T('  et le texte',
   await p.evaluate(()=>document.getElementById('ftTxt').value)==='Faire instruction du dossier');

 confirmations=0;
 await p.click('#modX'); await p.waitForTimeout(400);
 T('la croix demande confirmation', confirmations===1, ''+confirmations);
 T('  et refuser la garde ouverte',
   await p.evaluate(()=>document.getElementById('modale').open===true));

 confirmations=0;
 await p.keyboard.press('Escape'); await p.waitForTimeout(400);
 T('Échap demande confirmation', confirmations===1, ''+confirmations);
 T('  et refuser la garde ouverte',
   await p.evaluate(()=>document.getElementById('modale').open===true));

 reponse=true; confirmations=0;
 await p.keyboard.press('Escape'); await p.waitForTimeout(400);
 T('accepter ferme bien', confirmations===1
   && await p.evaluate(()=>document.getElementById('modale').open===false));

 /* --- 6. aucune gêne quand il n'y a rien en attente ----------------------- */
 confirmations=0;
 await ouvrirFiche();
 await p.click('#modX'); await p.waitForTimeout(350);
 T('sans saisie, la croix ne demande rien', confirmations===0
   && await p.evaluate(()=>document.getElementById('modale').open===false), ''+confirmations);
 await ouvrirFiche();
 await p.keyboard.press('Escape'); await p.waitForTimeout(350);
 T('sans saisie, Échap ne demande rien', confirmations===0
   && await p.evaluate(()=>document.getElementById('modale').open===false), ''+confirmations);

 /* la garde ne doit gêner aucune autre fenêtre */
 confirmations=0;
 await p.evaluate(()=>ouvrirPause()); await p.waitForTimeout(350);
 await p.keyboard.press('Escape'); await p.waitForTimeout(350);
 T('la fenêtre Pause se ferme sans question', confirmations===0
   && await p.evaluate(()=>document.getElementById('modale').open===false), ''+confirmations);

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
