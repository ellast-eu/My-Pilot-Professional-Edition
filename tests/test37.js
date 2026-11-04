const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
/* 3.18.0 — champ Affaire sur la permanence téléphonique */
const {chromium}=require('playwright'); const fs=require('fs');
const ok=[],ko=[];
const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1100}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+'');
 await p.waitForTimeout(1500);

 /* un dossier connu, et la permanence enclenchée */
 await p.evaluate(()=>{
   fichierCharge=true;
   const K=catImport()||categories()[0];
   D.chantiers=[{id:'ch1',categorie:K.cle,libelle:'TISSAGES QUINTENAS',
     reference:'RAC-SIR-26-007967',ref_technique:'30001910099101',statut:jeuStatuts(K.statuts)[0][0],
     date:'',heure:'',duree:0,commentaire:''}];
   D.appels=[];
   perm().actif=true; perm().seances=[{jour:auj(),debut:'08:30',fin:null}];
   vueActive='jour'; rendre();
 });
 await p.waitForTimeout(400);

 /* 1. le champ existe dans la saisie */
 const champ=await p.evaluate(()=>{
   const e=document.getElementById('apAff');
   if(!e) return null;
   const dl=document.getElementById('dlAff');
   return {ph:e.placeholder, liste:e.getAttribute('list'),
     options:dl?[...dl.options].map(o=>o.value):[],
     avantObjet:!!(e.compareDocumentPosition(document.getElementById('apObj'))
       & Node.DOCUMENT_POSITION_FOLLOWING)};
 });
 T('le champ Affaire existe dans la saisie', !!champ, 'absent');
 T('son intitulé est clair', champ && /Affaire/.test(champ.ph) && /dossier/.test(champ.ph), champ&&champ.ph);
 T('il précède l’objet de l’appel', champ && champ.avantObjet===true);
 T('il propose les références connues',
   champ && champ.options.indexOf('RAC-SIR-26-007967')>=0 && champ.options.indexOf('30001910099101')>=0,
   champ?champ.options.join(','):'');

 /* 2. la saisie enregistre l'affaire */
 await p.fill('#apAff','RAC-SIR-26-007967');
 await p.fill('#apQui','M. BRIKI Farid');
 await p.fill('#apObj','Erreur sur APS, CA absent');
 await p.click('[data-act="ap-add"]');
 await p.waitForTimeout(350);
 const ap=await p.evaluate(()=>D.appels[0]||null);
 T('l’appel porte son affaire', ap && ap.affaire==='RAC-SIR-26-007967', ap?ap.affaire:'aucun appel');
 T('le reste est intact', ap && ap.qui==='M. BRIKI Farid' && /Erreur sur APS/.test(ap.objet));
 T('le champ se vide après enregistrement',
   (await p.evaluate(()=>document.getElementById('apAff').value))==='');

 /* 3. elle s'affiche dans la liste, avec le libellé du dossier */
 const ligne=await p.evaluate(()=>{
   const e=document.querySelector('.appel .aff');
   return e?e.textContent:null;
 });
 T('l’affaire apparaît sous l’appel', !!ligne, 'absente');
 T('le libellé du dossier est rappelé',
   /RAC-SIR-26-007967 · TISSAGES QUINTENAS/.test(ligne||''), ligne);

 /* 4. une affaire inconnue reste acceptée, sans libellé */
 await p.fill('#apAff','DOSSIER-HORS-FICHIER');
 await p.fill('#apQui','Autre');
 await p.click('[data-act="ap-add"]');
 await p.waitForTimeout(300);
 const inconnue=await p.evaluate(()=>{
   const a=D.appels.find(x=>x.affaire==='DOSSIER-HORS-FICHIER');
   const l=[...document.querySelectorAll('.appel .aff')].map(e=>e.textContent);
   return {enregistree:!!a, lignes:l};
 });
 T('une affaire absente du fichier est acceptée', inconnue.enregistree===true);
 T('elle s’affiche sans libellé inventé',
   inconnue.lignes.some(x=>x==='DOSSIER-HORS-FICHIER'), inconnue.lignes.join(' | '));

 /* 5. l'affaire seule suffit à noter un appel */
 await p.fill('#apAff','RAC-SIR-26-007967');
 await p.click('[data-act="ap-add"]');
 await p.waitForTimeout(300);
 T('une affaire seule suffit à enregistrer',
   (await p.evaluate(()=>D.appels.length))===3, ''+(await p.evaluate(()=>D.appels.length)));
 /* mais tout vide ne crée rien */
 const avant=await p.evaluate(()=>D.appels.length);
 await p.click('[data-act="ap-add"]');
 await p.waitForTimeout(250);
 T('un formulaire vide ne crée rien', (await p.evaluate(()=>D.appels.length))===avant);

 /* 6. Entrée depuis le champ Affaire enregistre */
 await p.fill('#apAff','RAC-SIR-26-007967');
 await p.fill('#apQui','Par Entrée');
 await p.focus('#apAff');
 await p.keyboard.press('Enter');
 await p.waitForTimeout(300);
 T('Entrée depuis Affaire enregistre l’appel',
   (await p.evaluate(()=>D.appels.some(a=>a.qui==='Par Entrée')))===true);

 /* 7. la saisie en cours survit à un rendu */
 await p.fill('#apAff','EN-COURS-DE-SAISIE');
 await p.evaluate(()=>rendre());
 await p.waitForTimeout(250);
 T('la saisie en cours survit au rendu',
   (await p.evaluate(()=>document.getElementById('apAff').value))==='EN-COURS-DE-SAISIE');
 await p.evaluate(()=>{document.getElementById('apAff').value=''});

 /* 8. la fiche de l'appel porte le champ */
 const id=await p.evaluate(()=>D.appels.find(a=>a.affaire==='RAC-SIR-26-007967').id);
 await p.evaluate(x=>editerAppel(x), id);
 await p.waitForTimeout(300);
 const fiche=await p.evaluate(()=>{
   const e=document.querySelector('#modCorps [name="affaire"]');
   const dl=document.getElementById('dlAffF');
   const aide=document.querySelector('#modCorps .rappel-aff');
   return {present:!!e, valeur:e?e.value:'', liste:e?e.getAttribute('list'):'',
     options:dl?dl.options.length:0,
     rappel:aide?aide.textContent:'',
     lien:!!document.querySelector('[data-ouvrir-aff]')};
 });
 T('la fiche appel porte le champ Affaire', fiche.present===true);
 T('elle affiche la valeur enregistrée', fiche.valeur==='RAC-SIR-26-007967', fiche.valeur);
 T('elle propose aussi la liste', fiche.liste==='dlAffF' && fiche.options>0, ''+fiche.options);
 T('le dossier reconnu est rappelé', /TISSAGES QUINTENAS/.test(fiche.rappel), fiche.rappel);
 T('un lien permet d’ouvrir le dossier', fiche.lien===true);

 /* 9. le compte rendu la reprend */
 await p.evaluate(()=>{const l=[...document.querySelectorAll('#modPied button')];
   l.find(b=>b.textContent==='Compte rendu').click()});
 await p.waitForTimeout(300);
 const cr=await p.evaluate(()=>document.getElementById('crTexte').value);
 T('le compte rendu porte l’affaire',
   /Affaire\s+: RAC-SIR-26-007967 · TISSAGES QUINTENAS/.test(cr),
   (cr.match(/Affaire.*/)||[''])[0]);
 T('elle vient avant le motif', cr.indexOf('Affaire')<cr.indexOf('Motif'));
 await p.evaluate(()=>{document.getElementById('crBoite').close()});

 /* 10. modifier l'affaire sur la fiche */
 await p.fill('#modCorps [name="affaire"]','30001910099101');
 await p.evaluate(()=>{const l=[...document.querySelectorAll('#modPied button')];
   l.find(b=>b.textContent==='Enregistrer').click()});
 await p.waitForTimeout(350);
 T('la modification est enregistrée',
   (await p.evaluate(()=>D.appels.some(a=>a.affaire==='30001910099101')))===true);
 T('le Référence technique est reconnu comme référence du même dossier',
   (await p.evaluate(()=>{const c=dossierAffaire('30001910099101'); return c?c.libelle:''}))==='TISSAGES QUINTENAS');

 /* 11. le lien ouvre bien le dossier */
 const id2=await p.evaluate(()=>D.appels.find(a=>a.affaire==='30001910099101').id);
 await p.evaluate(x=>editerAppel(x), id2);
 await p.waitForTimeout(300);
 await p.click('[data-ouvrir-aff]');
 await p.waitForTimeout(400);
 const ouvert=await p.evaluate(()=>({ouverte:document.getElementById('modale').open,
   titre:document.getElementById('modTitre').textContent}));
 T('le lien ouvre la fiche du dossier',
   ouvert.ouverte===true && /TISSAGES QUINTENAS|RAC-SIR/.test(ouvert.titre), ouvert.titre);
 await p.evaluate(()=>fermerModale());

 /* 12. cycle fichier */
 const cycle=await p.evaluate(()=>{
   const o=JSON.parse(serialise('json'));
   const v=normaliser(o);
   return v.appels.filter(a=>a.affaire).length;
 });
 T('les affaires survivent au cycle fichier', cycle>=3, ''+cycle);
 const vieux=await p.evaluate(()=>{
   const o=JSON.parse(serialise('json'));
   o.appels.forEach(a=>{delete a.affaire});
   const v=normaliser(o);
   vueActive='jour'; D=v; rendre();
   return {sansErreur:true, lignes:document.querySelectorAll('.appel .aff').length};
 });
 T('un fichier antérieur sans affaire s’affiche sans erreur', vieux.lignes===0, ''+vieux.lignes);

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));
 console.log('\nRÉUSSIS '+ok.length);
 if(ko.length){ console.log('ÉCHECS  '+ko.length); ko.forEach(x=>console.log('  ✗ '+x)) }
 else console.log('ÉCHECS  0');
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
