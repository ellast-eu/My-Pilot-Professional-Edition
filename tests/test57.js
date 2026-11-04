/* 3.37.1 — le message de la fiche doit dire la vérité sur le pilotage.
   Il affirmait qu'une activité sans événement « est signalée comme non pilotée ».
   Faux : une tâche en attente suffit à la piloter. Ce banc vérifie les trois états,
   et surtout que le message et la règle ne peuvent plus diverger. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const J=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(APP); await p.waitForTimeout(1500);

 const msg=await p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   const a=(id,x)=>Object.assign({id:id,categorie:'chantier',libelle:id,
     statut:'',archive:false},x||{});
   D.chantiers=[
     a('nu'),                                   /* rien du tout → non piloté */
     a('avecTache'),                            /* une tâche en attente → piloté */
     a('tacheFaite'),                           /* tâche close → non piloté */
     a('clos',{statut:statutClos('chantier')}), /* clos → hors sujet */
     a('archive',{archive:j[-1]}),
     a('annule',{statut:'annule'})
   ];
   const t=(id,ch,fait)=>({id:id,date:j[-2],heure:'09:00',type:'',chantier_id:ch,
     rubrique_id:'',contenu:'',duree:0,suite:{texte:'À faire',echeance:'',fait:!!fait}});
   D.notes=[t('n1','avecTache',false),t('n2','tacheFaite',true)];
   D=normaliser(D); vueActive='chantiers'; rendre();
   const o={};
   ['nu','avecTache','tacheFaite','clos','archive','annule'].forEach(id=>{
     editerChantier(id);
     const z=document.getElementById('modCorps');
     const h=[...z.querySelectorAll('h3')].find(x=>/Événements/.test(x.textContent));
     o[id]=h.parentNode.nextElementSibling.textContent.trim();
     fermerModale();
   });
   o.__nonPilotes=nonPilotes(false).map(c=>c.id).sort().join(',');
   return o;
 },{j:{'-1':J(-1),'-2':J(-2)}});

 T('sans rien : l’activité est annoncée non pilotée',
   /Aucun événement ni tâche en attente : cette activité est signalée comme non pilotée/
     .test(msg.nu), msg.nu);
 T('avec une tâche en attente : le message ne ment plus',
   /reste pilotée par sa tâche en attente/.test(msg.avecTache), msg.avecTache);
 T('  et ne prétend surtout plus l’inverse',
   !/signalée comme non pilotée/.test(msg.avecTache), msg.avecTache);
 T('tâche cochée faite : l’activité redevient non pilotée',
   /signalée comme non pilotée/.test(msg.tacheFaite), msg.tacheFaite);

 /* Un dossier clos, archivé ou annulé n'est jamais signalé : lui dire le contraire
    serait un autre mensonge, plus discret. */
 ['clos','archive','annule'].forEach(id=>{
   T(`${id} : aucune promesse sur le pilotage`,
     msg[id]==='Aucun événement.', msg[id]);
 });

 /* Le point qui compte : le message et la règle disent la même chose. */
 T('le message colle exactement à nonPilotes()',
   msg.__nonPilotes==='nu,tacheFaite', msg.__nonPilotes);

 /* Et un événement à venir pilote aussi, sans tâche. */
 const avecEvt=await p.evaluate(({j})=>{
   const c=D.chantiers.find(x=>x.id==='nu');
   c.evenements=[{id:'e1',date:j[5],heure:'09:00',duree:0,type:'Rendez-vous',
     statut:'prevu',libelle:'',source:''}];
   syncDates(c); rendre();
   return {pilote:nonPilotes(false).indexOf(c)<0,
     par:pilotePar(c,aTacheOuverte(c))};
 },{j:{'5':J(5)}});
 T('un événement à venir pilote aussi', avecEvt.pilote===true);
 T('  et la règle sait dire par quoi', avecEvt.par==='evenement', avecEvt.par);

 /* Les deux autres textes ne parlent plus de « date » là où c'est un événement. */
 const textes=await p.evaluate(({j})=>{
   D.chantiers.forEach(c=>{ c.evenements=[]; syncDates(c) });
   D.notes=[]; vueActive='jour'; rendre();
   const bloc=[...document.querySelectorAll('.bloc')]
     .find(x=>/Dossiers non pilotés/.test(x.textContent));
   const i=document.getElementById('impression');
   i.innerHTML=construireRapportPDF(j[-30],j[0]);
   const r=i.textContent; i.innerHTML='';
   return {bloc:bloc?bloc.textContent:'', rapport:r};
 },{j:{'-30':J(-30),'0':J(0)}});
 T('le bloc du jour parle d’événement, plus de date',
   /ni événement à venir/.test(textes.bloc) && !/ni date à venir/.test(textes.bloc),
   textes.bloc.slice(0,150));
 T('le rapport aussi',
   /ni événement à venir/.test(textes.rapport) && !/ni date à venir/.test(textes.rapport));
 T('l’aide reste juste', await p.evaluate(()=>
   AIDE.some(r=>/ni tâche en attente, ni événement à venir non annulé/.test(r.html))));

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await b.close();
 process.exit(ko.length?1:0);
})();
