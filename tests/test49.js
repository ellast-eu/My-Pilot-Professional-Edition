/* 3.30.0 — pilotage : un dossier sans tâche ni date à venir est signalé,
   et le rapport gagne une page « Charge à venir ». */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const J=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const JOURS={}; for(let k=-45;k<=120;k++) JOURS[k]=J(k);

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+''); await p.waitForTimeout(1500);

 /* --- 1. la définition du pilotage --------------------------------------- */
 let r=await p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   const a=(id,d,x)=>Object.assign({id:id,categorie:'chantier',date:d,heure:'09:00',
     libelle:id,statut:'',archive:false},x||{});
   D.chantiers=[
     a('futur',   j[5]),                              /* date à venir → piloté */
     a('aujourd', j[0]),                              /* aujourd'hui → piloté */
     a('passe',   j[-9]),                             /* échue, note posée après → NON */
     a('muet',    j[-7]),                             /* échue, aucune note → sans trace ET non piloté */
     a('jamais',  ''),                                /* jamais datée → NON */
     a('avecTache', j[-9]),                           /* échue mais tâche ouverte → piloté */
     a('tacheFaite', j[-9]),                          /* tâche close → NON */
     a('clos',    '',{statut:statutClos('chantier')}),/* clos → hors sujet */
     a('annule',  '',{statut:'annule'}),
     a('archive', '',{archive:true})
   ];
   D.notes=[
     {id:'n1',date:j[-9],heure:'09:00',type:'',chantier_id:'avecTache',rubrique_id:'',
      contenu:'',duree:0,suite:{texte:'Relancer',echeance:'',fait:false}},
     {id:'n2',date:j[-9],heure:'09:00',type:'',chantier_id:'tacheFaite',rubrique_id:'',
      contenu:'',duree:0,suite:{texte:'Fait',echeance:j[-8],fait:true}},
     /* une note sans suite ne pilote pas : elle raconte le passé */
     {id:'n3',date:j[-8],heure:'09:00',type:'',chantier_id:'passe',rubrique_id:'',
      contenu:'Visite faite',duree:10,suite:null}
   ];
   /* 3.35.0 : la date unique est devenue une liste d'événements. On charge la fixture
      comme le ferait un vrai fichier d'avant la bascule — par normaliser() — pour que
      ce banc prouve au passage que la reprise des données datées tient toujours. */
   D=normaliser(D);
   /* Redater une activité, c'est désormais déplacer son événement. */
   window.dater=(c,d)=>{
     c.evenements = d ? [{id:'e'+c.id,date:d,heure:'09:00',duree:0,
       type:'Rendez-vous',statut:'prevu',libelle:'',source:''}] : [];
     syncDates(c);
   };
   vueActive='jour'; rendre();
   return nonPilotes(false).map(c=>c.id);
 },{j:JOURS});
 T('une date à venir pilote', r.indexOf('futur')<0, r.join(','));
 T('  aujourd’hui aussi', r.indexOf('aujourd')<0);
 T('  une tâche ouverte aussi, même sans échéance', r.indexOf('avecTache')<0);
 T('une date échue seule ne pilote pas', r.indexOf('passe')>=0);
 T('  ni une absence de date', r.indexOf('jamais')>=0);
 T('  ni une tâche déjà faite', r.indexOf('tacheFaite')>=0);
 T('une note sans suite ne pilote pas', r.indexOf('passe')>=0);
 T('clos, annulé, archivé : hors sujet',
   ['clos','annule','archive'].every(x=>r.indexOf(x)<0), r.join(','));
 T('le compte est de quatre', r.length===4, r.join(','));
 T('les jamais datés passent devant', r[0]==='jamais', r.join(','));

 /* --- 2. le bloc du jour ne répète pas « sans trace » -------------------- */
 const d2=await p.evaluate(()=>({
   entier:nonPilotes(false).map(c=>c.id).join(','),
   bloc:nonPilotes(true).map(c=>c.id).join(','),
   sansTrace:sansTraceListes().ouvertes.map(c=>c.id).join(',')}));
 T('« muet » est réclamé par « sans trace »', d2.sansTrace.indexOf('muet')>=0, d2.sansTrace);
 T('  « passe » ne l’est pas : sa note vaut trace', d2.sansTrace.indexOf('passe')<0, d2.sansTrace);
 T('  donc le bloc du jour ne le répète pas', d2.bloc.indexOf('muet')<0, d2.bloc);
 T('  mais la définition entière le garde', d2.entier.indexOf('muet')>=0, d2.entier);

 let v=await p.evaluate(()=>{
   const b=[...document.querySelectorAll('.bloc')].find(x=>/Dossiers non pilotés/.test(x.textContent));
   if(!b) return null;
   return {compte:b.querySelector('.compte').textContent,
     lignes:b.querySelectorAll('.note').length,
     voir:!!b.querySelector('[data-voirpilote]'),
     txt:b.textContent};
 });
 T('le bloc s’affiche', !!v);
 T('  avec le compte du bloc, pas celui du filtre', v.compte==='3', v.compte);
 /* 3.37.1 : le critère ne parle plus de « date » mais d'événement — c'est ce qui
    est réellement testé depuis la 3.35.0. */
 T('  il explique le critère', /Ni tâche en attente, ni événement à venir/.test(v.txt), v.txt.slice(0,110));
 T('  il dit « jamais datée » quand c’est le cas', /jamais datée/.test(v.txt));
 T('  et renvoie vers Activités', v.voir===true);

 /* --- 3. le bloc disparaît quand tout est piloté ------------------------- */
 T('tout piloté : pas de bloc', await p.evaluate(({j})=>{
   D.chantiers.forEach(c=>{ if(!estArchive(c)&&!estClos(c)&&!estAnnule(c)) dater(c,j[3]) });
   rendre();
   return ![...document.querySelectorAll('.bloc')].some(x=>/Dossiers non pilotés/.test(x.textContent));
 },{j:JOURS}));

 /* --- 4. le filtre des Activités ----------------------------------------- */
 await p.evaluate(({j})=>{
   D.chantiers.forEach(c=>{ if(c.id==='passe'||c.id==='jamais'||c.id==='tacheFaite'||c.id==='muet')
     dater(c,(c.id==='jamais'?'':j[-9])) });
   const m=D.chantiers.find(c=>c.id==='muet'); if(m) dater(m,j[-7]);
   vueActive='chantiers'; filtreCh.pilotage=''; filtreCh.periode='tous'; rendre();
 },{j:JOURS}); await p.waitForTimeout(350);
 const f=await p.evaluate(()=>({
   existe:!!document.getElementById('fpilotage'),
   options:[...document.getElementById('fpilotage').options].map(o=>o.value).join(','),
   tous:document.querySelectorAll('[data-chantier]').length}));
 T('la liste déroulante existe', f.existe);
 T('  avec trois valeurs', f.options===',non,oui', f.options);
 await p.selectOption('#fpilotage','non'); await p.waitForTimeout(350);
 const n1=await p.evaluate(()=>document.querySelectorAll('[data-chantier]').length);
 T('« Non pilotés » donne la définition entière', n1===4, ''+n1);
 await p.selectOption('#fpilotage','oui'); await p.waitForTimeout(350);
 const n2=await p.evaluate(()=>document.querySelectorAll('[data-chantier]').length);
 T('« Pilotés » donne le complément des actifs', n1+n2===f.tous, n1+'+'+n2+'/'+f.tous);
 await p.selectOption('#fpilotage',''); await p.waitForTimeout(300);

 /* --- 5. la charge à venir ------------------------------------------------ */
 r=await p.evaluate(({j})=>{
   D=vierge(); D.parametres.categories=modeleCategories();
   const a=(id,d,du)=>({id:id,categorie:'chantier',date:d,heure:'09:00',libelle:id,
     statut:'',archive:false,duree:du||0});
   D.chantiers=[a('r1',j[1],60),a('r2',j[1],30),a('r3',j[4]),a('sem',j[40]),a('loin',j[95]),
     a('hier',j[-1]),a('clos2',j[2])];
   D.chantiers.find(c=>c.id==='clos2').statut=statutClos('chantier');
   const t=(id,e)=>({id:id,date:j[0],heure:'09:00',type:'',chantier_id:'',rubrique_id:'',
     contenu:'',duree:0,suite:{texte:id,echeance:e,fait:false}});
   D.notes=[t('t1',j[1]),t('t2',j[10]),t('retard',j[-3]),t('sansEch','')];
   D=normaliser(D);                /* la charge se lit sur les événements, pas sur c.date */
   const c=chargeAVenir(21,8);
   return {rdv:c.rdv, taches:c.taches, retard:c.hors.retard, sansEch:c.hors.sansEch,
     loin:c.loin, jours:c.jours.length, semaines:c.semaines.length,
     j0:c.jours[0].d, j1:c.jours[1], chome:c.jours.filter(x=>x.chome).length};
 },{j:JOURS});
 T('les rendez-vous à venir sont comptés', r.rdv===4, ''+r.rdv);
 T('  un rendez-vous passé ne compte pas', r.rdv===4);
 T('  un rendez-vous clos non plus', r.rdv===4);
 T('les tâches à échéance sont comptées', r.taches===2, ''+r.taches);
 T('  les retards sont à part', r.retard===1, ''+r.retard);
 T('  les tâches sans échéance aussi', r.sansEch===1, ''+r.sansEch);
 T('ce qui dépasse l’horizon est compté', r.loin===1, ''+r.loin);
 T('la trame fait 21 jours', r.jours===21, ''+r.jours);
 T('  et commence aujourd’hui', r.j0===new Date(Date.now()).toISOString().slice(0,10), r.j0);
 T('  8 semaines suivent', r.semaines===8, ''+r.semaines);
 T('le jour J+1 porte bien 2 rdv et 1 tâche',
   r.j1.rdv===2 && r.j1.tache===1, JSON.stringify(r.j1));
 T('  et cumule les minutes', r.j1.min===90, ''+r.j1.min);
 T('les jours chômés sont repérés', r.chome>=4, ''+r.chome);

 /* --- 6. la page 4 du rapport --------------------------------------------- */
 const pg=await p.evaluate(({j})=>{
   const i=document.getElementById('impression');
   i.innerHTML=construireRapportPDF(j[-30],j[0]);
   i.style.display='block'; i.style.width='174mm';
   const pages=[...i.querySelectorAll('.rp-page')];
   const d=pages[pages.length-1];
   return {n:pages.length, titre:d.querySelector('.rp-per b').textContent,
     svg:d.querySelectorAll('svg').length, cles:d.querySelectorAll('.rp-cle').length,
     txt:d.textContent, larg:d.scrollWidth>d.clientWidth+1};
 },{j:JOURS});
 T('le rapport compte quatre pages', pg.n===4, ''+pg.n);
 T('  la dernière s’intitule « Charge à venir »', pg.titre==='Charge à venir', pg.titre);
 T('  elle porte deux graphiques', pg.svg===2, ''+pg.svg);
 T('  et cinq indicateurs', pg.cles===5, ''+pg.cles);
 T('  elle explique sa lecture', /Barre foncée : rendez-vous/.test(pg.txt));
 T('  elle dit son indépendance de la période', /indépendant de la période/.test(pg.txt));
 T('  elle signale les non pilotés', /non pilotés/.test(pg.txt));
 T('  elle ne déborde pas en largeur', !pg.larg);

 /* --- 7. un fichier vide ne casse pas la page ----------------------------- */
 const vide=await p.evaluate(({j})=>{
   D=vierge(); D.parametres.categories=modeleCategories();
   const i=document.getElementById('impression');
   i.innerHTML=construireRapportPDF(j[-30],j[0]);
   const pages=[...i.querySelectorAll('.rp-page')];
   return {n:pages.length, txt:pages[pages.length-1].textContent};
 },{j:JOURS});
 T('sans aucune donnée, la page existe toujours', vide.n===4, ''+vide.n);
 T('  et reste lisible', /Charge à venir|Ce qui attend/.test(vide.txt));

 /* --- 8. pagination sous un portefeuille réel ---------------------------
    Tous les plafonds du rapport saturés : c'est la hauteur maximale que chaque page
    peut atteindre, quel que soit le volume. Le cas qui avait échappé au banc. */
 const hauteurs=await p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   const STAT=[]; for(let i=0;i<20;i++) STAT.push('Statut détaillé numéro '+(i+1));
   D.parametres.statuts_dossier=STAT;
   const TYPE=['Visite de chantier','Constat de mise en danger','Non-respect des prescriptions',
     'Déraccordement','Mise hors tension','Consignation','Visite sécurité',
     'Type 8','Type 9','Type 10','Type 11','Type 12'];
   D.parametres.types_intervention=TYPE;
   D.parametres.rubriques=['Activités du planning','Traitement en série','Permanence téléphonique',
     'Traitement mail','Revue de portefeuille','Autre','Protection de chantier',
     'Convocation','Organisation'].map((nm,k)=>({id:'r'+k,nom:nm,
       famille:['regalien','support','amelioration'][k%3],auto:''}));
   D.chantiers=[]; D.notes=[]; let n=0;
   [['chantier',103],['convocation',21],['animation',4],['transverse',5]].forEach(([cle,nb])=>{
     for(let i=0;i<nb;i++){ n++; D.chantiers.push({id:'c'+n,categorie:cle,date:j[-(i%30)],
       heure:'09:00',libelle:'Dossier '+n,commune:'COMMUNE '+(i%40),reference:'2026-'+n,
       statut:(cle==='chantier'?STAT[i%STAT.length]:(cle==='animation'?'Terminé':'Réalisé')),
       type:TYPE[i%TYPE.length],duree:30,archive:false,participants:(cle==='animation'?12:0),
       tiers:'Entreprise '+(i%12)}) }});
   D.parametres.rubriques.forEach((r,k)=>{ for(let i=0;i<4;i++)
     D.notes.push({id:'rn'+k+'_'+i,date:j[-(i%20)],heure:'11:00',type:'Administratif',
       chantier_id:'',rubrique_id:r.id,contenu:'imputation',duree:[60,30,20,10][k%4],suite:null}) });
   for(let i=0;i<142;i++) D.notes.push({id:'n'+i,date:j[-(i%30)],heure:'10:00',
     type:['Terrain','Administratif','Téléphone','Mail'][i%4],chantier_id:'c'+(1+i%103),
     rubrique_id:'',contenu:'Note '+i,duree:15,
     suite:i%4?null:{texte:'Suite '+i,echeance:j[(i%20)-5],fait:i%8===0}});
   D.appels=[]; for(let i=0;i<56;i++) D.appels.push({id:'a'+i,date:j[-(i%30)],heure:'09:00',
     qui:'Appelant '+i,entreprise:'Ent '+i,tel:'0400000000',
     motif:'Motif d’appel assez long numéro '+(i%9),objet:'Objet',commune:'C',duree:6,
     suite:null,traite:true});
   D.compteur=[]; for(let i=0;i<9;i++) D.compteur.push({date:j[-i],heures:3,cadence:15,
     traites:45,jalons:[],sessions:[{debut:'08:00',fin:'09:15'}]});
   D.vigilances=[{id:'v1',texte:'A',niveau:'attention',date:j[0],clos:false},
     {id:'v2',texte:'B',niveau:'attention',date:j[0],clos:true},
     {id:'v3',texte:'C',niveau:'info',date:j[0],clos:false}];
   const pave=k=>Array.from({length:k},(_,x)=>'Point numéro '+(x+1)
     +' : reprise de portefeuille, appui apporté à l’équipe, initiative engagée sur le terrain.').join(' ');
   D.parametres.rap_faits=pave(6); D.parametres.rap_objectifs=pave(6);
   D.parametres.id_nom='Prénom NOM'; D.parametres.id_fonction='Prévention';
   D.parametres.id_entite='Service régional';
   const i=document.getElementById('impression');
   i.innerHTML=construireRapportPDF(j[-30],j[0]);
   i.style.display='block'; i.style.width='174mm';
   const px=document.createElement('div'); px.style.height='100mm'; i.appendChild(px);
   const mm=px.getBoundingClientRect().height/100; px.remove();
   return [...i.querySelectorAll('.rp-page')].map(e=>+(e.getBoundingClientRect().height/mm).toFixed(1));
 },{j:JOURS});
 /* @page{margin:16mm 18mm 14mm} sur A4 : 297 − 16 − 14 = 267 mm utiles */
 const UTILE=267;
 T('le rapport tient en quatre pages', hauteurs.length===4, hauteurs.join(' / '));
 hauteurs.forEach((mm,k)=>T(`  page ${k+1} tient dans la feuille`, mm<=UTILE, mm+' mm / '+UTILE));
 T('  et garde de la marge partout', hauteurs.every(m=>m<=UTILE-15),
   hauteurs.map(m=>UTILE-m).join(' / ')+' mm de reste');

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
