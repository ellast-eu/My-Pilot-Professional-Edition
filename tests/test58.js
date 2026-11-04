/* 3.38.0 — le suivi de projet.
   Trois promesses à tenir : le suivi est désactivé par défaut, l'avancement se
   calcule et ne se saisit pas, et une échéance ne bouge pas sans motif. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const J=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const JOURS={}; for(let k=-60;k<=60;k++) JOURS[k]=J(k);

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1100}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(APP); await p.waitForTimeout(1500);

 const poser=()=>p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[
     {id:'ordinaire',categorie:'chantier',date:j[3],heure:'09:00',libelle:'Activité ordinaire',
      statut:'',archive:false},
     {id:'proj',categorie:'chantier',libelle:'Refonte du process',statut:'',archive:false,
      evenements:[
        {id:'e1',date:j[-20],heure:'09:00',duree:60,type:'Réunion',statut:'realise',
         libelle:'Lancement',jalon:true},
        {id:'e2',date:j[-5],heure:'09:00',duree:60,type:'Réunion',statut:'prevu',
         libelle:'Point d’étape',jalon:true},
        {id:'e3',date:j[10],heure:'09:00',duree:60,type:'Visite',statut:'prevu',
         libelle:'Visite de routine',jalon:false},
        {id:'e4',date:j[20],heure:'09:00',duree:60,type:'Réunion',statut:'prevu',
         libelle:'Clôture',jalon:true}],
      projet:{actif:true,deadline:j[30],reports:[]}}
   ];
   D.notes=[
     {id:'t1',date:j[-20],heure:'09:00',type:'',chantier_id:'proj',rubrique_id:'',contenu:'',
      duree:0,suite:{texte:'Rédiger le cahier des charges',echeance:j[-10],fait:true,jalon:true}},
     {id:'t2',date:j[-20],heure:'09:00',type:'',chantier_id:'proj',rubrique_id:'',contenu:'',
      duree:0,suite:{texte:'Relancer le prestataire',echeance:j[2],fait:false,jalon:false}}
   ];
   D=normaliser(D); vueActive='chantiers'; rendre();
 },{j:JOURS});
 await poser(); await p.waitForTimeout(400);

 /* --- 1. désactivé par défaut -------------------------------------------- */
 const def=await p.evaluate(()=>{
   const c={id:'x',categorie:'chantier',libelle:'Neuve',statut:'',archive:false};
   const n=normaliser({version:1,parametres:{},chantiers:[c],notes:[],appels:[],
     idees:[],contacts:[]}).chantiers[0];
   return {projet:n.projet, est:estProjet(n)};
 });
 T('une activité n’est pas un projet par défaut', def.est===false, JSON.stringify(def.projet));
 await p.evaluate(()=>editerChantier('ordinaire')); await p.waitForTimeout(400);
 const fo=await p.evaluate(()=>{
   const z=document.getElementById('modCorps');
   const h=[...z.querySelectorAll('h3')].find(x=>x.textContent.trim()==='Projet');
   return {titre:!!h, activer:!!z.querySelector('[data-act="projet-on"]'),
     ech:!!z.querySelector('[data-act="projet-ech"]'),
     jalons:z.querySelectorAll('[data-jalon]').length};
 });
 T('  sa fiche propose quand même de le devenir', fo.titre && fo.activer, JSON.stringify(fo));
 T('  sans échéance ni jalon tant que ce n’est pas activé',
   fo.ech===false && fo.jalons===0, JSON.stringify(fo));
 /* l'activation, depuis la fiche */
 await p.click('[data-act="projet-on"]'); await p.waitForTimeout(450);
 T('  « Suivre comme un projet » l’active',
   await p.evaluate(()=>estProjet(chantierPar('ordinaire'))));
 T('  et propose alors de poser une échéance',
   await p.evaluate(()=>!!document.querySelector('[data-act="projet-ech"]')));
 /* et la désactivation n'efface rien */
 await p.evaluate(()=>{ const c=chantierPar('ordinaire');
   c.projet.deadline='2026-12-31';
   c.projet.reports=[{le:'2026-11-01',de:'2026-11-30',vers:'2026-12-31',motif:'Essai'}]; });
 await p.click('[data-act="projet-off"]'); await p.waitForTimeout(450);
 const off=await p.evaluate(()=>({est:estProjet(chantierPar('ordinaire')),
   garde:chantierPar('ordinaire').projet.reports.length,
   deadline:chantierPar('ordinaire').projet.deadline}));
 T('  le désactiver n’efface ni l’échéance ni l’historique',
   off.est===false && off.garde===1 && off.deadline==='2026-12-31', JSON.stringify(off));
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(250);

 /* --- 2. les jalons et l'avancement --------------------------------------- */
 const av=await p.evaluate(()=>{
   const c=chantierPar('proj');
   return {j:jalons(c).map(x=>x.libelle+':'+(x.valide?'ok':(x.retard?'retard':'avenir'))),
     a:avancement(c)};
 });
 T('seuls les jalons cochés comptent', av.a.total===4, JSON.stringify(av.a));
 T('  la visite de routine, non cochée, est ignorée',
   av.j.join(',').indexOf('Visite de routine')<0, av.j.join(' | '));
 T('  une tâche cochée compte comme jalon',
   av.j.some(x=>/Rédiger le cahier des charges/.test(x)), av.j.join(' | '));
 T('  une tâche non cochée, non plus',
   !av.j.some(x=>/Relancer le prestataire/.test(x)), av.j.join(' | '));
 T('  deux validés sur quatre', av.a.valides===2, JSON.stringify(av.a));
 T('  soit 50 %', av.a.pct===50, ''+av.a.pct);
 T('  un jalon prévu dont la date est passée est en retard', av.a.retard===1, ''+av.a.retard);
 T('  les jalons sont triés par date', av.j.join(',').indexOf('Lancement')<av.j.join(',').indexOf('Clôture'),
   av.j.join(' | '));

 /* un jalon annulé sort du compte, au numérateur comme au dénominateur */
 const ann=await p.evaluate(()=>{
   const c=chantierPar('proj');
   c.evenements.find(e=>e.id==='e4').statut='annule';
   const a=avancement(c);
   c.evenements.find(e=>e.id==='e4').statut='prevu';
   return a;
 });
 T('un jalon annulé sort du compte', ann.total===3 && ann.valides===2 && ann.pct===67,
   JSON.stringify(ann));

 /* cocher et décocher depuis la fiche */
 await p.evaluate(()=>editerChantier('proj')); await p.waitForTimeout(450);
 const avant=await p.evaluate(()=>avancement(chantierPar('proj')).total);
 await p.click('[data-jalon="e:e3"]'); await p.waitForTimeout(450);
 T('cocher un événement l’ajoute aux jalons',
   await p.evaluate(()=>avancement(chantierPar('proj')).total)===avant+1);
 await p.click('[data-jalon="e:e3"]'); await p.waitForTimeout(450);
 T('  et le décocher le retire',
   await p.evaluate(()=>avancement(chantierPar('proj')).total)===avant);
 await p.click('[data-jalon="t:t2"]'); await p.waitForTimeout(450);
 T('une tâche se coche aussi',
   await p.evaluate(()=>jalons(chantierPar('proj')).some(j=>/Relancer/.test(j.libelle))));
 await p.click('[data-jalon="t:t2"]'); await p.waitForTimeout(450);

 /* --- 3. l'échéance ne bouge pas sans motif ------------------------------- */
 await p.click('[data-act="projet-ech"]'); await p.waitForTimeout(400);
 const dlg=await p.evaluate(()=>({ouverte:!!document.getElementById('pjDate'),
   motif:!!document.getElementById('pjMotif')}));
 T('la fenêtre de report demande une date et un motif', dlg.ouverte && dlg.motif,
   JSON.stringify(dlg));
 /* sans motif : refus */
 const avantD=await p.evaluate(()=>chantierPar('proj').projet.deadline);
 await p.evaluate(({j})=>{ document.getElementById('pjDate').value=j[45] },{j:JOURS});
 await p.evaluate(()=>[...document.querySelectorAll('dialog.saisie-val [data-s="oui"]')]
   .pop().click());
 await p.waitForTimeout(400);
 const refus=await p.evaluate(()=>({d:chantierPar('proj').projet.deadline,
   encore:!!document.getElementById('pjMotif')}));
 T('un report sans motif est refusé', refus.d===avantD && refus.encore===true,
   JSON.stringify(refus));
 /* avec motif : accepté, et tracé */
 await p.evaluate(()=>{ document.getElementById('pjMotif').value=
   'Décalage du marché public, notification reçue le 2 novembre.' });
 await p.evaluate(()=>[...document.querySelectorAll('dialog.saisie-val [data-s="oui"]')]
   .pop().click());
 await p.waitForTimeout(500);
 const apres=await p.evaluate(({j})=>{
   const pr=chantierPar('proj').projet;
   return {d:pr.deadline, n:pr.reports.length, r:pr.reports[0],
     initiale:deadlineInitiale(pr), attendu:j[45]};
 },{j:JOURS});
 T('avec un motif, le report est accepté', apres.d===apres.attendu, JSON.stringify(apres.d));
 T('  il est consigné', apres.n===1 && /marché public/.test(apres.r.motif),
   JSON.stringify(apres.r));
 T('  avec la date de départ et celle d’arrivée',
   apres.r.de===avantD && apres.r.vers===apres.attendu, JSON.stringify(apres.r));
 T('  et l’échéance d’origine reste lisible', apres.initiale===avantD, apres.initiale);
 T('la fiche affiche l’origine barrée et le compteur', await p.evaluate(()=>{
   const z=document.getElementById('modCorps');
   return !!z.querySelector('s') && /1 report/.test(z.textContent);
 }));
 T('  et l’historique porte le motif', await p.evaluate(()=>
   /marché public/.test(document.getElementById('modCorps').textContent)));
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(250);

 /* --- 4. l'onglet Projets -------------------------------------------------- */
 const ong=await p.evaluate(()=>[...document.querySelectorAll('nav button[data-vue]')]
   .map(x=>x.dataset.vue).join(','));
 T('l’onglet Projets est entre Calendrier et Activités',
   /calendrier,projets,chantiers/.test(ong), ong);
 await p.evaluate(()=>{ vueActive='projets'; rendre() }); await p.waitForTimeout(400);
 const vue=await p.evaluate(()=>{
   const l=[...document.querySelectorAll('[data-proj]')];
   return {n:l.length, txt:l.length?l[0].textContent:'',
     jauge:l.length?!!l[0].querySelector('.jauge i'):false,
     largeur:l.length?l[0].querySelector('.jauge i').style.width:''};
 });
 T('la vue liste le projet', vue.n===1, ''+vue.n);
 T('  avec sa barre de progression', vue.jauge===true);
 T('  à 50 %', vue.largeur==='50%', vue.largeur);
 T('  et le compte des jalons', /2 \/ 4 jalon/.test(vue.txt), vue.txt.slice(0,160));
 T('  l’activité ordinaire n’y est pas', !/Activité ordinaire/.test(vue.txt));
 T('cliquer une ligne ouvre la fiche', await (async()=>{
   await p.click('[data-proj="proj"]'); await p.waitForTimeout(450);
   const o=await p.evaluate(()=>document.getElementById('modale').open);
   await p.evaluate(()=>fermerModale()); await p.waitForTimeout(200);
   return o;
 })());

 /* une vue vide doit expliquer, pas rester blanche */
 await p.evaluate(()=>{ D.chantiers.forEach(c=>{ if(c.projet) c.projet.actif=false });
   rendre() }); await p.waitForTimeout(350);
 T('sans projet, la vue explique comment en créer un', await p.evaluate(()=>
   /Suivre comme un projet/.test(document.getElementById('vue').textContent)));

 /* --- 5. le bloc sur l'écran du jour -------------------------------------- */
 const bloc=await p.evaluate(({j})=>{
   const o={};
   const c=chantierPar('proj'); c.projet.actif=true;
   /* échéance lointaine, aucun jalon en retard : hors du bloc */
   c.projet.deadline=j[40];
   c.evenements.find(e=>e.id==='e2').statut='realise';
   vueActive='jour'; rendre();
   o.calme=!!document.querySelector('[data-proj]');
   /* un jalon repasse en retard : le bloc revient */
   c.evenements.find(e=>e.id==='e2').statut='prevu'; rendre();
   o.retard=!!document.querySelector('[data-proj]');
   /* échéance dépassée */
   c.projet.deadline=j[-2];
   c.evenements.find(e=>e.id==='e2').statut='realise'; rendre();
   o.depasse=!!document.querySelector('[data-proj]');
   const b=[...document.querySelectorAll('.bloc')]
     .find(x=>/Projets à surveiller/.test(x.textContent));
   o.titre=!!b;
   /* placement : juste après Points de vigilance */
   const tous=[...document.querySelectorAll('#vue .bloc h2')].map(h=>h.textContent.trim());
   o.ordre=tous.slice(0,3).join(' | ');
   return o;
 },{j:JOURS});
 T('un projet calme ne pollue pas l’écran du jour', bloc.calme===false);
 T('  un jalon en retard l’y ramène', bloc.retard===true);
 T('  une échéance dépassée aussi', bloc.depasse===true);
 T('  le bloc porte son titre', bloc.titre===true);
 T('  et se place juste après Points de vigilance',
   /^Points de vigilance \| Projets à surveiller/.test(bloc.ordre), bloc.ordre);

 /* --- 6. mise en page ------------------------------------------------------ */
 for(const [w,hh] of [[1280,1100],[390,900]]){
   await p.setViewportSize({width:w,height:hh});
   await p.evaluate(()=>{ vueActive='projets'; rendre() }); await p.waitForTimeout(350);
   const m=await p.evaluate(()=>({
     page:document.documentElement.scrollWidth>innerWidth+1,
     ligne:(()=>{const l=document.querySelector('[data-proj]');
       return l? l.scrollWidth<=l.clientWidth+1 : false})()}));
   T(`${w}px : la ligne de projet tient`, m.ligne===true);
   T(`  ${w}px : pas de défilement latéral`, m.page===false);
   await p.screenshot({path:'/tmp/proj_'+w+'.png',fullPage:w===390});
 }

 T('l’aide a sa rubrique Projets', await p.evaluate(()=>
   AIDE.some(r=>r.id==='projets' && /ne flotte pas/.test(r.html)
     && /d\u2019un pourcentage|s\u2019arrange/.test(r.html))));

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
