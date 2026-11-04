/* 3.31.0 — reporter une tâche depuis « En attente », et le trait des comptes rendus. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const J=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const JOURS={}; for(let k=-40;k<=120;k++) JOURS[k]=J(k);

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+''); await p.waitForTimeout(1500);

 /* --- 1. le trait du compte rendu ---------------------------------------- */
 const tr=await p.evaluate(()=>{
   const l=s=>{const t=crTitre(s).split('\n')[1]; return {n:t.length, pur:/^—+$/.test(t)}};
   return {ref:l('Compte rendu d’appel — lundi 26 octobre 2026 à 09:39 · 7 min'),
           court:l('Note'), pile:l('x'.repeat(38)), cap:CR_TRAIT};
 });
 T('le trait est plafonné à 38', tr.cap===38, ''+tr.cap);
 T('  un titre long donne 38 cadratins', tr.ref.n===38 && tr.ref.pur, JSON.stringify(tr.ref));
 T('  un titre court garde la longueur de son titre', tr.court.n===4, ''+tr.court.n);
 T('  et pile 38 reste 38', tr.pile.n===38, ''+tr.pile.n);
 const vrai=await p.evaluate(()=>{
   D=vierge(); D.parametres.categories=modeleCategories();
   D.appels=[{id:'a1',date:auj(),heure:'09:39',qui:'M. HENARD François',entreprise:'',
     tel:'0642106814',motif:'Protection de chantier (Demande)',objet:'Question sur RAT',
     commune:'CREST',duree:7,traite:true,suite:{texte:'Poser compte rendu',fait:true}}];
   return crAppel(D.appels[0]).split('\n');
 });
 T('dans un vrai compte rendu, le trait fait 38',
   vrai[1].length===38 && /^—+$/.test(vrai[1]), vrai[1].length+' : '+vrai[1]);

 /* --- 2. le bouton Reporter ----------------------------------------------- */
 const poser=()=>p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.parametres.jours_ouvres=[1,2,3,4,5];
   D.chantiers=[{id:'c1',categorie:'chantier',date:'',libelle:'PROD HTA LAMBRUNY',
     statut:'',archive:false}];
   D.notes=[
     {id:'retard',date:j[-5],heure:'09:00',type:'',chantier_id:'c1',rubrique_id:'',
      contenu:'',duree:0,suite:{texte:'Faire visite enquête',echeance:j[-2],fait:false}},
     {id:'avenir',date:j[0],heure:'09:00',type:'',chantier_id:'',rubrique_id:'',
      contenu:'',duree:0,suite:{texte:'Relancer plus tard',echeance:j[10],fait:false}},
     {id:'sansech',date:j[0],heure:'09:00',type:'',chantier_id:'',rubrique_id:'',
      contenu:'',duree:0,suite:{texte:'Sans échéance',echeance:'',fait:false}}
   ];
   reportOuvert=null; horizonAttente=0; vueActive='jour'; rendre();
 },{j:JOURS});
 await poser(); await p.waitForTimeout(400);

 let v=await p.evaluate(()=>({
   boutons:document.querySelectorAll('[data-repon]').length,
   chips:document.querySelectorAll('[data-rep]').length,
   fait:document.querySelectorAll('[data-fait]').length}));
 T('chaque tâche porte un bouton Reporter', v.boutons===3, ''+v.boutons);
 T('  les raccourcis restent repliés', v.chips===0, ''+v.chips);
 T('  « Marquer fait » est toujours là', v.fait===3, ''+v.fait);

 await p.click('[data-repon="retard"]'); await p.waitForTimeout(350);
 v=await p.evaluate(()=>{
   const c=[...document.querySelectorAll('[data-rep]')];
   return {n:c.length, lib:c.map(x=>x.textContent).join(','),
     titres:c.slice(0,6).map(x=>x.title),
     autresOuverts:document.querySelectorAll('.report').length,
     boutonCache:document.querySelectorAll('[data-repon="retard"]').length,
     annuler:!!document.querySelector('[data-repoff]')};
 });
 T('cliquer déplie les raccourcis', v.n===7, ''+v.n);
 T('  dans l’ordre demandé', v.lib==='1J,2J,5J,1S,2S,1M,Autre…', v.lib);
 T('  sur cette tâche seulement', v.autresOuverts===1, ''+v.autresOuverts);
 T('  le bouton Reporter laisse la place', v.boutonCache===0);
 T('  et on peut refermer', v.annuler===true);
 T('  chaque raccourci annonce sa date', v.titres.every(x=>x && x.length>3), v.titres.join(' | '));

 /* --- 3. d'où part le report ---------------------------------------------- */
 const calc=await p.evaluate(({j})=>{
   const r=notePar('retard').suite, a=notePar('avenir').suite, s=notePar('sansech').suite;
   return {baseRetard:baseReport(r), baseAvenir:baseReport(a), baseSans:baseReport(s),
     auj:auj(), ech:a.echeance};
 },{j:JOURS});
 T('une tâche en retard repart d’aujourd’hui', calc.baseRetard===calc.auj,
   calc.baseRetard+' / '+calc.auj);
 T('  une tâche à venir repart de son échéance', calc.baseAvenir===calc.ech,
   calc.baseAvenir+' / '+calc.ech);
 T('  une tâche sans échéance repart d’aujourd’hui', calc.baseSans===calc.auj);

 /* --- 4. le calcul des dates ---------------------------------------------- */
 /* Ce bloc ancrait ses attentes sur « lundi 02/11 » en dur. baseReport() ignore
    délibérément une échéance déjà passée — elle repart d'aujourd'hui — si bien que
    le banc n'a tenu que le jour où 02/11 était le jour même : le lendemain, tout
    glissait d'un jour. On prend désormais le prochain lundi STRICTEMENT à venir, et
    on calcule les attentes ici, sans réemprunter dateReport(). */
 const lundi=(()=>{const d=new Date();
   do{ d.setDate(d.getDate()+1) }while(d.getDay()!==1);
   return d.toISOString().slice(0,10)})();
 const plus=(iso,n)=>{const d=new Date(iso+'T12:00:00');
   d.setDate(d.getDate()+n); return d.toISOString().slice(0,10)};
 const plusMois=iso=>{const d=new Date(iso+'T12:00:00');
   d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,10)};
 const d=await p.evaluate(({base})=>{
   const faux={echeance:base};
   const o={};
   [['1',1],['2',2],['5',5],['7',7],['14',14],['mois','mois']].forEach(([k,pas])=>{
     o[k]=dateReport(faux,pas);
   });
   return {o:o, base:baseReport(faux), auj:auj()};
 },{base:lundi});
 T('le report part bien de l’échéance à venir, pas d’aujourd’hui',
   d.base===lundi, d.base+' / attendu '+lundi);
 /* On vérifie la RÈGLE, pas un calendrier : un pas tombant un jour ouvré est pris tel
    quel ; sinon il glisse, et le résultat est toujours un jour ouvré. Écrire des dates
    en dur ne marcherait pas — le 11 novembre est férié, et les fériés bougent. */
 const brut={'1':plus(lundi,1),'2':plus(lundi,2),'5':plus(lundi,5),
   '7':plus(lundi,7),'14':plus(lundi,14),'mois':plusMois(lundi)};
 const ouvre=await p.evaluate(({b})=>{
   const o={}; Object.keys(b).forEach(k=>{ o[k]=motifNonOuvre(b[k])||'' }); return o;
 },{b:brut});
 Object.keys(brut).forEach(k=>{
   const chome=ouvre[k], r=d.o[k];
   T(`  +${k} depuis le lundi ${lundi} : ${chome?'glisse ('+chome+')':'pris tel quel'}`,
     chome ? (r.date!==brut[k] && r.glisse===chome) : (r.date===brut[k] && r.glisse===''),
     JSON.stringify(r)+' pour '+brut[k]);
 });
 const toujoursOuvre=await p.evaluate(({dates})=>
   dates.every(x=>!motifNonOuvre(x)), {dates:Object.keys(d.o).map(k=>d.o[k].date)});
 T('  aucun report ne dépose une tâche un jour chômé', toujoursOuvre,
   Object.keys(d.o).map(k=>k+':'+d.o[k].date).join(' '));
 T('  +5J depuis un lundi tombe un samedi', ouvre['5']==='samedi', ouvre['5']);
 T('  et glisse au jour ouvré suivant, pas au précédent', d.o['5'].date>brut['5'],
   d.o['5'].date+' > '+brut['5']);

 /* --- 5. le report agit --------------------------------------------------- */
 const avant=await p.evaluate(()=>notePar('retard').suite.echeance);
 await p.click('[data-rep="retard"][data-pas="5"]'); await p.waitForTimeout(450);
 const apres=await p.evaluate(()=>({
   ech:notePar('retard').suite.echeance,
   plie:document.querySelectorAll('.report').length,
   sale:sale===true}));
 T('le report déplace l’échéance', apres.ech!==avant && apres.ech>=await p.evaluate(()=>auj()),
   avant+' → '+apres.ech);
 T('  les raccourcis se replient', apres.plie===0, ''+apres.plie);
 T('  et le fichier est marqué à enregistrer', apres.sale===true);
 T('  la tâche reste ouverte', await p.evaluate(()=>notePar('retard').suite.fait===false));

 /* --- 6. poser une échéance là où il n'y en avait pas ---------------------- */
 await p.click('[data-repon="sansech"]'); await p.waitForTimeout(300);
 await p.click('[data-rep="sansech"][data-pas="7"]'); await p.waitForTimeout(400);
 T('une tâche sans échéance en reçoit une',
   await p.evaluate(()=>!!notePar('sansech').suite.echeance),
   await p.evaluate(()=>notePar('sansech').suite.echeance));

 /* --- 7. « Autre… » ouvre un champ date ----------------------------------- */
 await p.click('[data-repon="avenir"]'); await p.waitForTimeout(300);
 await p.click('[data-rep="avenir"][data-pas="autre"]'); await p.waitForTimeout(400);
 let dlg=await p.evaluate(()=>{
   const d=document.querySelector('dialog.saisie-val');
   return d?{titre:d.querySelector('h3').textContent,
     type:d.querySelector('input').type, val:d.querySelector('input').value}:null;
 });
 T('« Autre… » ouvre une fenêtre', !!dlg && /Reporter au/.test(dlg.titre), dlg&&dlg.titre);
 T('  avec un vrai champ date', dlg.type==='date', dlg.type);
 T('  pré-rempli sur l’échéance courante', dlg.val===JOURS[10], dlg.val);
 await p.fill('dialog.saisie-val input','2026-12-24');
 await p.evaluate(()=>document.querySelector('dialog.saisie-val [data-s="oui"]').click());
 await p.waitForTimeout(400);
 T('  valider applique la date',
   await p.evaluate(()=>notePar('avenir').suite.echeance)==='2026-12-24');
 T('  et referme tout',
   await p.evaluate(()=>!document.querySelector('dialog.saisie-val')
     && document.querySelectorAll('.report').length===0));

 /* une date invalide est refusée */
 await p.click('[data-repon="avenir"]'); await p.waitForTimeout(250);
 await p.click('[data-rep="avenir"][data-pas="autre"]'); await p.waitForTimeout(350);
 await p.evaluate(()=>{document.querySelector('dialog.saisie-val input').value='';
   document.querySelector('dialog.saisie-val [data-s="oui"]').click()});
 await p.waitForTimeout(300);
 T('une date vide est refusée',
   await p.evaluate(()=>!!document.querySelector('dialog.saisie-val')));
 await p.evaluate(()=>document.querySelector('dialog.saisie-val [data-s="non"]').click());
 await p.waitForTimeout(300);
 T('  annuler ne change rien',
   await p.evaluate(()=>notePar('avenir').suite.echeance)==='2026-12-24');

 /* --- 8. mise en page ------------------------------------------------------ */
 await poser(); await p.waitForTimeout(350);
 await p.click('[data-repon="retard"]'); await p.waitForTimeout(300);
 for(const [w,hh] of [[1280,1000],[760,900],[390,844]]){
   await p.setViewportSize({width:w,height:hh}); await p.waitForTimeout(350);
   const m=await p.evaluate(()=>{
     const r=document.querySelector('.report'), b=r.getBoundingClientRect();
     const n=r.closest('.note').getBoundingClientRect();
     return {deb:r.scrollWidth>r.clientWidth+1,
       dedans:b.left>=n.left-1 && b.right<=n.right+1,
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : les raccourcis ne débordent pas`, !m.deb && m.dedans);
   T(`${w}px : pas de défilement latéral`, !m.page);
   await p.screenshot({path:'/tmp/report_'+w+'.png',clip:{x:0,y:0,width:w,height:Math.min(700,hh)}});
 }

 T('l’aide décrit le report',
   await p.evaluate(()=>AIDE.some(r=>/Reporter\b/.test(r.html) && /jour ouvré suivant/.test(r.html))));
 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
