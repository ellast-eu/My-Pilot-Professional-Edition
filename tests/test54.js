/* 3.35.0 — les événements remplacent la date unique d'une activité. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const J=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const JR={}; for(let k=-30;k<=30;k++) JR[k]=J(k);

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1100}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(APP); await p.waitForTimeout(1500);

 /* ===== 1. la reprise des activités déjà datées ========================== */
 const mig=await p.evaluate(({j})=>{
   const brut={parametres:{categories:modeleCategories()},chantiers:[
     {id:'m1',categorie:'chantier',date:j[3],heure:'09:00',duree:60,libelle:'Dossier',statut:'1 - À instruire'},
     {id:'m2',categorie:'convocation',date:j[-5],heure:'14:00',duree:30,libelle:'Convoc',statut:'termine'},
     {id:'m3',categorie:'animation',date:'',libelle:'Jamais datée',statut:'planifie'},
     {id:'m4',categorie:'transverse',date:j[-2],libelle:'Annulée',statut:'annule'}]};
   D=normaliser(brut); fichierCharge=true;
   const g=id=>{const c=D.chantiers.find(x=>x.id===id);
     return {n:(c.evenements||[]).length,e:(c.evenements||[])[0]||null,date:c.date,heure:c.heure}};
   return {m1:g('m1'),m2:g('m2'),m3:g('m3'),m4:g('m4')};
 },{j:JR});
 T('une activité datée devient un événement', mig.m1.n===1, JSON.stringify(mig.m1.e));
 T('  son type est déduit de la catégorie', mig.m1.e.type==='Intervention', mig.m1.e.type);
 T('  l’heure et la durée suivent', mig.m1.e.heure==='09:00' && mig.m1.e.duree===60);
 T('une convocation devient un rendez-vous', mig.m2.e.type==='Rendez-vous', mig.m2.e.type);
 T('  close, son événement est réalisé', mig.m2.e.statut==='realise', mig.m2.e.statut);
 T('  le marqueur de clôture est celui de SA catégorie', mig.m2.e.statut==='realise',
   'convocation clôt sur « termine », pas « realise »');
 T('une activité jamais datée n’invente pas d’événement', mig.m3.n===0 && mig.m3.date==='');
 T('une activité annulée garde sa date, son événement est annulé',
   mig.m4.e.statut==='annule' && mig.m4.date!=='', JSON.stringify(mig.m4));

 /* ===== 2. la date dérivée =============================================== */
 const der=await p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[{id:'d1',categorie:'chantier',libelle:'Trois dates',statut:'1 - À instruire',
     evenements:[{id:'p',date:j[-8],heure:'09:00',duree:60,type:'Visite',statut:'realise'},
                 {id:'q',date:j[4],heure:'14:00',duree:90,type:'Intervention',statut:'prevu'},
                 {id:'r',date:j[12],heure:'08:00',duree:30,type:'Réunion',statut:'prevu'}]}];
   D.chantiers.forEach(syncDates);
   const c=D.chantiers[0], o={ref:c.date,heure:c.heure,duree:c.duree};
   /* on annule le prochain : la référence doit glisser au suivant */
   c.evenements[1].statut='annule'; syncDates(c);
   o.apresAnnul=c.date;
   /* tout passé : la référence retombe sur le dernier */
   c.evenements.forEach(e=>{ e.date=j[-8]; e.statut='realise' }); syncDates(c);
   o.toutPasse=c.date;
   return o;
 },{j:JR});
 T('la date de référence est le prochain événement', der.ref===JR[4], der.ref);
 T('  avec son heure et sa durée', der.heure==='14:00' && der.duree===90);
 T('  annuler le prochain fait glisser la référence', der.apresAnnul===JR[12], der.apresAnnul);
 T('  tout au passé : la référence est le dernier', der.toutPasse===JR[-8], der.toutPasse);

 /* ===== 3. le pilotage =================================================== */
 const pil=await p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[
    {id:'p1',categorie:'chantier',libelle:'À venir',statut:'1 - À instruire',
     evenements:[{id:'a',date:j[5],heure:'10:00',duree:60,type:'Intervention',statut:'prevu'}]},
    {id:'p2',categorie:'chantier',libelle:'Seule date annulée',statut:'1 - À instruire',
     evenements:[{id:'b',date:j[5],heure:'10:00',duree:60,type:'Réunion',statut:'annule'}]},
    {id:'p3',categorie:'chantier',libelle:'Que du passé',statut:'1 - À instruire',
     evenements:[{id:'c',date:j[-6],heure:'10:00',duree:60,type:'Visite',statut:'realise'}]},
    {id:'p4',categorie:'chantier',libelle:'Passé mais tâche ouverte',statut:'1 - À instruire',
     evenements:[{id:'d',date:j[-6],heure:'10:00',duree:60,type:'Visite',statut:'realise'}]},
    {id:'p5',categorie:'chantier',libelle:'Aujourd’hui',statut:'1 - À instruire',
     evenements:[{id:'e',date:j[0],heure:'10:00',duree:60,type:'Intervention',statut:'prevu'}]}];
   D.notes=[{id:'n1',date:j[-3],heure:'09:00',type:'',chantier_id:'p4',rubrique_id:'',contenu:'',
     duree:0,suite:{texte:'Relancer',echeance:j[2],fait:false}}];
   D.chantiers.forEach(syncDates);
   return nonPilotes(false).map(c=>c.libelle);
 },{j:JR});
 T('un événement à venir pilote', pil.indexOf('À venir')<0, pil.join(', '));
 T('  aujourd’hui compte comme à venir', pil.indexOf('Aujourd’hui')<0);
 T('  une tâche ouverte pilote aussi', pil.indexOf('Passé mais tâche ouverte')<0);
 T('une seule date, annulée, ne pilote plus', pil.indexOf('Seule date annulée')>=0, pil.join(', '));
 T('  du passé seulement non plus', pil.indexOf('Que du passé')>=0);
 T('  et rien d’autre n’est signalé', pil.length===2, pil.join(', '));

 /* ===== 4. les vues listent chaque événement ============================= */
 const vues=await p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[
    {id:'v1',categorie:'chantier',libelle:'Triple journée',statut:'1 - À instruire',
     evenements:[{id:'a',date:j[0],heure:'15:00',duree:45,type:'Intervention',statut:'prevu'},
                 {id:'b',date:j[0],heure:'09:00',duree:60,type:'Visite',statut:'prevu'},
                 {id:'c',date:j[0],heure:'11:00',duree:30,type:'Réunion',statut:'annule'}]},
    {id:'v2',categorie:'chantier',libelle:'Archivée',statut:'1 - À instruire',archive:j[-1],
     evenements:[{id:'d',date:j[0],heure:'10:00',duree:60,type:'Visite',statut:'prevu'}]}];
   D.chantiers.forEach(syncDates);
   const jr=chantiersDu(j[0]), ix=indexCalendrier();
   return {n:jr.length, ordre:jr.map(c=>c.heure).join(','), types:jr.map(c=>c.evt_type).join(','),
           cal:(ix.rdv[j[0]]||[]).length,
           memeId:jr.every(c=>c.id==='v1'),
           intact:D.chantiers[0].evenements.length};
 },{j:JR});
 T('trois événements le même jour donnent trois lignes', vues.n===2,
   vues.n+' lignes (la troisième est annulée)');
 T('  triées par heure', vues.ordre==='09:00,15:00', vues.ordre);
 T('  chacune porte son type', vues.types==='Visite,Intervention', vues.types);
 T('  l’annulé n’y est pas, mais reste dans la fiche', vues.intact===3, ''+vues.intact);
 T('  une activité archivée reste hors planning', vues.memeId);
 T('le calendrier compte les mêmes', vues.cal===2, ''+vues.cal);

 /* ===== 5. la fiche ====================================================== */
 await p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[{id:'f1',categorie:'chantier',libelle:'Fiche',statut:'1 - À instruire',
     evenements:[{id:'x',date:j[6],heure:'14:00',duree:90,type:'Intervention',statut:'prevu'}]}];
   D.chantiers.forEach(syncDates); rendre(); editerChantier('f1');
 },{j:JR});
 await p.waitForTimeout(500);
 const fi=await p.evaluate(()=>({
   gele:document.querySelector('#modCorps [name="date"]').disabled,
   heureGelee:document.querySelector('#modCorps [name="heure"]').disabled,
   dureeGelee:document.querySelector('#modCorps [name="duree"]').disabled,
   valeur:document.querySelector('#modCorps [name="date"]').value,
   bouton:!!document.querySelector('[data-act="fiche-evt"]'),
   lignes:document.querySelectorAll('[data-evtetat]').length,
   modif:document.querySelectorAll('[data-evtmod]').length,
   supp:document.querySelectorAll('[data-evtsup]').length
 }));
 T('la fiche gèle Date, Heure et Durée', fi.gele && fi.heureGelee && fi.dureeGelee);
 T('  en affichant l’événement de référence', fi.valeur===JR[6], fi.valeur);
 T('  le bouton + Événement est là', fi.bouton);
 T('  chaque événement a son état, Modifier et Supprimer',
   fi.lignes===1 && fi.modif===1 && fi.supp===1);

 /* ajout d'un second événement par le formulaire */
 await p.click('[data-act="fiche-evt"]'); await p.waitForTimeout(350);
 await p.fill('#fevDate',JR[9]); await p.fill('#fevHeure','08:30');
 await p.fill('#fevDuree','45'); await p.fill('#fevLib','Réception');
 await p.click('[data-act="fiche-add-evt"]'); await p.waitForTimeout(500);
 const ap=await p.evaluate(()=>{
   const c=chantierPar('f1');
   return {n:c.evenements.length, ref:c.date,
     lib:(c.evenements.find(e=>e.date!=='')||{}).libelle,
     rouvert:document.getElementById('modale').open};
 });
 T('ajouter un événement depuis la fiche le conserve', ap.n===2, ''+ap.n);
 T('  la fiche se rouvre dessus', ap.rouvert===true);
 T('  la date de référence reste le plus proche', ap.ref===JR[6], ap.ref);

 /* changement d'état par le menu déroulant */
 await p.selectOption('[data-evtetat="x"]','realise'); await p.waitForTimeout(500);
 T('passer un événement en réalisé le marque',
   await p.evaluate(()=>chantierPar('f1').evenements.find(e=>e.id==='x').statut==='realise'));

 /* suppression */
 const avant=await p.evaluate(()=>chantierPar('f1').evenements.length);
 await p.click('[data-evtsup="x"]'); await p.waitForTimeout(500);
 const apres=await p.evaluate(()=>({n:chantierPar('f1').evenements.length,ref:chantierPar('f1').date}));
 T('supprimer un événement le retire', apres.n===avant-1, avant+' → '+apres.n);
 T('  et la date de référence suit', apres.ref===JR[9], apres.ref);

 /* ===== 6. la création reste saisissable ================================= */
 await p.evaluate(()=>{ fermerModale(); nouveauChantier(null,'chantier') });
 await p.waitForTimeout(450);
 const cr=await p.evaluate(()=>({
   gele:document.querySelector('#modCorps [name="date"]').disabled,
   /* v1.7 : le type d'evenement n'a plus de champ a lui. C'est le champ de la
      categorie — « Type d'intervention » — qui le porte, et il compose le premier
      evenement a la creation. */
   ancien:!!document.querySelector('#modCorps [name="evt_type"]'),
   type:!!document.querySelector('#modCorps [name="type"]:not([disabled])'),
   liste:(document.querySelector('#modCorps [name="type"]')||{}).dataset
 }));
 T('à la création, Date reste saisissable', cr.gele===false);
 T('  le champ de la catégorie porte le type', cr.type);
 T('  il puise dans la liste de la catégorie',
   cr.liste && cr.liste.liste==='types_intervention', cr.liste && cr.liste.liste);
 T('  l’ancien champ séparé a disparu', cr.ancien===false);
 await p.fill('#modCorps [name="libelle"]','Créée à la main');
 await p.fill('#modCorps [name="date"]',JR[7]);
 await p.evaluate(()=>{
   const b=[...document.querySelectorAll('#modPied button')].find(x=>/Créer/.test(x.textContent));
   b.click();
 });
 await p.waitForTimeout(450);
 const neuf=await p.evaluate(()=>{
   const c=D.chantiers.find(x=>x.libelle==='Créée à la main');
   return c?{n:(c.evenements||[]).length,date:c.date,e:(c.evenements||[])[0]}:null;
 });
 T('créer une activité crée son premier événement', !!neuf && neuf.n===1, JSON.stringify(neuf));
 T('  à la date saisie', !!neuf && neuf.date===JR[7], neuf?neuf.date:'—');

 /* ===== 7. l'import garde son propre événement =========================== */
 const imp=await p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   const c={id:'i1',categorie:'chantier',libelle:'Importé',statut:'1 - À instruire',evenements:[]};
   D.chantiers=[c];
   evtImport(c,j[4]);
   c.evenements.push(evtNormaliser({date:j[8],type:'Réunion'},'chantier'));  /* posée à la main */
   evtImport(c,j[6]);                       /* le fichier change de date */
   const o={n:c.evenements.length, mains:c.evenements.filter(e=>!e.source).length,
            imp:(c.evenements.find(e=>e.source==='import')||{}).date};
   evtImport(c,"");                         /* marqueur FAIT : l'import retire la sienne */
   o.apresFait=c.evenements.length;
   o.resteMain=(c.evenements[0]||{}).date;
   return o;
 },{j:JR});
 T('l’import pose son propre événement', imp.imp===JR[6], imp.imp);
 T('  réimporter déplace le sien, pas les autres', imp.n===2 && imp.mains===1,
   imp.n+' événements, '+imp.mains+' à la main');
 T('  un marqueur FAIT retire le sien seulement', imp.apresFait===1 && imp.resteMain===JR[8],
   imp.apresFait+' restant · '+imp.resteMain);

 /* ===== 8. la liste des types est gérable ================================ */
 const lst=await p.evaluate(()=>{
   fichierCharge=true; D=vierge();
   vueActive='donnees'; ongletOptions='listes'; rendre();
   const t=document.querySelector('[data-liste-txt="types_evenement"]');
   return {present:!!t, valeurs:t?t.value.split('\n').length:0, def:typesEvt().length};
 });
 T('les types d’événement se règlent comme les autres listes', lst.present);
 T('  avec les valeurs par défaut', lst.valeurs===lst.def && lst.def>=5, lst.def+' types');

 /* ===== 9. mise en page ================================================== */
 for(const w of [1280,390]){
   await p.setViewportSize({width:w,height:1000});
   await p.evaluate(({j})=>{
     fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
     D.chantiers=[{id:'L',categorie:'chantier',libelle:'Mise en page',statut:'1 - À instruire',
       evenements:[{id:'z',date:j[2],heure:'09:00',duree:60,type:'Intervention',statut:'prevu'}]}];
     D.chantiers.forEach(syncDates); rendre(); editerChantier('L');
   },{j:JR});
   await p.waitForTimeout(450);
   await p.click('[data-act="fiche-evt"]'); await p.waitForTimeout(350);
   const m=await p.evaluate(()=>{
     const f=document.getElementById('ficheEvt');
     const d=document.getElementById('modale');
     return {deb:f.scrollWidth>f.clientWidth+1,
             dedans:f.getBoundingClientRect().right<=d.getBoundingClientRect().right+1,
             page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : le formulaire d’événement tient dans la fenêtre`, !m.deb && m.dedans);
   T(`${w}px : pas de défilement latéral`, !m.page);
   await p.screenshot({path:'/tmp/evt'+w+'.png'});
   await p.evaluate(()=>fermerModale());
 }

 T('l’aide décrit les événements',
   await p.evaluate(()=>AIDE.some(r=>/Les événements/.test(r.html)
     && /non pilot/.test(r.html))));
 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,3).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
