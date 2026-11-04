/* 3.37.0 — une seule convention d'ajout dans la fiche d'activité.
   Avant : « + Événement » dans l'en-tête de sa section mais rejeté à droite,
   « + Note » / « + Tâche » dans une bande à eux posée AVANT le titre « Notes liées »,
   et ce titre absent quand l'activité n'avait aucune note — les deux boutons
   flottaient alors sans rien pour les rattacher. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const J=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(APP); await p.waitForTimeout(1500);

 const poser=()=>p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[
     {id:'plein',categorie:'chantier',date:j[-42],heure:'14:00',duree:60,
      libelle:'Avec notes',reference:'2026-080',statut:'',archive:false},
     {id:'vide',categorie:'chantier',libelle:'Sans note',statut:'',archive:false}];
   D.notes=[{id:'n1',date:j[-3],heure:'09:00',type:'',chantier_id:'plein',
     rubrique_id:'',contenu:'Un échange',duree:10,suite:null},
     {id:'n2',date:j[-5],heure:'09:00',type:'',chantier_id:'plein',
     rubrique_id:'',contenu:'Un autre',duree:10,suite:null}];
   D=normaliser(D); vueActive='chantiers'; rendre();
 },{j:{'-42':J(-42),'-3':J(-3),'-5':J(-5)}});

 /* Les deux en-têtes doivent avoir la MÊME forme : titre, puis boutons d'ajout. */
 const lire=id=>p.evaluate(t=>{
   const m=document.getElementById('modCorps');
   const h=[...m.querySelectorAll('h3')].find(x=>new RegExp(t).test(x.textContent));
   if(!h) return {absent:true};
   const ligne=h.parentNode;
   const btns=[...ligne.querySelectorAll('button')].map(x=>x.textContent.trim());
   const rh=h.getBoundingClientRect(), rl=ligne.getBoundingClientRect();
   const rb=btns.length?ligne.querySelector('button').getBoundingClientRect():null;
   return {titre:h.textContent.trim(), boutons:btns,
     memeLigne:Math.abs(rh.top-(rb?rb.top:rh.top))<24,
     /* « à gauche » = le premier bouton suit le titre de près, il n'est pas
        renvoyé à l'autre bout de la fenêtre */
     ecart: rb? Math.round(rb.left-rh.right) : null,
     restant: rb? Math.round(rl.right-rb.right) : null};
 },id);

 await poser(); await p.waitForTimeout(350);
 await p.evaluate(()=>editerChantier('plein')); await p.waitForTimeout(450);

 const ev=await lire('Événements');
 T('l’en-tête Événements porte son bouton', !ev.absent && ev.boutons.join(',')==='+ Événement',
   JSON.stringify(ev.boutons));
 T('  sur la même ligne que le titre', ev.memeLigne===true);
 T('  collé au titre, pas rejeté à droite', ev.ecart<60 && ev.restant>200,
   'écart '+ev.ecart+'px, reste '+ev.restant+'px à droite');

 const nl=await lire('Notes liées');
 T('l’en-tête Notes liées porte ses deux boutons',
   !nl.absent && nl.boutons.join(',')==='+ Note,+ Tâche', JSON.stringify(nl.boutons));
 T('  sur la même ligne que le titre', nl.memeLigne===true);
 T('  collés au titre eux aussi', nl.ecart<60 && nl.restant>200,
   'écart '+nl.ecart+'px, reste '+nl.restant+'px à droite');
 T('  et le titre compte les notes', /\(2\)/.test(nl.titre), nl.titre);

 /* La même forme des deux côtés : c'est tout l'objet de la version. */
 T('les deux sections suivent la même convention',
   Math.abs(ev.ecart-nl.ecart)<24, 'Événements '+ev.ecart+'px · Notes '+nl.ecart+'px');

 /* Plus de bande flottante : les boutons d'ajout vivent dans un en-tête, nulle part ailleurs. */
 const bande=await p.evaluate(()=>{
   const m=document.getElementById('modCorps');
   return [...m.querySelectorAll('[data-act="fiche-note"],[data-act="fiche-tache"],[data-act="fiche-evt"]')]
     .map(b=>{
       const l=b.closest('.ligne');
       return {b:b.textContent.trim(), dansEntete: !!(l && l.querySelector('h3'))};
     });
 });
 T('aucun bouton d’ajout ne flotte hors d’un en-tête',
   bande.length===3 && bande.every(x=>x.dansEntete), JSON.stringify(bande));

 /* L'ordre de lecture : Événements, puis Notes liées, et les notes après leur titre. */
 const ordre=await p.evaluate(()=>{
   const m=document.getElementById('modCorps');
   const t=[...m.querySelectorAll('h3')].map(x=>x.textContent.trim());
   const h3=[...m.querySelectorAll('h3')].find(x=>/Notes liées/.test(x.textContent));
   const n1=m.querySelector('div.note[data-note="n1"]');
   return {titres:t,
     notesApresTitre: h3 && n1 ? (h3.getBoundingClientRect().top < n1.getBoundingClientRect().top) : null};
 });
 T('Événements vient avant Notes liées',
   ordre.titres.findIndex(x=>/Événements/.test(x)) < ordre.titres.findIndex(x=>/Notes liées/.test(x)),
   ordre.titres.join(' | '));
 T('  et les notes suivent leur titre', ordre.notesApresTitre===true);

 /* Les boutons marchent toujours, et le formulaire s'ouvre au bon endroit. */
 await p.click('[data-act="fiche-note"]'); await p.waitForTimeout(350);
 T('« + Note » ouvre son formulaire', await p.evaluate(()=>!!document.getElementById('fnTxt')));
 T('  juste sous l’en-tête qui le porte', await p.evaluate(()=>{
   const f=document.getElementById('fnTxt');
   const h=[...document.querySelectorAll('#modCorps h3')].find(x=>/Notes liées/.test(x.textContent));
   const n=document.querySelector('#modCorps div.note[data-note="n1"]');
   return h.getBoundingClientRect().bottom <= f.getBoundingClientRect().top+1
     && f.getBoundingClientRect().top < n.getBoundingClientRect().top;
 }));
 await p.click('[data-act="fiche-evt"]'); await p.waitForTimeout(350);
 T('« + Événement » ouvre le sien', await p.evaluate(()=>!!document.getElementById('fevDate')));
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(250);

 /* --- une activité sans aucune note -------------------------------------- */
 await p.evaluate(()=>editerChantier('vide')); await p.waitForTimeout(450);
 const v=await lire('Notes liées');
 T('sans aucune note, le titre est quand même là', !v.absent, JSON.stringify(v));
 T('  il annonce zéro', /\(0\)/.test(v.titre), v.titre);
 T('  et porte les deux boutons', v.boutons.join(',')==='+ Note,+ Tâche', JSON.stringify(v.boutons));
 T('  avec une phrase qui dit qu’il n’y a rien', await p.evaluate(()=>
   /Aucune note rattachée à cette activité/.test(document.getElementById('modCorps').textContent)));
 T('  « + Note » fonctionne depuis une fiche vierge', await p.evaluate(()=>{
   document.querySelector('[data-act="fiche-note"]').click();
   return !!document.getElementById('fnTxt');
 }));
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(250);

 /* --- mise en page -------------------------------------------------------- */
 for(const [w,hh] of [[1280,1000],[390,900]]){
   await p.setViewportSize({width:w,height:hh});
   await poser(); await p.waitForTimeout(300);
   await p.evaluate(()=>editerChantier('plein')); await p.waitForTimeout(450);
   const m=await p.evaluate(()=>{
     const c=document.getElementById('modCorps');
     const lignes=[...c.querySelectorAll('h3')].map(h=>h.parentNode)
       .filter(l=>l.querySelector('button'));
     return {n:lignes.length,
       dedans:lignes.every(l=>l.scrollWidth<=l.clientWidth+1),
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   /* Le nombre d'en-têtes n'est pas ce qu'on teste — la 3.38.0 en a ajouté un
      troisième, « Projet ». Ce qui compte est qu'il y en ait plusieurs et qu'ils
      suivent tous la même convention. */
   T(`${w}px : plusieurs en-têtes, tous conformes`, m.n>=2, ''+m.n);
   T(`  ${w}px : ils ne débordent pas`, m.dedans===true);
   T(`  ${w}px : pas de défilement latéral`, m.page===false);
   await p.evaluate(()=>fermerModale()); await p.waitForTimeout(200);
 }

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
