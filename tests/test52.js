/* 3.33.0 — la vue Calendrier : grille mensuelle, comptes par jour, détail du jour choisi. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1100}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+''); await p.waitForTimeout(1500);

 /* Un mois fixe : novembre 2026 commence un dimanche, ce qui éprouve le décalage
    de la semaine commençant le lundi. */
 const poser=()=>p.evaluate(()=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.parametres.jours_ouvres=[1,2,3,4,5];
   D.parametres.absences=['2026-11-05'];
   const a=(id,d,cat,lib,h,x)=>Object.assign({id:id,categorie:cat,date:d,heure:h,libelle:lib,
     commune:'SAINT-MARTIN',reference:'R-'+id,statut:'',archive:false},x||{});
   D.chantiers=[
     a('m1','2026-11-02','chantier','Un','09:00'),
     a('m2','2026-11-02','convocation','Deux','10:00'),
     a('m3','2026-11-02','animation','Trois','11:00'),
     a('m4','2026-11-02','transverse','Quatre','14:00'),
     a('m5','2026-11-02','chantier','Cinq','15:00'),
     a('m6','2026-11-02','chantier','Six','16:00'),
     a('seul','2026-11-12','chantier','Isolé','08:00'),
     a('arch','2026-11-12','chantier','Archivé','09:00',{archive:'2026-11-01'}),
     a('horsm','2026-12-03','chantier','Décembre','09:00'),
     a('sansd','','chantier','Sans date','')
   ];
   const t=(id,e)=>({id:id,date:'2026-10-20',heure:'09:00',type:'',chantier_id:'',
     rubrique_id:'',contenu:'',duree:0,suite:{texte:'Tâche '+id,echeance:e,fait:false}});
   D.notes=[t('e1','2026-11-12'),t('e2','2026-11-12'),t('e3','2026-11-20'),
     t('faite','2026-11-12'),t('sansech','')];
   D.notes.find(n=>n.id==='faite').suite.fait=true;
   /* 3.35.0 : le calendrier liste les événements. On charge la fixture datée comme le
      ferait un fichier d'avant la bascule, par normaliser(), qui la reprend en un
      premier événement — c'est ce que voit un vrai utilisateur qui met à jour. */
   D=normaliser(D);
   moisCal='2026-11-01'; jourCal='2026-11-02'; vueActive='calendrier'; rendre();
 });
 await poser(); await p.waitForTimeout(450);

 /* --- 1. l'onglet ---------------------------------------------------------- */
 const nav=await p.evaluate(()=>[...document.querySelectorAll('nav button[data-vue]')]
   .map(b=>b.dataset.vue).join(','));
 /* L'adjacence était trop stricte : la 3.38.0 a glissé l'onglet Projets entre
    Calendrier et Activités, ce qui ne change rien à la place du Calendrier. On
    vérifie l'ORDRE, qui est ce qui comptait. */
 const rang=v=>nav.split(',').indexOf(v);
 T('l’onglet vient après « Prochain jour ouvré » et avant « Activités »',
   rang('calendrier')>rang('suivant') && rang('calendrier')<rang('chantiers')
   && rang('calendrier')>=0, nav);

 /* --- 2. la grille --------------------------------------------------------- */
 const g=await p.evaluate(()=>{
   const c=document.querySelector('.cal');
   return {entetes:[...c.querySelectorAll('.jn')].map(x=>x.textContent).join(','),
     cases:c.querySelectorAll('[data-caljour]').length,
     premiere:c.querySelector('[data-caljour]').dataset.caljour,
     derniere:[...c.querySelectorAll('[data-caljour]')].pop().dataset.caljour};
 });
 T('la semaine commence le lundi', g.entetes==='lun,mar,mer,jeu,ven,sam,dim', g.entetes);
 T('  la grille commence au lundi précédant le 1er', g.premiere==='2026-10-26', g.premiere);
 T('  et couvre le mois entier', g.derniere>='2026-11-30', g.derniere);
 T('  en semaines complètes', g.cases%7===0, g.cases+' cases');

 /* --- 3. ce que portent les cases ------------------------------------------ */
 const c = s=>p.evaluate(x=>{
   const e=document.querySelector('[data-caljour="'+x+'"]');
   if(!e) return null;
   return {cl:e.className, pts:e.querySelectorAll('.pt').length,
     plus:(e.querySelector('.pl')||{}).textContent||'',
     ech:(e.querySelector('.ech')||{}).textContent||'',
     echRouge:!!(e.querySelector('.ech')||{classList:{contains:()=>false}}).classList.contains('retard'),
     mot:(e.querySelector('.mot')||{}).textContent||'',
     aria:e.getAttribute('aria-label')};
 },s);

 let x=await c('2026-11-02');
 T('six rendez-vous : quatre pastilles et deux comptés', x.pts===4 && x.plus==='+2',
   x.pts+' / '+x.plus);
 T('  le jour choisi est marqué', /\bsel\b/.test(x.cl), x.cl);
 T('  et l’étiquette accessible dit le contenu', /6 rendez-vous/.test(x.aria), x.aria);

 x=await c('2026-11-12');
 T('les échéances sont comptées', x.ech==='2 éch.', x.ech);
 T('  une tâche faite n’est pas comptée', x.ech==='2 éch.');
 T('  une activité archivée n’a pas de pastille', x.pts===1, ''+x.pts);
 T('  l’échéance à venir n’est pas en rouge', x.echRouge===false);

 x=await c('2026-11-07');
 T('un samedi est grisé', /\bchome\b/.test(x.cl), x.cl);
 T('  sans être nommé : la trame suffit', x.mot==='', JSON.stringify(x.mot));
 x=await c('2026-11-11');
 T('un férié est nommé', /Armistice/.test(x.mot), x.mot);
 x=await c('2026-11-05');
 T('une absence déclarée aussi', x.mot==='absence', x.mot);
 x=await c('2026-10-28');
 T('les jours du mois voisin sont en retrait', /\bhors\b/.test(x.cl), x.cl);

 /* --- 4. le total du mois --------------------------------------------------- */
 const tot=await p.evaluate(()=>document.querySelector('.cal-tete .note-aide').textContent);
 /* 6 le 02 + 1 le 12 ; l'archivée du 12 est exclue, le 03/12 est hors mois */
 T('le total ne compte que le mois affiché, archives exclues',
   /7 rendez-vous/.test(tot) && /3 échéance/.test(tot), tot);

 /* --- 5. ouvrir une journée -------------------------------------------------- */
 let j=await p.evaluate(()=>{
   const b=[...document.querySelectorAll('.bloc')].pop();
   return {titre:b.querySelector('h2').textContent, compte:b.querySelector('.compte').textContent,
     rdv:b.querySelectorAll('.piquet').length, ech:b.querySelectorAll('[data-fait]').length,
     noter:b.querySelectorAll('[data-noter]').length,
     neuf:b.querySelectorAll('[data-neuf]').length};
 });
 T('la journée choisie s’affiche', /2 novembre 2026/.test(j.titre), j.titre);
 T('  avec ses six rendez-vous', j.rdv===6, ''+j.rdv);
 T('  son décompte', /6 rdv/.test(j.compte), j.compte);
 T('  et de quoi créer à cette date', j.neuf===4, ''+j.neuf);

 await p.click('[data-caljour="2026-11-12"]'); await p.waitForTimeout(400);
 j=await p.evaluate(()=>{
   const b=[...document.querySelectorAll('.bloc')].pop();
   return {titre:b.querySelector('h2').textContent, rdv:b.querySelectorAll('.piquet').length,
     ech:b.querySelectorAll('[data-fait]').length, txt:b.textContent,
     sel:document.querySelectorAll('.cal .c.sel').length};
 });
 T('cliquer une case change la journée', /12 novembre/.test(j.titre), j.titre);
 T('  une seule case reste sélectionnée', j.sel===1, ''+j.sel);
 T('  l’archivée n’apparaît pas', j.rdv===1 && !/Archivé/.test(j.txt), ''+j.rdv);
 T('  les deux échéances sont listées', j.ech===2, ''+j.ech);
 T('  avec leurs actions habituelles', /Marquer fait/.test(j.txt) && /Ouvrir la note/.test(j.txt));

 await p.click('[data-caljour="2026-11-04"]'); await p.waitForTimeout(400);
 j=await p.evaluate(()=>[...document.querySelectorAll('.bloc')].pop().textContent);
 T('un jour vide le dit', /Aucun rendez-vous/.test(j) && /Aucune échéance/.test(j));

 /* --- 6. naviguer dans les mois --------------------------------------------- */
 await p.click('[data-calmois="1"]'); await p.waitForTimeout(400);
 let m=await p.evaluate(()=>document.querySelector('.cal-mois').textContent);
 T('le mois suivant s’affiche', m==='décembre 2026', m);
 T('  et le jour choisi ne bouge pas tout seul',
   await p.evaluate(()=>jourCal)==='2026-11-04');
 await p.click('[data-calmois="-1"]'); await p.click('[data-calmois="-1"]');
 await p.waitForTimeout(400);
 m=await p.evaluate(()=>document.querySelector('.cal-mois').textContent);
 T('on revient en arrière', m==='octobre 2026', m);
 /* le passage d'année doit tenir */
 await p.evaluate(()=>{ moisCal='2026-12-01'; rendre() });
 await p.click('[data-calmois="1"]'); await p.waitForTimeout(350);
 T('décembre → janvier change d’année',
   await p.evaluate(()=>document.querySelector('.cal-mois').textContent)==='janvier 2027',
   await p.evaluate(()=>document.querySelector('.cal-mois').textContent));
 await p.click('[data-calmois="-1"]'); await p.waitForTimeout(350);
 T('  et janvier → décembre revient',
   await p.evaluate(()=>document.querySelector('.cal-mois').textContent)==='décembre 2026');

 await p.click('[data-calauj]'); await p.waitForTimeout(400);
 const h=await p.evaluate(()=>({mois:moisCal, jour:jourCal, auj:auj(),
   cercle:document.querySelectorAll('.cal .c.auj').length}));
 T('« Aujourd’hui » ramène au jour et au mois courants',
   h.jour===h.auj && h.mois===h.auj.slice(0,7)+'-01', h.mois+' / '+h.jour);
 T('  et le jour du jour est cerclé une seule fois', h.cercle===1, ''+h.cercle);

 /* --- 7. volume ------------------------------------------------------------- */
 const perf=await p.evaluate(()=>{
   D.chantiers=[]; D.notes=[];
   for(let i=0;i<2000;i++) D.chantiers.push({id:'v'+i,categorie:'chantier',
     date:'2026-11-'+String(1+(i%30)).padStart(2,'0'),heure:'09:00',libelle:'D'+i,
     statut:'',archive:false});
   for(let i=0;i<2000;i++) D.notes.push({id:'w'+i,date:'2026-10-01',heure:'09:00',type:'',
     chantier_id:'',rubrique_id:'',contenu:'',duree:0,
     suite:{texte:'T'+i,echeance:'2026-11-'+String(1+(i%30)).padStart(2,'0'),fait:false}});
   moisCal='2026-11-01';
   const t0=performance.now(); const html=vueCalendrier(); const t1=performance.now();
   return {ms:t1-t0, long:html.length};
 });
 T('2000 activités et 2000 tâches : la vue se construit sous 400 ms',
   perf.ms<400, Math.round(perf.ms)+' ms');

 /* --- 8. mise en page -------------------------------------------------------- */
 await poser(); await p.waitForTimeout(400);
 for(const [w,hh] of [[1280,1100],[900,1000],[390,900]]){
   await p.setViewportSize({width:w,height:hh}); await p.waitForTimeout(400);
   const m2=await p.evaluate(()=>{
     const c=document.querySelector('.cal'), r=c.getBoundingClientRect();
     return {deb:c.scrollWidth>c.clientWidth+1, hors:r.right>innerWidth+1,
       page:document.documentElement.scrollWidth>innerWidth+1,
       cases:c.querySelectorAll('[data-caljour]').length,
       hautMin:Math.min(...[...c.querySelectorAll('[data-caljour]')]
         .map(e=>Math.round(e.getBoundingClientRect().height)))};
   });
   T(`${w}px : la grille ne déborde pas`, !m2.deb && !m2.hors);
   T(`${w}px : pas de défilement latéral`, !m2.page);
   T(`${w}px : les cases restent cliquables`, m2.hautMin>=40, m2.hautMin+' px');
 }
 await p.setViewportSize({width:1280,height:1100});

 T('l’aide décrit le calendrier',
   await p.evaluate(()=>AIDE.some(r=>r.id==='calendrier'
     && /une pastille par rendez-vous/i.test(r.html))));
 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
