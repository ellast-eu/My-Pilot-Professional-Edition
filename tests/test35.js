const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
/* 3.17.0 — bouton Compte rendu sur les fiches appel, note et activité */
const {chromium}=require('playwright'); const fs=require('fs');
const ok=[],ko=[];
const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000},
   permissions:['clipboard-read','clipboard-write']});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+'');
 await p.waitForTimeout(1500);

 /* un jeu calqué sur ses trois captures */
 const ids=await p.evaluate(()=>{
   fichierCharge=true;
   if(!champsDe((catImport()||{}).cle||'').length) reparerImportCat();
   D.parametres.id_nom='Testeuse Exemple';
   D.parametres.id_fonction='Prévention';
   D.parametres.id_entite='Exemple — Service régional';
   D.appels=[{id:'ap1',date:'2026-10-14',heure:'15:46',qui:'M. BRIKI Farid',
     entreprise:'',tel:'+33651460288',motif:'Protection de chantier (Suivi)',
     commune:'SAINT-MARTIN-DU-BOIS',duree:30,
     objet:"RAC-SIR-26-007967 : Erreur sur APS, CA absent, client reste dans l'attente l'avancement du dossier en attente du retour du CA, à fait correction APS avec précision client, affaire non payable car réseau uniquement."+String.fromCharCode(10)+"L'ensemble des informations ont été transmises à Majid pour reprise du dossier.",
     suite:"Faire reprendre dossier en l'absence du CA + correction APS + transmission des éléments corrigés",
     suite_faite:true}];
   const K=catImport()||categories()[0];
   const c={id:'ch1',categorie:K.cle,libelle:'TISSAGES QUINTENAS',reference:'RAC-SIR-26-007967',
     date:'',heure:'08:30',duree:60,type:'Visite de chantier',tiers:'MEROUR',
     contact_nom:'',contact_tel:'',commune:'',adresse:'',
     statut:(jeuStatuts(K.statuts).find(x=>/partance/i.test(x[1]))||jeuStatuts(K.statuts)[0])[0],
     ref_technique:'30001910099101',site_ref:'07188P5003',
     nom_client:'CLIENT TEST',type_dossier:'Type A',ouvrage:'Non défini',
     date_action:'2026-09-01',complement_statut1:'Dossier Stella ?',
     gestionnaire:D.parametres.gestionnaire,commentaire:'Dossier à reprendre après arbitrage.'};
   D.chantiers=[c];
   D.notes=[
     {id:'n1',date:'2026-10-13',heure:'15:56',type:'Réunion',chantier_id:'ch1',rubrique_id:'',
      chantier_ref:refDossier(c),contenu:'Arbitrage vu, appeler ancien client sur sge',duree:15,
      suite:{texte:'Appeler ancien client sur sge pour renseignement',echeance:'2026-10-14',fait:false}},
     {id:'n2',date:'2026-10-02',heure:'09:10',type:'Terrain',chantier_id:'ch1',rubrique_id:'',
      chantier_ref:refDossier(c),contenu:'Visite sur place.'+String.fromCharCode(10)+'Deux lignes de constat.',duree:45,
      suite:{texte:'Envoyer le constat',echeance:'',fait:true}}
   ];
   modifie(); rendre();
   return {statut:c.statut};
 });

 const lireBoite=()=>p.evaluate(()=>{
   const d=document.getElementById('crBoite');
   return {ouverte:!!(d&&d.open), fiche:document.getElementById('modale').open,
     titre:d?d.querySelector('.cr-tete h3').textContent:'',
     texte:d?document.getElementById('crTexte').value:'',
     option:!!document.getElementById('crNotes')};
 });

 /* ---------- 1. l'appel ---------- */
 await p.evaluate(()=>editerAppel('ap1'));
 await p.waitForTimeout(250);
 const btns=await p.evaluate(()=>Array.from(document.querySelectorAll('#modPied button')).map(b=>b.textContent));
 T('la fiche appel porte un bouton Compte rendu', btns.indexOf('Compte rendu')>=0, btns.join(' | '));
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>b.textContent==='Compte rendu').click()});
 await p.waitForTimeout(300);
 const A=await lireBoite();
 T('la fenêtre du CR s’ouvre', A.ouverte===true);
 T('la fiche reste ouverte derrière', A.fiche===true);
 T('le titre est juste', /appel/i.test(A.titre), A.titre);
 T('l’option historique est absente pour un appel', A.option===false);
 for(const [q,v] of [
   ['la date en clair',/mercredi 14 octobre 2026 à 15:46/],
   ['la durée',/30 min/],
   ['le motif',/Motif\s+: Protection de chantier \(Suivi\)/],
   ['l’interlocuteur',/Interlocuteur\s+: M\. BRIKI Farid/],
   ['le téléphone',/Téléphone\s+: \+33651460288/],
   ['la commune',/Commune\s+: SAINT-MARTIN-DU-BOIS/],
   ['l’objet',/OBJET DE L’APPEL\nRAC-SIR-26-007967 : Erreur sur APS/],
   ['la seconde ligne de l’objet',/transmises à Majid pour reprise du dossier/],
   ['la suite marquée traitée',/SUITE À DONNER \(traitée\)/],
   ['la signature',/Testeuse Exemple · Prévention · Exemple/]
 ]) T('CR appel : '+q, v.test(A.texte), '');
 T('aucune ligne vide inutile', !/^\s*\w[^\n]*:\s*$/m.test(A.texte));

 /* la saisie en cours est reprise, même non enregistrée */
 await p.evaluate(()=>{document.getElementById('crBoite').close()});
 await p.evaluate(()=>{
   document.querySelector('#modCorps [name="commune"]').value='VIENNE';
   document.querySelector('#modCorps [name="duree"]').value='45';
 });
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>b.textContent==='Compte rendu').click()});
 await p.waitForTimeout(250);
 const A2=await lireBoite();
 T('le CR reprend la saisie non enregistrée', /Commune\s+: VIENNE/.test(A2.texte) && /45 min/.test(A2.texte));
 T('rien n’a été enregistré pour autant',
   (await p.evaluate(()=>D.appels[0].commune))!=='VIENNE',
   await p.evaluate(()=>D.appels[0].commune));

 /* la copie */
 await p.evaluate(()=>{const b=document.getElementById('crBoite');
   b.querySelector('[data-cr="copier"]').click()});
 await p.waitForTimeout(250);
 const presse=await p.evaluate(()=>navigator.clipboard.readText().catch(()=>''));
 T('le bouton Copier met le texte dans le presse-papiers',
   /BRIKI Farid/.test(presse)&&/OBJET DE L/.test(presse), presse.slice(0,40));
 const toastCR=await p.evaluate(()=>{const l=document.querySelectorAll('.toast');
   return l.length?l[l.length-1].textContent:''});
 T('un message confirme la copie', /copié/.test(toastCR), toastCR);
 await p.evaluate(()=>{document.getElementById('crBoite').close(); fermerModale()});

 /* ---------- 2. la note ---------- */
 await p.evaluate(()=>editerNote('n1'));
 await p.waitForTimeout(250);
 const btnN=await p.evaluate(()=>Array.from(document.querySelectorAll('#modPied button')).map(b=>b.textContent));
 T('la fiche note porte un bouton Compte rendu', btnN.indexOf('Compte rendu')>=0, btnN.join(' | '));
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>b.textContent==='Compte rendu').click()});
 await p.waitForTimeout(300);
 const N=await lireBoite();
 T('la fenêtre s’ouvre sur la note', N.ouverte===true && N.fiche===true);
 for(const [q,v] of [
   ['la date et l’heure',/mardi 13 octobre 2026 à 15:56/],
   ['le type',/· Réunion/],
   ['la durée',/15 min/],
   ['le dossier rattaché',/Dossier\s+: RAC-SIR-26-007967 · TISSAGES QUINTENAS/],
   ['le texte de la note',/NOTE\nArbitrage vu, appeler ancien client sur sge/],
   ['la suite et son échéance',/SUITE À DONNER — échéance mercredi 14 octobre 2026/],
   ['le texte de la suite',/Appeler ancien client sur sge pour renseignement/]
 ]) T('CR note : '+q, v.test(N.texte), '');
 T('pas d’option historique sur une note', N.option===false);
 await p.evaluate(()=>{document.getElementById('crBoite').close(); fermerModale()});

 /* ---------- 3. l'activité ---------- */
 await p.evaluate(()=>editerChantier('ch1'));
 await p.waitForTimeout(300);
 const btnC=await p.evaluate(()=>Array.from(document.querySelectorAll('#modPied button')).map(b=>b.textContent));
 T('la fiche activité porte un bouton Compte rendu', btnC.indexOf('Compte rendu')>=0, btnC.join(' | '));
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>b.textContent==='Compte rendu').click()});
 await p.waitForTimeout(300);
 const C=await lireBoite();
 T('la fenêtre s’ouvre sur l’activité', C.ouverte===true && C.fiche===true);
 T('l’option historique est proposée', C.option===true);
 for(const [q,v] of [
   ['le titre avec référence et libellé',/^Dossier — RAC-SIR-26-007967 · TISSAGES QUINTENAS/m],
   ['le statut en clair sous le nom du champ miroir',/État\s+: \S.*[a-zéè]/],
   ['le champ miroir ne fait pas doublon',/^(?!.*\n.*État\s+:)/m],
   /* v1.7 : heure et duree decrivent l'evenement de reference. Une activite qui n'en
      porte aucun n'a donc ni l'une ni l'autre — et surtout pas une ligne « Date »,
      ce que ce banc verifiait a l'origine. */
   ['sans événement, aucune ligne Date',/^(?!.*\nDate\s+:)/m],
   ['  ni heure ni durée orphelines',/^(?!.*\n(Heure|Durée)\s+:)/m],
   ['le type d’intervention',/Type\s+: Visite de chantier/],
   ['l’interlocuteur',/MEROUR/],
   ['un second identifiant : la référence technique',/Référence technique\s+: 30001910099101/],
   ['un champ configuré : le type de dossier',/Type de dossier\s+: /],
   ['une date configurée est lisible',/Date dernière action\s+: 01\/09\/2026/],
   ['le commentaire',/COMMENTAIRE\nDossier à reprendre après arbitrage\./],
   ['l’historique des deux notes',/HISTORIQUE \(2 notes\)/],
   ['la note la plus ancienne en premier',/HISTORIQUE[\s\S]*ven\. 02\/10[\s\S]*mar\. 13\/10/],
   ['les tâches de l’historique',/→ à faire : Envoyer le constat\s+\[terminé\]/],
   ['une tâche à échéance',/→ à faire : Appeler ancien client[\s\S]*\[échéance mer\. 14\/10\]/],
   ['une note multiligne est indentée',/  Visite sur place\.\n  Deux lignes de constat\./]
 ]) T('CR activité : '+q, v.test(C.texte), '');
 T('aucun champ vide n’est listé', !/Adresse\s+:|Contact\s+:|Commune\s+:/.test(C.texte));

 /* la case décochée retire l'historique */
 await p.evaluate(()=>{const c=document.getElementById('crNotes'); c.checked=false;
   c.dispatchEvent(new Event('change',{bubbles:true}))});
 await p.waitForTimeout(200);
 const C2=await p.evaluate(()=>document.getElementById('crTexte').value);
 T('décocher retire l’historique', !/HISTORIQUE/.test(C2));
 T('le reste de la fiche demeure', /Référence technique\s+: 30001910099101/.test(C2));
 await p.evaluate(()=>{const c=document.getElementById('crNotes'); c.checked=true;
   c.dispatchEvent(new Event('change',{bubbles:true}))});
 await p.waitForTimeout(200);
 T('recocher le remet', /HISTORIQUE/.test(await p.evaluate(()=>document.getElementById('crTexte').value)));

 /* fermer le CR laisse la fiche et sa saisie intactes */
 await p.evaluate(()=>{document.querySelector('#modCorps [name="commune"]').value='QUINTENAS'});
 await p.evaluate(()=>{const b=document.getElementById('crBoite');
   b.querySelector('.cr-pied [data-cr="fermer"]').click()});
 await p.waitForTimeout(250);
 const apres=await p.evaluate(()=>({cr:document.getElementById('crBoite').open,
   fiche:document.getElementById('modale').open,
   commune:document.querySelector('#modCorps [name="commune"]').value,
   titre:document.getElementById('modTitre').textContent}));
 T('fermer le CR referme sa seule fenêtre', apres.cr===false && apres.fiche===true);
 T('la saisie en cours de la fiche est intacte', apres.commune==='QUINTENAS', apres.commune);
 T('la fiche est toujours la bonne', /TISSAGES QUINTENAS|RAC-SIR/.test(apres.titre), apres.titre);

 /* Échap ne ferme que le CR */
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>b.textContent==='Compte rendu').click()});
 await p.waitForTimeout(250);
 await p.keyboard.press('Escape');
 await p.waitForTimeout(250);
 const ech=await p.evaluate(()=>({cr:document.getElementById('crBoite').open,
   fiche:document.getElementById('modale').open}));
 T('Échap ferme le CR sans fermer la fiche', ech.cr===false && ech.fiche===true);
 await p.evaluate(()=>fermerModale());

 /* une activité archivée dit qu'elle l'est */
 await p.evaluate(()=>{archiver(chantierPar('ch1'),'plus au périmètre','sorti'); modifie();
   editerChantier('ch1')});
 await p.waitForTimeout(300);
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>b.textContent==='Compte rendu').click()});
 await p.waitForTimeout(250);
 const arch=await p.evaluate(()=>document.getElementById('crTexte').value);
 T('un dossier archivé le mentionne', /ARCHIVÉ\n.*plus au périmètre.*sorti du périmètre/.test(arch),
   (arch.match(/ARCHIVÉ\n.*/)||[''])[0]);
 await p.evaluate(()=>{document.getElementById('crBoite').close(); fermerModale()});

 /* le téléchargement est proposé */
 await p.evaluate(()=>editerNote('n1'));
 await p.waitForTimeout(200);
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>b.textContent==='Compte rendu').click()});
 await p.waitForTimeout(250);
 const dl=p.waitForEvent('download',{timeout:5000}).catch(()=>null);
 await p.evaluate(()=>document.getElementById('crBoite').querySelector('[data-cr="txt"]').click());
 const f=await dl;
 T('le CR se télécharge en .txt', !!f && /^cr-note-2026-10-13\.txt$/.test(f.suggestedFilename()),
   f?f.suggestedFilename():'aucun téléchargement');
 await p.evaluate(()=>{document.getElementById('crBoite').close(); fermerModale()});

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));
 console.log('\nRÉUSSIS '+ok.length);
 if(ko.length){ console.log('ÉCHECS  '+ko.length); ko.forEach(x=>console.log('  ✗ '+x)) }
 else console.log('ÉCHECS  0');
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
