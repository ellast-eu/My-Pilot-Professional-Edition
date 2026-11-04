const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
/* Lot 3 — module Idées : parcours complet */
const {chromium}=require('playwright'); const fs=require('fs');
const ok=[],ko=[];
const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+'');
 await p.waitForTimeout(1600);
 await p.evaluate(()=>{fichierCharge=true; rendre()});
 await p.waitForTimeout(300);

 /* 1. l'onglet existe et est à sa place */
 const nav=await p.evaluate(()=>Array.from(document.querySelectorAll('#nav button')).map(b=>b.dataset.vue));
 T('onglet Idées présent', nav.includes('idees'), nav.join(','));
 T('onglet Idées après Activités', nav[nav.indexOf('idees')-1]==='chantiers');
 T('un seul onglet Idées', nav.filter(v=>v==='idees').length===1);

 /* 2. le document vierge et la normalisation */
 const init=await p.evaluate(()=>({i:Array.isArray(D.idees),u:Array.isArray(D.idees_unifiees),
   s:D.parametres.idees&&D.parametres.idees.seuil}));
 T('D.idees initialisé', init.i===true);
 T('D.idees_unifiees initialisé', init.u===true);
 T('seuil par défaut 0.22', init.s===0.22, ''+init.s);

 /* 3. dépôt d'idées */
 await p.click('#nav button[data-vue="idees"]');
 await p.waitForTimeout(300);
 const jeu=[
  ['Relancer les propriétaires non répondants','courrier de relance après six mois sans réponse du propriétaire'],
  ['Courrier type pour les non réponses','modèle de courrier de relance propriétaire réutilisable'],
  ['Relance propriétaire par téléphone','appeler le propriétaire avant le courrier de relance'],
  ['Cartographier les communes à risque','repérer les communes où les mises en danger reviennent'],
  ['Préparer la réunion annuelle entreprises',''],
 ];
 for(const [t,n] of jeu){
   await p.fill('#idTitre',t);
   if(n) await p.fill('#idNote',n);
   await p.click('[data-act="id-add"]');
   await p.waitForTimeout(140);
 }
 const n1=await p.evaluate(()=>D.idees.length);
 T('5 idées déposées', n1===5, ''+n1);
 const vide=await p.evaluate(()=>({t:document.getElementById('idTitre').value,
   n:document.getElementById('idNote').value}));
 T('les champs se vident après dépôt', vide.t==='' && vide.n==='');

 /* 4. regroupement local */
 const M=await p.evaluate(()=>{const m=metaIdees();
   return {n:m.metas.length,tailles:m.metas.map(x=>x.ideas.length),titres:m.metas.map(x=>x.titre)}});
 T('un groupe se forme sur les relances', M.n>=1, JSON.stringify(M));
 T('le groupe contient au moins 2 idées', M.tailles.some(t=>t>=2), JSON.stringify(M.tailles));
 const seuls=await p.evaluate(()=>{const m=metaIdees();
   return m.libres.filter(i=>!m.par[i.id]).map(i=>i.titre)});
 T('la réunion annuelle reste isolée', seuls.some(t=>/réunion/i.test(t)), JSON.stringify(seuls));

 /* 5. la carte en bulles se dessine */
 await p.waitForTimeout(300);
 const bul=await p.evaluate(()=>{
   const g=document.querySelectorAll('#idSvg .id-b');
   const r=document.getElementById('idSvg').getBoundingClientRect();
   const pos=Array.from(g).map(x=>{
     const m=/translate\(([-\d.]+),([-\d.]+)\)/.exec(x.getAttribute('transform')||'');
     const c=x.querySelector('circle,path');
     return {x:m?+m[1]:NaN,y:m?+m[2]:NaN,r:+(c.getAttribute('r')||31)};
   });
   let chevauche=0;
   for(let i=0;i<pos.length;i++) for(let j=i+1;j<pos.length;j++){
     const d=Math.hypot(pos[i].x-pos[j].x,pos[i].y-pos[j].y);
     if(d < pos[i].r+pos[j].r-2) chevauche++;
   }
   return {n:g.length,h:Math.round(r.height),w:Math.round(r.width),chevauche,
     place:pos.filter(q=>isNaN(q.x)).length,
     membranes:document.querySelectorAll('#idSvg .id-mem').length};
 });
 T('5 bulles dessinées', bul.n===5, ''+bul.n);
 T('la carte a une hauteur visible', bul.h>150, bul.h+'px');
 T('aucune bulle ne chevauche', bul.chevauche===0, ''+bul.chevauche);
 T('toutes les bulles sont positionnées', bul.place===0, ''+bul.place);
 T('une membrane entoure le groupe', bul.membranes===1, ''+bul.membranes);

 /* 6. sélection par clic */
 await p.click('#idSvg .id-b');
 await p.waitForTimeout(250);
 const s1=await p.evaluate(()=>Object.keys(selIdees).length);
 T('un clic sélectionne', s1===1, ''+s1);
 const btn=await p.$('[data-act="id-crist"]');
 T('le bouton Cristalliser apparaît', !!btn);

 /* 7. sélection d'un groupe entier */
 await p.evaluate(()=>{selIdees={};rendre()});
 await p.waitForTimeout(200);
 await p.click('button[data-idgrp]');
 await p.waitForTimeout(250);
 const s2=await p.evaluate(()=>Object.keys(selIdees).length);
 T('le bouton de groupe sélectionne tout le groupe', s2>=2, ''+s2);

 /* 8. vue tableau */
 await p.click('[data-act="id-tableau"]');
 await p.waitForTimeout(250);
 const tab=await p.evaluate(()=>({l:document.querySelectorAll('tr[data-idee]').length,
   coch:document.querySelectorAll('input.idsel:checked').length}));
 T('le tableau liste les 5 idées', tab.l===5, ''+tab.l);
 T('les cases reflètent la sélection', tab.coch===s2, tab.coch+'/'+s2);

 /* 9. la case à cocher ne déclenche pas l'ouverture de la fiche */
 const avant=await p.evaluate(()=>Object.keys(selIdees).length);
 await p.click('input.idsel');
 await p.waitForTimeout(250);
 const apres=await p.evaluate(()=>({n:Object.keys(selIdees).length,
   modale:document.getElementById('modale').open}));
 T('la case change la sélection', apres.n!==avant, avant+'→'+apres.n);
 T('la case n’ouvre pas la fiche', apres.modale===false);

 /* 10. ouverture d'une fiche par clic sur la ligne */
 await p.click('tr[data-idee] td:nth-child(2)');
 await p.waitForTimeout(250);
 const fic=await p.evaluate(()=>({o:document.getElementById('modale').open,
   t:document.getElementById('modTitre').textContent,
   v:(document.querySelector('[name="i_titre"]')||{}).value}));
 T('la fiche idée s’ouvre', fic.o===true && fic.t==='Idée', JSON.stringify(fic));
 T('le titre est pré-rempli', !!fic.v, fic.v);

 /* 11. édition */
 await p.fill('[name="i_titre"]','Titre corrigé');
 await p.fill('[name="i_note"]','note corrigée');
 const boutons=await p.evaluate(()=>Array.from(document.querySelectorAll('#modPied button')).map(b=>b.textContent));
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>b.textContent==='Enregistrer').click()});
 await p.waitForTimeout(300);
 const edit=await p.evaluate(()=>D.idees.some(i=>i.titre==='Titre corrigé'&&i.note==='note corrigée'));
 T('l’édition est enregistrée', edit, boutons.join('|'));

 /* 12. le curseur de regroupement */
 await p.evaluate(()=>{vueIdeesMode='bulles';rendre()});
 await p.waitForTimeout(200);
 await p.evaluate(()=>{const e=document.getElementById('idSeuil'); e.value='0.45';
   e.dispatchEvent(new Event('input',{bubbles:true}))});
 await p.waitForTimeout(300);
 const strict=await p.evaluate(()=>({s:D.parametres.idees.seuil,n:metaIdees().metas.length,
   lib:document.querySelector('.etiq.gris')?document.querySelector('.etiq.gris').textContent:''}));
 T('le seuil est enregistré', Math.abs(strict.s-0.45)<0.001, ''+strict.s);
 T('un seuil strict réduit les groupes', strict.n<=M.n, strict.n+' vs '+M.n);
 T('le libellé passe à strict', strict.lib==='strict', strict.lib);
 await p.evaluate(()=>{const e=document.getElementById('idSeuil'); e.value='0.22';
   e.dispatchEvent(new Event('input',{bubbles:true}))});
 await p.waitForTimeout(250);

 /* 13. cristallisation : l'invite */
 await p.evaluate(()=>{selIdees={}; const m=metaIdees();
   m.metas[0].ideas.forEach(i=>selIdees[i.id]=true); rendre()});
 await p.waitForTimeout(250);
 await p.click('[data-act="id-crist"]');
 await p.waitForTimeout(300);
 const inv=await p.evaluate(()=>({o:document.getElementById('modale').open,
   t:(document.getElementById('crInvite')||{}).value||'',
   rep:!!document.getElementById('crReponse'),
   focus:document.activeElement&&document.activeElement.id}));
 T('la fenêtre de cristallisation s’ouvre', inv.o===true);
 T('l’invite contient le contrat JSON', /premieres_etapes/.test(inv.t) && /points_de_vigilance/.test(inv.t));
 T('l’invite liste les idées', /1\. /.test(inv.t), inv.t.slice(0,80));
 T('l’invite propose les catégories réelles', /categorie":"une valeur parmi/.test(inv.t));
 T('le curseur est dans le champ de réponse', inv.focus==='crReponse', inv.focus);

 /* 14. réponse mal formée */
 await p.fill('#crReponse','je ne sais pas trop');
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>/Intégrer/.test(b.textContent)).click()});
 await p.waitForTimeout(300);
 const mauvais=await p.evaluate(()=>({o:document.getElementById('modale').open,
   u:D.idees_unifiees.length,toast:(function(){var l=document.querySelectorAll('.toast');return l.length?l[l.length-1].textContent:''})()}));
 T('une réponse illisible ne crée rien', mauvais.u===0 && mauvais.o===true, JSON.stringify(mauvais));
 T('un message explique le refus', /illisible/.test(mauvais.toast), mauvais.toast);

 /* 15. réponse valide, entourée de texte et de balises */
 const brut = 'Bien sûr, voici :\n```json\n'+JSON.stringify({
   titre:'Relancer les propriétaires sans réponse',
   synthese:'Les relances se font aujourd\'hui au cas par cas. Un enchaînement unique, téléphone puis courrier type, rendrait le suivi lisible.',
   objectifs:['Un parcours de relance unique','Un modèle de courrier réutilisable'],
   premieres_etapes:['Lister les dossiers sans réponse à six mois','Rédiger le courrier type','Tester sur cinq dossiers'],
   points_de_vigilance:['Garder une trace datée de chaque relance'],
   categorie:'Dossier'
 })+'\n```\nDis-moi si tu veux l\'ajuster.';
 await p.fill('#crReponse',brut);
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>/Intégrer/.test(b.textContent)).click()});
 await p.waitForTimeout(400);
 const cr=await p.evaluate(()=>{const u=D.idees_unifiees[0]||{};
   return {n:D.idees_unifiees.length,titre:u.titre,obj:(u.objectifs||[]).length,
     et:(u.etapes||[]).length,vig:(u.vigilance||[]).length,cat:u.cat,
     abs:D.idees.filter(i=>i.statut==='absorbee').length,
     modale:document.getElementById('modale').open,
     mt:document.getElementById('modTitre').textContent}});
 T('l’idée unifiée est créée', cr.n===1, ''+cr.n);
 T('le JSON est extrait malgré le texte autour', cr.titre==='Relancer les propriétaires sans réponse', cr.titre);
 T('les listes sont reprises', cr.obj===2&&cr.et===3&&cr.vig===1, [cr.obj,cr.et,cr.vig].join('/'));
 T('la catégorie est rattachée à une clé réelle', !!cr.cat && cr.cat!=='Dossier', cr.cat);
 T('les idées sources sont absorbées', cr.abs>=2, ''+cr.abs);
 T('la fiche unifiée s’ouvre aussitôt', cr.modale===true && /Relancer/.test(cr.mt), cr.mt);

 /* 16. les idées absorbées quittent la carte */
 await p.evaluate(()=>{fermerModale();rendre()});
 await p.waitForTimeout(300);
 const reste=await p.evaluate(()=>({libres:metaIdees().libres.length,
   bulles:document.querySelectorAll('#idSvg .id-b').length,
   cristaux:document.querySelectorAll('#idSvg .id-b.cri').length,
   crist:document.querySelectorAll('[data-ideeu]').length}));
 T('les idées absorbées quittent la carte', reste.libres===5-cr.abs, JSON.stringify(reste));
 T('la carte montre les libres plus le cristal', reste.bulles===reste.libres+1,
   reste.bulles+' vs '+reste.libres+'+1');
 T('le cristal est bien un hexagone', reste.cristaux===1, ''+reste.cristaux);
 T('l’idée cristallisée est listée', reste.crist===1, ''+reste.crist);

 /* 17. conversion en activité */
 const nAvant=await p.evaluate(()=>({c:D.chantiers.length,n:D.notes.length}));
 await p.click('[data-ideeu]');
 await p.waitForTimeout(300);
 const fu=await p.evaluate(()=>({o:document.getElementById('modale').open,
   cat:!!document.getElementById('iuCat'),
   li:document.querySelectorAll('.id-liste li').length}));
 T('la fiche unifiée se rouvre', fu.o===true);
 T('le choix de catégorie est proposé', fu.cat===true);
 T('les listes sont affichées', fu.li===6, ''+fu.li);
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>/Créer l/.test(b.textContent)).click()});
 await p.waitForTimeout(500);
 const conv=await p.evaluate(()=>{
   const c=D.chantiers[D.chantiers.length-1];
   const t=D.notes.filter(n=>n.chantier_id===c.id);
   return {dc:D.chantiers.length,dn:D.notes.length,lib:c.libelle,cat:c.categorie,
     statut:c.statut, com:(c.commentaire||'').length, idee:c.idee_id,
     taches:t.length, avecSuite:t.filter(n=>n.suite&&n.suite.texte&&!n.suite.fait).length,
     ech:t.map(n=>n.suite&&n.suite.echeance).filter(Boolean).length,
     ref:t.filter(n=>n.chantier_ref).length,
     u:D.idees_unifiees[0].statut, lien:D.idees_unifiees[0].activite_id===c.id,
     modale:document.getElementById('modale').open,
     mt:document.getElementById('modTitre').textContent};
 });
 T('une activité est créée', conv.dc===nAvant.c+1, nAvant.c+'→'+conv.dc);
 T('le libellé vient de l’idée', /Relancer/.test(conv.lib), conv.lib);
 T('la catégorie choisie est appliquée', !!conv.cat, conv.cat);
 T('le statut est valide', !!conv.statut, conv.statut);
 T('le commentaire reprend synthèse, objectifs et vigilance', conv.com>200, ''+conv.com);
 T('3 tâches sont créées', conv.taches===3, ''+conv.taches);
 T('chaque tâche porte une suite ouverte', conv.avecSuite===3, ''+conv.avecSuite);
 T('chaque tâche a une échéance', conv.ech===3, ''+conv.ech);
 T('chaque note porte la trace du dossier', conv.ref===3, ''+conv.ref);
 T('l’idée unifiée est marquée convertie', conv.u==='convertie', conv.u);
 T('le lien idée → activité est posé', conv.lien===true);
 T('la fiche de l’activité s’ouvre', conv.modale===true);

 /* 18. les tâches arrivent bien dans En attente */
 await p.evaluate(()=>{fermerModale(); vueActive='jour'; horizonAttente=0; rendre()});
 await p.waitForTimeout(400);
 const att=await p.evaluate(()=>{
   const c=D.chantiers[D.chantiers.length-1];
   return document.querySelectorAll('[data-fait]').length>0 &&
     document.body.textContent.indexOf('Lister les dossiers sans réponse')>=0;
 });
 T('les tâches apparaissent dans En attente', att===true);

 /* 19. dissolution */
 await p.evaluate(()=>{vueActive='idees';rendre()});
 await p.waitForTimeout(300);
 await p.click('[data-ideeu]');
 await p.waitForTimeout(250);
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>/Dissoudre/.test(b.textContent)).click()});
 await p.waitForTimeout(400);
 const dis=await p.evaluate(()=>({u:D.idees_unifiees.length,
   libres:D.idees.filter(i=>i.statut==='libre').length,
   chantiers:D.chantiers.length}));
 T('la dissolution retire l’idée unifiée', dis.u===0, ''+dis.u);
 T('les idées d’origine redeviennent libres', dis.libres===5, ''+dis.libres);
 T('l’activité créée n’est pas touchée', dis.chantiers===nAvant.c+1, ''+dis.chantiers);

 /* 20. persistance : enregistrement puis relecture */
 const json=await p.evaluate(()=>serialise('json'));
 const relu=await p.evaluate(j=>{const o=JSON.parse(j); const v=normaliser(o);
   return {i:v.idees.length,u:v.idees_unifiees.length,s:v.parametres.idees.seuil,
     titres:v.idees.map(x=>x.titre).slice(0,2)}}, json);
 T('les idées survivent au cycle fichier', relu.i===5, ''+relu.i);
 T('le seuil survit au cycle fichier', relu.s===0.22, ''+relu.s);

 /* 21. un fichier antérieur sans idées se charge sans erreur */
 const vieux=await p.evaluate(()=>{const o=JSON.parse(serialise('json'));
   delete o.idees; delete o.idees_unifiees; delete o.parametres.idees;
   const v=normaliser(o);
   return {i:v.idees.length,u:v.idees_unifiees.length,s:v.parametres.idees.seuil}});
 T('un fichier antérieur se charge', vieux.i===0 && vieux.u===0 && vieux.s===0.22, JSON.stringify(vieux));

 /* 22. données hostiles dans le fichier */
 const hostile=await p.evaluate(()=>{
   const o=JSON.parse(serialise('json'));
   o.idees=[{titre:'<img src=x onerror=alert(1)>',note:'<script>alert(2)<\/script>'},
            {titre:''},{}];
   o.idees_unifiees=[{titre:'<b>gras</b>',objectifs:'pas un tableau',etapes:[1,2,3,4,5,6,7,8],
     synthese:{a:1}}];
   const v=normaliser(o);
   D=v; rendre();
   return {i:v.idees.length,u:v.idees_unifiees.length,
     obj:v.idees_unifiees[0].objectifs.length, et:v.idees_unifiees[0].etapes.length,
     syn:typeof v.idees_unifiees[0].synthese,
     htmlInjecte:document.querySelector('#vue img')!==null,
     scriptInjecte:document.querySelector('#vue script')!==null};
 });
 T('les idées sans titre sont écartées', hostile.i===1, ''+hostile.i);
 T('un champ texte à la place d’un tableau devient une liste vide', hostile.obj===0, ''+hostile.obj);
 T('les listes sont bornées à 6', hostile.et===6, ''+hostile.et);
 T('la synthèse reste du texte', hostile.syn==='string', hostile.syn);
 T('aucun balisage n’est injecté', !hostile.htmlInjecte && !hostile.scriptInjecte);

 /* 23. aide contextuelle */
 await p.evaluate(()=>{vueActive='idees';rendre()});
 await p.waitForTimeout(200);
 await p.keyboard.press('F1');
 await p.waitForTimeout(400);
 const aide=await p.evaluate(()=>{
   const d=document.getElementById('ppAide');
   const c=document.getElementById('paCorps');
   const t=c?c.textContent:'';
   const act=document.querySelector('#paNav [data-pa].on')||document.querySelector('#paNav [aria-current="true"]');
   return {ouvert:!!(d&&d.open), titre:(c&&c.querySelector('h3,h2'))?c.querySelector('h3,h2').textContent:'',
     crist:/Cristalliser/.test(t), reseau:/ne contacte aucun service/.test(t), t:t.slice(0,60)};
 });
 T('F1 ouvre l’aide sur l’onglet Idées', aide.ouvert===true, JSON.stringify(aide));
 T('l’aide décrit la cristallisation', aide.crist===true, aide.t);
 T('l’aide rappelle l’absence de réseau', aide.reseau===true, aide.t);

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log('\nRÉUSSIS '+ok.length);
 if(ko.length){ console.log('ÉCHECS  '+ko.length); ko.forEach(x=>console.log('  ✗ '+x)) }
 else console.log('ÉCHECS  0');
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
