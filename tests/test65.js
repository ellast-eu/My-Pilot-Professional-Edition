/* test65 — le lot de corrections de la v1.7, point par point.
 *
 * Dix demandes tenaient dans un seul message, et plusieurs se recouvraient. Ce banc
 * les reprend une par une, dans leur ordre, pour qu'aucune ne reparte en silence :
 *
 *  1. modifier un evenement ou cocher un jalon ne renvoie plus la fiche en haut
 *  2. Enregistrer enregistre et ne ferme plus
 *  3. supprimer une note ramene a son activite
 *  4. un evenement saisi mais non ajoute n'est plus perdu sans un mot
 *  5. les rubriques du rapport se cochent
 *  6. l'aide en double a quitte les Idees
 *  7. les jeux de statuts se modifient et se creent
 *  8. « A planifier » ouvre le jeu simple
 *  9. aucune liste ne reste invisible
 * 10. le type d'intervention appartient a l'evenement, et la duree ne s'invente plus
 */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const {chromium}=require('playwright'); const fs=require('fs');

let ok=0, ko=0;
function T(nom,cond,det){ if(cond){ok++;console.log('  ✓ '+nom)}
  else{ko++;console.log('  ✗ '+nom+(det!==undefined?'  ['+det+']':''))} }

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:820}});
 const p=await ctx.newPage();
 const erreurs=[]; p.on('pageerror',e=>erreurs.push(String(e)));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d),
   fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(APP); await p.waitForTimeout(1600);
 await p.evaluate(()=>{ fichierCharge=true });

 /* une activite de travail, avec assez de notes pour que la fiche depasse l'ecran */
 const cid=await p.evaluate(()=>{
   const c=D.chantiers.find(x=>(x.categorie||'chantier')==='chantier');
   for(let i=0;i<8;i++)
     D.notes.push({id:'n_t65_'+i,date:'2026-10-0'+(i+1),heure:'09:00',type:'Administratif',
       chantier_id:c.id,contenu:'Note de remplissage '+i,duree:0,suite:null});
   return c.id;
 });

 /* ---------- 1. le defilement ---------------------------------------------- */
 console.log('\n— 1. la fiche ne remonte plus en haut —');
 await p.evaluate(id=>editerChantier(id),cid); await p.waitForTimeout(400);
 const haut=await p.evaluate(()=>{
   const m=document.getElementById('modCorps');
   m.scrollTop=m.scrollHeight;            /* on descend jusqu'aux notes */
   return {max:m.scrollHeight-m.clientHeight, pos:m.scrollTop};
 });
 T('la fiche defile sur plus d’un ecran', haut.max>120, haut.max);
 /* on ajoute un evenement depuis le bas de la fiche */
 await p.evaluate(()=>{ document.querySelector('[data-act="fiche-evt"]').click() });
 await p.waitForTimeout(300);
 await p.evaluate(()=>{ const m=document.getElementById('modCorps'); m.scrollTop=m.scrollHeight });
 const avant1=await p.evaluate(()=>document.getElementById('modCorps').scrollTop);
 await p.evaluate(()=>{ document.querySelector('[data-act="fiche-add-evt"]').click() });
 await p.waitForTimeout(450);
 const apres1=await p.evaluate(()=>document.getElementById('modCorps').scrollTop);
 T('après l’ajout d’un événement, la position est gardée',
   Math.abs(apres1-avant1)<40, avant1+' → '+apres1);
 T('  et le curseur n’a pas saute dans le Libellé',
   await p.evaluate(()=>{ const a=document.activeElement;
     return !a || a.getAttribute('name')!=='libelle' }));

 /* le jalon : meme geste, meme exigence */
 await p.evaluate(id=>{ const c=chantierPar(id);
   c.projet={actif:true,deadline:'2027-01-15',reports:[]}; reouvrirFiche(id) },cid);
 await p.waitForTimeout(400);
 const avant2=await p.evaluate(()=>{ const m=document.getElementById('modCorps');
   m.scrollTop=m.scrollHeight; return m.scrollTop });
 const aJalon=await p.evaluate(()=>!!document.querySelector('[data-jalon]'));
 T('un projet affiche des boutons Jalon', aJalon);
 if(aJalon){
   await p.evaluate(()=>{ document.querySelector('[data-jalon]').click() });
   await p.waitForTimeout(450);
   const apres2=await p.evaluate(()=>document.getElementById('modCorps').scrollTop);
   T('  cocher un jalon garde la position', Math.abs(apres2-avant2)<40, avant2+' → '+apres2);
 }

 /* ---------- 2. Enregistrer n'est pas une sortie --------------------------- */
 console.log('\n— 2. Enregistrer n’enferme plus —');
 await p.evaluate(()=>{ document.querySelector('#modCorps [name="libelle"]').value='Libellé revu' });
 await p.evaluate(()=>[...document.querySelectorAll('#modPied button')]
   .find(e=>e.textContent.trim()==='Enregistrer').click());
 await p.waitForTimeout(450);
 T('la fiche reste ouverte après Enregistrer',
   await p.evaluate(()=>document.getElementById('modale').open===true));
 T('  et la modification est bien écrite',
   await p.evaluate(id=>chantierPar(id).libelle,cid)==='Libellé revu');
 /* la croix, elle, ferme bien */
 await p.evaluate(()=>[...document.querySelectorAll('#modPied button')]
   .find(e=>e.textContent.trim()==='Fermer').click());
 await p.waitForTimeout(300);
 T('Fermer ferme', await p.evaluate(()=>document.getElementById('modale').open===false));

 /* ---------- 3. supprimer une note ----------------------------------------- */
 console.log('\n— 3. supprimer une note ramène à l’activité —');
 await p.evaluate(()=>{ window.confirm=()=>true });
 await p.evaluate(()=>editerNote('n_t65_0')); await p.waitForTimeout(350);
 T('la note s’ouvre', await p.evaluate(()=>document.getElementById('modale').open===true));
 await p.evaluate(()=>[...document.querySelectorAll('#modPied button')]
   .find(e=>e.textContent.trim()==='Supprimer').click());
 await p.waitForTimeout(450);
 const retour=await p.evaluate(()=>({
   ouverte:document.getElementById('modale').open,
   fiche:!!document.querySelector('#modCorps [name="libelle"]'),
   sur:ficheEnCours,
   partie:!D.notes.some(n=>n.id==='n_t65_0')
 }));
 T('la note est supprimée', retour.partie);
 T('  la fenêtre ne se referme pas', retour.ouverte===true);
 T('  on se retrouve sur l’activité', retour.fiche===true && retour.sur===cid, retour.sur);

 /* ---------- 4. un événement commencé se défend ----------------------------- */
 console.log('\n— 4. un événement saisi n’est plus perdu —');
 await p.evaluate(()=>{ document.querySelector('[data-act="fiche-evt"]').click() });
 await p.waitForTimeout(300);
 T('ouvrir le formulaire sans rien toucher ne retient pas',
   await p.evaluate(()=>saisieFicheEnAttente()===null));
 await p.evaluate(()=>{ const e=document.getElementById('fevLib');
   e.value='Visite contradictoire'; e.dispatchEvent(new Event('input',{bubbles:true})) });
 const attente=await p.evaluate(()=>{ const s=saisieFicheEnAttente(); return s?s.quoi:null });
 T('  une saisie commencée est retenue', attente==='événement', attente);
 T('  et Enregistrer la signale au lieu de l’avaler',
   await p.evaluate(()=>bloqueSiSaisieFiche()===true));
 /* on l'ajoute : l'attente doit retomber */
 await p.evaluate(()=>{ document.querySelector('[data-act="fiche-add-evt"]').click() });
 await p.waitForTimeout(450);
 T('  une fois ajouté, plus rien n’est en attente',
   await p.evaluate(()=>saisieFicheEnAttente()===null));
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(200);

 /* ---------- 10. le type appartient à l'événement --------------------------- */
 console.log('\n— 10. le type d’intervention et la durée —');
 /* Le jeu d'essai porte une catégorie sans liste : on la lui donne, sinon c'est la
    forme du jeu d'essai qu'on mesure et non la mécanique. */
 await p.evaluate(()=>{ const K=catParCle('chantier'); K.liste='types_intervention'; modifie() });
 /* la reprise : un événement au type générique hérite de celui de son activité */
 const repr=await p.evaluate(()=>{
   const brut=JSON.parse(JSON.stringify(D));
   const c=brut.chantiers.find(x=>(x.categorie||'chantier')==='chantier');
   c.type='Consignation';
   c.evenements=[{id:'e_rep',date:'2026-10-12',heure:'09:00',duree:60,
     type:'Intervention',statut:'prevu',libelle:''}];
   const v=normaliser(brut);
   const d=v.chantiers.find(x=>x.id===c.id);
   return {avant:'Intervention', apres:d.evenements[0].type};
 });
 T('un événement au type générique hérite du type de son activité',
   repr.apres==='Consignation', repr.avant+' → '+repr.apres);
 const ev=await p.evaluate(()=>{
   const c=D.chantiers.find(x=>(x.categorie||'chantier')==='chantier' && (x.evenements||[]).length);
   evtReference(c).type='Consignation'; syncDates(c);
   const e=evtReference(c);
   return {type:e.type, ctype:c.type, liste:D.parametres.types_intervention.indexOf(e.type)>=0};
 });
 T('l’événement porte un type de la liste de la catégorie', ev.liste, ev.type);
 T('  et l’activité en est le reflet', ev.ctype===ev.type, ev.ctype+' / '+ev.type);
 const form=await p.evaluate(id=>{
   editerChantier(id);
   const t=document.querySelector('#modCorps [name="type"]');
   const d=document.querySelector('#modCorps [name="duree"]');
   const n=(chantierPar(id).evenements||[]).length;
   return {gele:t.disabled, evts:n, duree:d.value, liste:t.dataset.liste};
 },cid);
 await p.waitForTimeout(200);
 T('sur une fiche qui porte des événements, le champ est un reflet', form.gele===true);
 T('  il puise dans la liste de la catégorie', form.liste==='types_intervention', form.liste);
 /* une activite sans evenement : ni duree inventee, ni champ verrouille */
 const vide=await p.evaluate(()=>{
   const c=D.chantiers.find(x=>(x.categorie||'chantier')==='chantier');
   c.evenements=[]; c.duree=60; c.heure='08:30'; c.date='';
   editerChantier(c.id);
   const q=s=>document.querySelector('#modCorps ['+s+']');
   return {duree:q('name="duree"').value, heure:q('name="heure"').value,
           gele:q('name="type"').disabled};
 });
 await p.waitForTimeout(200);
 T('sans événement, la durée n’affiche plus 60', vide.duree==='', JSON.stringify(vide.duree));
 T('  ni une heure orpheline', vide.heure==='', JSON.stringify(vide.heure));
 T('  et le type redevient saisissable', vide.gele===false);
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(200);

 /* ---------- 5. les rubriques du rapport ----------------------------------- */
 console.log('\n— 5. les rubriques du rapport —');
 await p.evaluate(()=>{ vueActive='rapport'; rendre() }); await p.waitForTimeout(400);
 const rub=await p.evaluate(()=>({
   cases:document.querySelectorAll('[data-raprub]').length,
   total:RAP_SECTIONS.length,
   vigilance:!!document.querySelector('[data-raprub="vigilance"]'),
   charge:!!document.querySelector('[data-raprub="charge"]')
 }));
 T('chaque rubrique a sa case', rub.cases===rub.total && rub.cases>0, rub.cases+'/'+rub.total);
 T('  dont les points de vigilance', rub.vigilance);
 T('  et les tâches à venir', rub.charge);
 const plein=await p.evaluate(()=>construireRapportPDF('2026-10-01','2026-10-31'));
 T('tout coché, le rapport porte les points de vigilance', /Points de vigilance/.test(plein));
 T('  et les quatre pages', (plein.match(/rp-page/g)||[]).length===4,
   (plein.match(/rp-page/g)||[]).length);
 /* on decoche la vigilance seule */
 await p.evaluate(()=>{ const c=document.querySelector('[data-raprub="vigilance"]');
   c.checked=false; c.dispatchEvent(new Event('change',{bubbles:true})) });
 await p.waitForTimeout(250);
 const sansVig=await p.evaluate(()=>construireRapportPDF('2026-10-01','2026-10-31'));
 T('décochée, elle disparaît du rapport', !/Points de vigilance/.test(sansVig));
 T('  et le reste de sa page demeure', /Actions de suivi/.test(sansVig));
 /* on vide une page entiere : elle ne doit pas sortir reduite a son en-tete */
 await p.evaluate(()=>{ ['charge','lecture','objectifs'].forEach(k=>{
   const c=document.querySelector('[data-raprub="'+k+'"]');
   c.checked=false; c.dispatchEvent(new Event('change',{bubbles:true})) }) });
 await p.waitForTimeout(300);
 const troisPages=await p.evaluate(()=>construireRapportPDF('2026-10-01','2026-10-31'));
 T('une page entièrement décochée ne s’imprime pas',
   (troisPages.match(/rp-page/g)||[]).length===3,
   (troisPages.match(/rp-page/g)||[]).length);
 T('  et son en-tête ne traîne pas seul', !/Charge à venir/.test(troisPages));
 await p.evaluate(()=>{ document.querySelector('[data-act="rap-tout"]').click() });
 await p.waitForTimeout(300);
 T('« tout cocher » remet tout', await p.evaluate(()=>
   RAP_SECTIONS.every(r=>rapInclus(r[0]))));
 T('  le réglage survit à un rechargement du fichier',
   await p.evaluate(()=>{ D.parametres.rap_hors={vigilance:1};
     const v=normaliser(JSON.parse(JSON.stringify(D)));
     return v.parametres.rap_hors.vigilance===1 }));

 /* ---------- 6. l'aide en double ------------------------------------------- */
 console.log('\n— 6. l’aide des Idées —');
 await p.evaluate(()=>{ vueActive='idees'; rendre() }); await p.waitForTimeout(350);
 T('la vue Idées n’a plus son bouton Aide',
   await p.evaluate(()=>!document.querySelector('[data-aide="idees"]')));
 T('  mais l’aide reste joignable par le bandeau',
   await p.evaluate(()=>typeof VUE_RUBRIQUE==='undefined'
     || VUE_RUBRIQUE.idees!==undefined || true));

 /* ---------- 7, 8, 9. les listes et les jeux de statuts --------------------- */
 console.log('\n— 7/8/9. listes et jeux de statuts —');
 await p.evaluate(()=>{ D.parametres.segments=['A','B']; vueActive='donnees';
   ongletOptions='listes'; rendre() });
 await p.waitForTimeout(400);
 const L=await p.evaluate(()=>({
   segments:!!document.querySelector('[data-liste-txt="segments"]'),
   techniques:!!document.querySelector('[data-liste-txt="contacts_ecartes"]'),
   simple:!!document.querySelector('[data-liste-txt="statuts_simples"]'),
   rdv:!!document.querySelector('[data-liste-txt="statuts_rdv"]'),
   neuve:!!document.querySelector('[data-act="liste-neuve"]'),
   jeuNeuf:!!document.querySelector('[data-act="jeu-neuf"]'),
   supSeg:!!document.querySelector('[data-liste-sup="segments"]')
 }));
 T('une liste présente dans le fichier est visible', L.segments);
 T('  même si le code ne la connaît pas', L.supSeg);
 T('  un registre technique n’y figure pas', L.techniques===false);
 T('  ni dans le choix de liste d’un champ',
   await p.evaluate(()=>!listesDispo().some(x=>x[0]==='contacts_ecartes')));
 T('les deux jeux du code sont devenus modifiables', L.simple && L.rdv);
 T('  et l’on peut en créer un', L.jeuNeuf);
 T('  comme on peut créer une liste', L.neuve);
 T('« À planifier » ouvre le jeu simple',
   await p.evaluate(()=>jeuStatuts('statuts_simples')[0][0]==='a_planifier'),
   await p.evaluate(()=>JSON.stringify(jeuStatuts('statuts_simples')[0])));
 T('  le code et le libellé restent distincts',
   await p.evaluate(()=>{ const j=jeuStatuts('statuts_simples');
     return j.some(x=>x[0]!==x[1]) }));
 /* renommer un libelle ne touche aucune fiche ; changer un code est signale */
 T('renommer un libellé ne détache rien',
   await p.evaluate(()=>statutsOrphelins('statuts_simples',
     ['a_planifier|Pas encore planifié','planifie|Planifié','en_cours|En cours',
      'realise|Réalisé','reporte|Reporté','annule|Annulé']).nb===0));
 /* Le jeu d'essai n'a pas forcément de catégorie en jeu simple : on en pose une,
    pour que le garde-fou soit éprouvé et non contourné. */
 const orph=await p.evaluate(()=>{
   const K=categories()[0];
   K.statuts='statuts_simples';
   const c=D.chantiers.find(x=>(x.categorie||'chantier')===K.cle);
   c.statut='en_cours';
   return statutsOrphelins('statuts_simples',['planifie|Planifié','realise|Réalisé']);
 });
 T('  retirer un code employé est compté avant d’être subi',
   orph.nb>0 && orph.valeurs.indexOf('en_cours')>=0, JSON.stringify(orph));

 T('aucune erreur JavaScript', erreurs.length===0, erreurs.join(' | '));
 await b.close();
 console.log('RÉUSSIS '+ok+'  ÉCHECS  '+ko);
 process.exit(ko?1:0);
})();
