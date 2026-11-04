/* 3.34.0 — la même ligne d'échéance dans les trois écrans qui en listent. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const J=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const JOURS={}; for(let k=-30;k<=30;k++) JOURS[k]=J(k);

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1100}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+''); await p.waitForTimeout(1500);

 const poser=()=>p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[{id:'c1',categorie:'chantier',date:'',libelle:'GMP-MOP',statut:'',archive:false}];
   /* une échue, une à venir : les deux doivent porter les mêmes boutons */
   D.notes=[
     {id:'ret',date:j[-9],heure:'09:00',type:'',chantier_id:'c1',rubrique_id:'',contenu:'',
      duree:0,suite:{texte:'Suivi devis à relancer',echeance:j[-2],fait:false}},
     {id:'ven',date:j[-3],heure:'09:00',type:'',chantier_id:'',rubrique_id:'',contenu:'',
      duree:0,suite:{texte:'Courrier à traiter',echeance:j[1],fait:false}}
   ];
   reportOuvert=null; horizonAttente=0; jourCal=j[1]; moisCal=j[1].slice(0,7)+'-01';
   D.parametres.jours_ouvres=[1,2,3,4,5];
   rendre();
 },{j:JOURS});

 /* Les trois écrans, avec pour chacun l'échéance qu'il affiche. */
 const ECRANS=[['jour','En attente','ret'],['suivant','Prochain jour ouvré','ret'],
               ['calendrier','Calendrier','ven']];

 for(const [vue,nom,cible] of ECRANS){
   await poser();
   await p.evaluate(v=>{vueActive=v; rendre()},vue); await p.waitForTimeout(400);

   const b1=await p.evaluate(id=>{
     const e=document.querySelector('[data-fait="'+id+'"]');
     if(!e) return null;
     const r=e.closest('.note');
     return {fait:!!r.querySelector('[data-fait]'),
       reporter:!!r.querySelector('[data-repon]'),
       note:!!r.querySelector('[data-note]'),
       txt:r.querySelector('.txt').textContent};
   },cible);
   T(`${nom} : la tâche est listée`, !!b1, cible);
   T(`  ${nom} : « Marquer fait »`, b1.fait);
   T(`  ${nom} : « Reporter »`, b1.reporter);
   T(`  ${nom} : « Ouvrir la note »`, b1.note);

   /* le report fonctionne réellement depuis cet écran */
   await p.click(`[data-repon="${cible}"]`); await p.waitForTimeout(350);
   const chips=await p.evaluate(()=>({n:document.querySelectorAll('[data-rep]').length,
     lib:[...document.querySelectorAll('[data-rep]')].map(x=>x.textContent).join(',')}));
   T(`  ${nom} : les raccourcis se déplient`, chips.n===7, chips.lib);
   const avant=await p.evaluate(id=>notePar(id).suite.echeance,cible);
   await p.click(`[data-rep="${cible}"][data-pas="7"]`); await p.waitForTimeout(400);
   const apres=await p.evaluate(id=>({e:notePar(id).suite.echeance,
     plie:document.querySelectorAll('.report').length}),cible);
   T(`  ${nom} : le report s’applique`, apres.e!==avant, avant+' → '+apres.e);
   T(`  ${nom} : et les raccourcis se replient`, apres.plie===0, ''+apres.plie);

   /* « Ouvrir la note » ouvre bien la fiche */
   await poser();
   await p.evaluate(v=>{vueActive=v; rendre()},vue); await p.waitForTimeout(350);
   await p.click(`[data-note="${cible}"]`); await p.waitForTimeout(400);
   T(`  ${nom} : « Ouvrir la note » ouvre la fiche`,
     await p.evaluate(()=>document.getElementById('modale').open===true
       && /Note du/.test(document.getElementById('modTitre').textContent)));
   await p.evaluate(()=>fermerModale()); await p.waitForTimeout(250);
 }

 /* --- l'en-tête s'adapte à l'écran sans perdre l'information ------------- */
 await poser();
 const entetes=await p.evaluate(({j})=>{
   const o={};
   vueActive='jour'; rendre();
   o.attente=document.querySelector('[data-fait="ret"]').closest('.note')
     .querySelector('.h').textContent;
   vueActive='suivant'; rendre();
   o.suivant=document.querySelector('[data-fait="ret"]').closest('.note')
     .querySelector('.h').textContent;
   vueActive='calendrier'; jourCal=j[1]; rendre();
   o.cal=document.querySelector('[data-fait="ven"]').closest('.note')
     .querySelector('.h').textContent;
   return o;
 },{j:JOURS});
 T('En attente dit l’échéance et le retard', /échéance/.test(entetes.attente)
   && /en retard/.test(entetes.attente), entetes.attente);
 T('Prochain jour ouvré aussi', /échéance/.test(entetes.suivant)
   && /en retard/.test(entetes.suivant), entetes.suivant);
 T('le Calendrier ne répète pas la date de sa colonne',
   !/échéance/.test(entetes.cal) && /noté le/.test(entetes.cal), entetes.cal);

 /* --- le rattachement au dossier suit partout ---------------------------- */
 const liens=await p.evaluate(()=>{
   const o={};
   vueActive='jour'; rendre();
   o.attente=!!document.querySelector('[data-fait="ret"]').closest('.note').querySelector('.lien');
   vueActive='suivant'; rendre();
   o.suivant=!!document.querySelector('[data-fait="ret"]').closest('.note').querySelector('.lien');
   return o;
 });
 T('le dossier rattaché apparaît dans « En attente »', liens.attente);
 T('  et maintenant aussi dans « Prochain jour ouvré »', liens.suivant);

 /* --- une seule ligne ouverte à la fois, même en changeant d'écran -------- */
 await poser();
 await p.evaluate(()=>{vueActive='jour'; rendre()}); await p.waitForTimeout(300);
 await p.click('[data-repon="ret"]'); await p.waitForTimeout(300);
 await p.evaluate(()=>{vueActive='suivant'; rendre()}); await p.waitForTimeout(350);
 T('un report ouvert reste ouvert en changeant d’écran',
   await p.evaluate(()=>document.querySelectorAll('.report').length)===1);
 await p.click('[data-repoff]'); await p.waitForTimeout(300);
 T('  et se referme', await p.evaluate(()=>document.querySelectorAll('.report').length)===0);

 /* --- mise en page -------------------------------------------------------- */
 for(const [w,hh] of [[1280,1100],[390,900]]){
   await p.setViewportSize({width:w,height:hh});
   await poser();
   await p.evaluate(()=>{vueActive='calendrier'; rendre()}); await p.waitForTimeout(350);
   await p.click('[data-repon="ven"]'); await p.waitForTimeout(350);
   const m=await p.evaluate(()=>{
     const r=document.querySelector('.report'), n=r.closest('.note');
     return {deb:r.scrollWidth>r.clientWidth+1,
       dedans:r.getBoundingClientRect().right<=n.getBoundingClientRect().right+1,
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : les raccourcis tiennent dans la colonne`, !m.deb && m.dedans);
   T(`${w}px : pas de défilement latéral`, !m.page);
   await p.screenshot({path:'/tmp/ech_'+w+'.png',fullPage:w===390});
 }

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
