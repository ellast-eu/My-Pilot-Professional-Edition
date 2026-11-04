/* 3.22.0 — « Action terminée » enchaîne : la suite à donner se saisit sur place.
   Et le nom par défaut, devenu long, ne doit casser ni l'en-tête ni la fenêtre. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:900}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+''); await p.waitForTimeout(1500);

 /* --- 0. le nom par défaut --------------------------------------------- */
 const nd=await p.evaluate(()=>NOM_DEFAUT);
 T('NOM_DEFAUT complet', nd==='My Pilot Professional Edition', nd);

 /* un jeu minimal : un dossier, trois notes avec suite ouverte */
 const poser=async()=>p.evaluate(()=>{
   fichierCharge=true;
   D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[{id:'c1',categorie:'chantier',libelle:'Poste des Écoles',
     commune:'SAINT-MARTIN',reference:'2026-076',statut:'',archive:false}];
   const n=(id,t)=>({id:id,date:auj(),heure:'09:00',type:'Administratif',
     chantier_id:'c1',rubrique_id:'',chantier_ref:'2026-076',contenu:'',duree:0,
     suite:{texte:t,echeance:auj(),fait:false}});
   D.notes=[n('n1','Préparer compte rendu'),n('n2','Appeler le maire'),n('n3','Transmettre le dossier')];
   rendre();
 });
 await poser();

 /* --- 1. la fenêtre porte bien les deux nouveaux champs ----------------- */
 await p.evaluate(()=>cloreSuite('n1',false)); await p.waitForTimeout(300);
 const f=await p.evaluate(()=>({
   ouverte:document.getElementById('modale').open,
   titre:document.getElementById('modTitre').textContent,
   txt:!!document.getElementById('suiteSuivTxt'),
   ech:!!document.getElementById('suiteSuivEch'),
   typeEch:(document.getElementById('suiteSuivEch')||{}).type,
   note:!!document.getElementById('suiteNote'),
   corps:document.getElementById('modCorps').textContent}));
 T('la fenêtre s’ouvre', f.ouverte && f.titre==='Action terminée', f.titre);
 T('le champ « Ce que vous avez fait » est toujours là', f.note);
 T('champ de suite suivante présent', f.txt);
 T('champ d’échéance présent et de type date', f.ech && f.typeEch==='date', f.typeEch);
 T('un libellé « Et ensuite »', /Et ensuite/.test(f.corps));
 T('l’indication que c’est facultatif', /Laissez vide si l’action est close\./.test(f.corps), f.corps.slice(-80));
 T('la suite en cours reste rappelée en tête', /Préparer compte rendu/.test(f.corps));
 T('les deux champs sont vides à l’ouverture',
   await p.evaluate(()=>!document.getElementById('suiteSuivTxt').value
                     && !document.getElementById('suiteSuivEch').value));

 /* --- 2. note + suite suivante ----------------------------------------- */
 const dem=new Date(Date.now()+86400000).toISOString().slice(0,10);
 await p.fill('#suiteNote','Compte rendu rédigé et mis à la signature');
 await p.fill('#suiteSuivTxt','Relancer si pas de retour');
 await p.fill('#suiteSuivEch',dem);
 await p.evaluate(()=>validerSuite(true)); await p.waitForTimeout(350);
 let r=await p.evaluate(()=>({
   fermee:!document.getElementById('modale').open,
   soldee:(D.notes.find(x=>x.id==='n1')||{}).suite.fait,
   n:D.notes.length,
   derniere:D.notes[D.notes.length-1]}));
 T('la fenêtre se ferme', r.fermee);
 T('l’action d’origine est soldée', r.soldee===true);
 T('une note a été créée', r.n===4, ''+r.n);
 T('la note porte le texte saisi', r.derniere.contenu==='Compte rendu rédigé et mis à la signature');
 T('la note porte la suite suivante', !!r.derniere.suite && r.derniere.suite.texte==='Relancer si pas de retour',
   JSON.stringify(r.derniere.suite));
 T('l’échéance est reprise', r.derniere.suite.echeance===dem, r.derniere.suite.echeance);
 T('la suite suivante est ouverte', r.derniere.suite.fait===false);
 T('le rattachement est hérité', r.derniere.chantier_id==='c1' && r.derniere.chantier_ref==='2026-076',
   r.derniere.chantier_id+'/'+r.derniere.chantier_ref);

 /* --- 3. « Sans note » mais une suite quand même ------------------------ */
 await p.evaluate(()=>cloreSuite('n2',false)); await p.waitForTimeout(300);
 await p.fill('#suiteSuivTxt','Rappeler la mairie lundi');
 await p.evaluate(()=>validerSuite(false)); await p.waitForTimeout(350);
 r=await p.evaluate(()=>({soldee:(D.notes.find(x=>x.id==='n2')||{}).suite.fait,
   n:D.notes.length, derniere:D.notes[D.notes.length-1]}));
 T('« Sans note » solde quand même l’action', r.soldee===true);
 T('« Sans note » + suite : la suite est tout de même enregistrée', r.n===5 && !!r.derniere.suite,
   ''+r.n);
 T('  la note support reste vide', r.derniere.contenu==='', JSON.stringify(r.derniere.contenu));
 T('  sans durée', r.derniere.duree===0, ''+r.derniere.duree);
 T('  sans échéance si on n’en met pas', r.derniere.suite.echeance==='', r.derniere.suite.echeance);

 /* --- 4. ni note ni suite : rien ne s'ajoute ---------------------------- */
 await p.evaluate(()=>cloreSuite('n3',false)); await p.waitForTimeout(300);
 await p.evaluate(()=>validerSuite(false)); await p.waitForTimeout(350);
 r=await p.evaluate(()=>({soldee:(D.notes.find(x=>x.id==='n3')||{}).suite.fait,n:D.notes.length}));
 T('sans rien saisir, l’action est soldée', r.soldee===true);
 T('  et aucune note n’est créée', r.n===5, ''+r.n);

 /* --- 5. les suites créées retombent dans « En attente » ---------------- */
 const att=await p.evaluate(()=>suitesOuvertes().map(n=>n.suite.texte));
 T('les deux suites créées sont en attente',
   att.length===2 && att.indexOf('Relancer si pas de retour')>=0
   && att.indexOf('Rappeler la mairie lundi')>=0, att.join(' | '));

 /* --- 6. on peut enchaîner sur la suite qu'on vient de créer ------------ */
 const idNouv=await p.evaluate(()=>D.notes.filter(n=>n.suite&&!n.suite.fait)[0].id);
 await p.evaluate(i=>cloreSuite(i,false),idNouv); await p.waitForTimeout(300);
 T('la nouvelle suite se clôt à son tour',
   await p.evaluate(()=>!!document.getElementById('suiteSuivTxt')));
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(200);

 /* --- 7. mise en page ---------------------------------------------------*/
 for(const [w,h] of [[1280,900],[390,780]]){
   await p.setViewportSize({width:w,height:h});
   await p.evaluate(()=>cloreSuite('n1',false)); await p.waitForTimeout(350);
   const m=await p.evaluate(()=>{
     const d=document.getElementById('modale'),c=document.getElementById('modCorps');
     const r=d.getBoundingClientRect();
     return {deb:c.scrollWidth>c.clientWidth+1, hors:r.left< -1||r.right>innerWidth+1,
       haut:r.height, dansEcran:r.height<=innerHeight};
   });
   T(`${w}px : pas de débordement horizontal`, !m.deb);
   T(`${w}px : la fenêtre reste dans l’écran`, !m.hors && m.dansEcran,
     Math.round(m.haut)+'px de haut pour '+h);
   await p.screenshot({path:'/tmp/suite_'+w+'.png'});
   await p.evaluate(()=>fermerModale()); await p.waitForTimeout(200);
 }

 /* --- 8. le nom long dans l'en-tête et la fenêtre À propos --------------*/
 for(const [w,h] of [[1280,900],[390,780]]){
   await p.setViewportSize({width:w,height:h}); await p.waitForTimeout(350);
   const e=await p.evaluate(()=>{
     const m=document.getElementById('marque'),r=m.getBoundingClientRect();
     return {txt:m.textContent, hors:r.right>innerWidth+1,
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : la marque affiche le nom complet`, e.txt.replace(/·/g,' ').replace(/\s+/g,' ').trim()
     ==='My Pilot Professional Edition', e.txt);
   T(`${w}px : la marque ne sort pas de l’écran`, !e.hors);
   T(`${w}px : la page ne défile pas latéralement`, !e.page);
 }
 await p.setViewportSize({width:1280,height:900});
 await p.evaluate(()=>ouvrirApropos()); await p.waitForTimeout(500);
 const ap=await p.evaluate(()=>({
   corps:document.getElementById('modCorps').textContent,
   banniere:(document.getElementById('apNom')||{}).textContent||'',
   deb:document.getElementById('modCorps').scrollWidth>document.getElementById('modCorps').clientWidth+1}));
 T('À propos : le nom complet et la version', ap.corps.indexOf(nd+' v'+(await p.evaluate(()=>APP_VERSION)))>=0,
   (ap.corps.match(/My Pilot[^\n]{0,40}/)||[''])[0]);
 T('À propos : la bannière anime le nom complet',
   ap.banniere.replace(/\s+/g,' ').trim().length>0 && !ap.deb, JSON.stringify(ap.banniere));
 T('À propos : pas de débordement', !ap.deb);
 await p.screenshot({path:'/tmp/apropos_long.png'});

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
