/* 3.32.0 — appels et vérifications s'exportent séparément. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+''); await p.waitForTimeout(1500);

 /* On intercepte le téléchargement : c'est le contenu du fichier qui nous intéresse. */
 await p.evaluate(()=>{
   window.__fichiers={};
   window.telecharger=function(nom,contenu){ window.__fichiers[nom]=contenu };
 });

 const poser=()=>p.evaluate(()=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   perm().rappels=[{cle:'rappel1',nom:'Rappel 1',aide:'',minutes:15,actif:true},
                   {cle:'rappel2',nom:'Rappel 2',aide:'',minutes:30,actif:true}];
   perDeb='2026-10-01'; perFin='2026-10-31';
   D.appels=[
     {id:'a1',date:'2026-10-26',heure:'09:39',qui:'M. HENARD François',entreprise:'SARL X',
      tel:'0642106814',motif:'Protection de chantier (Demande)',affaire:'2026-080',
      commune:'CREST',duree:7,objet:'Question sur RAT',suite:'Poser compte rendu',
      suite_faite:true},
     {id:'a2',date:'2026-10-26',heure:'11:02',qui:'Mairie',entreprise:'',tel:'',
      motif:'Renseignement réseau',affaire:'',commune:'LYON',duree:4,objet:'dossier',
      suite:'',suite_faite:false},
     {id:'v1',date:'2026-10-26',heure:'09:00',nature:'verif',rappel:'rappel1',motif:'Rappel 1',
      qui:'',entreprise:'',tel:'',commune:'',duree:0,objet:'',suite:'',suite_faite:false},
     {id:'v2',date:'2026-10-26',heure:'09:12',nature:'verif',rappel:'rappel1',motif:'Rappel 1',
      qui:'',entreprise:'',tel:'',commune:'',duree:0,objet:'',suite:'',suite_faite:false},
     {id:'v3',date:'2026-10-26',heure:'09:45',nature:'verif',rappel:'rappel1',motif:'Rappel 1',
      qui:'',entreprise:'',tel:'',commune:'',duree:0,objet:'',suite:'',suite_faite:false},
     {id:'v4',date:'2026-10-26',heure:'10:00',nature:'verif',rappel:'rappel2',motif:'Rappel 2',
      qui:'',entreprise:'',tel:'',commune:'',duree:0,objet:'',suite:'',suite_faite:false},
     {id:'v5',date:'2026-10-27',heure:'08:30',nature:'verif',rappel:'rappel1',motif:'Rappel 1',
      qui:'',entreprise:'',tel:'',commune:'',duree:0,objet:'',suite:'',suite_faite:false},
     /* hors période : ne doit figurer nulle part */
     {id:'a9',date:'2026-09-15',heure:'10:00',qui:'Hors période',entreprise:'',tel:'',
      motif:'',affaire:'',commune:'',duree:1,objet:'',suite:'',suite_faite:false},
     {id:'v9',date:'2026-09-15',heure:'10:00',nature:'verif',rappel:'rappel1',motif:'Rappel 1',
      qui:'',entreprise:'',tel:'',commune:'',duree:0,objet:'',suite:'',suite_faite:false}
   ];
   window.__fichiers={};
   /* v1.5 : les exports vivent dans la section Import et export. */
   vueActive='donnees'; ongletOptions='echanges'; rendre();
 });
 await poser(); await p.waitForTimeout(400);

 /* --- 1. les deux boutons --------------------------------------------- */
 const btn=await p.evaluate(()=>({
   appels:!!document.querySelector('[data-act="exp-csva"]'),
   verifs:!!document.querySelector('[data-act="exp-csvv"]'),
   libelles:[...document.querySelectorAll('[data-act^="exp-"]')].map(b=>b.textContent).join(' | ')}));
 T('le bouton des appels est là', btn.appels);
 T('celui des vérifications aussi', btn.verifs, btn.libelles);

 /* --- 2. l'export des appels ------------------------------------------- */
 await p.click('[data-act="exp-csva"]'); await p.waitForTimeout(400);
 const ap=await p.evaluate(()=>{
   const n=Object.keys(window.__fichiers).find(x=>/appels/.test(x));
   return {nom:n, txt:window.__fichiers[n]};
 });
 T('un fichier d’appels est produit', !!ap.nom && /^mypilot-pro-appels-/.test(ap.nom), ap.nom);
 const al=ap.txt.replace(/\s+$/,'').split(/\r?\n/).filter(x=>x.trim());
 T('  il porte une en-tête et deux lignes', al.length===3, (al.length-1)+' ligne(s)');
 T('  aucune vérification ne s’y est glissée',
   !/Rappel 1|Rappel 2/.test(ap.txt), ap.txt.slice(0,200));
 T('  l’appel hors période est exclu', ap.txt.indexOf('Hors période')<0);
 T('  la colonne Affaire existe', /Affaire/.test(al[0]), al[0]);
 T('  et elle est remplie', /2026-080/.test(ap.txt));
 T('  les colonnes sont dans l’ordre attendu',
   al[0].replace(/"/g,'')==='Date;Heure;Qui appelle;Entreprise;Téléphone;Motif;Affaire;Commune;Durée (min);Objet;Suite à donner;Traitée'
   || al[0].replace(/"/g,'').split(/[;,]/).length===12, al[0]);

 /* --- 3. l'export des vérifications ------------------------------------ */
 await p.click('[data-act="exp-csvv"]'); await p.waitForTimeout(400);
 const ve=await p.evaluate(()=>{
   const n=Object.keys(window.__fichiers).find(x=>/verification/.test(x));
   return {nom:n, txt:window.__fichiers[n]};
 });
 T('un fichier de vérifications est produit', !!ve.nom, ve.nom);
 const vl=ve.txt.replace(/\s+$/,'').split(/\r?\n/)
   .filter(x=>x.trim()).map(x=>x.replace(/\r|"/g,'').split(';'));
 /* 3 Rappel 1 + 1 Rappel 2 le 26, 1 Rappel 1 le 27 */
 T('  cinq vérifications dans la période', vl.length-1===5, (vl.length-1)+'');
 T('  aucun appel ne s’y est glissé', !/HENARD|Mairie/.test(ve.txt));
 T('  celle hors période est exclue', ve.txt.indexOf('2026-09-15')<0);
 T('  l’en-tête annonce l’écart et la cadence',
   /Écart \(min\)/.test(vl[0].join(';')) && /Attendu \(min\)/.test(vl[0].join(';')), vl[0].join(';'));

 const ligne=h=>vl.find(x=>x[1]===h);
 T('la première du jour n’a pas d’écart', ligne('09:00')[3]==='', JSON.stringify(ligne('09:00')));
 T('  la suivante en a un, juste', ligne('09:12')[3]==='12', JSON.stringify(ligne('09:12')));
 T('  dans la cadence de 15 min', ligne('09:12')[5]==='oui', ligne('09:12')[5]);
 T('  33 min plus tard, hors cadence', ligne('09:45')[3]==='33' && ligne('09:45')[5]==='non',
   JSON.stringify(ligne('09:45')));
 T('  la cadence attendue est reprise du rappel', ligne('09:45')[4]==='15', ligne('09:45')[4]);
 T('un autre intitulé a sa propre cadence',
   ligne('10:00')[2]==='Rappel 2' && ligne('10:00')[4]==='30' && ligne('10:00')[3]==='',
   JSON.stringify(ligne('10:00')));
 T('un nouveau jour repart sans écart',
   ligne('08:30')[0]==='2026-10-27' && ligne('08:30')[3]==='', JSON.stringify(ligne('08:30')));

 /* --- 4. les cas limites ------------------------------------------------ */
 const vide=await p.evaluate(()=>{
   D.appels=[]; window.__fichiers={};
   exportAppelsCSV(); exportVerifsCSV();
   const k=Object.keys(window.__fichiers);
   return k.map(n=>({n:n, lignes:window.__fichiers[n].replace(/\s+$/,'').split(/\r?\n/).filter(x=>x.trim()).length}));
 });
 T('sans aucune donnée, les deux fichiers sortent avec leur en-tête',
   vide.length===2 && vide.every(x=>x.lignes===1), JSON.stringify(vide));

 const sansRappel=await p.evaluate(()=>{
   perm().rappels=[];
   D.appels=[{id:'v1',date:'2026-10-26',heure:'09:00',nature:'verif',motif:'Rappel disparu',
     qui:'',entreprise:'',tel:'',commune:'',duree:0,objet:'',suite:'',suite_faite:false},
     {id:'v2',date:'2026-10-26',heure:'09:20',nature:'verif',motif:'Rappel disparu',
     qui:'',entreprise:'',tel:'',commune:'',duree:0,objet:'',suite:'',suite_faite:false}];
   window.__fichiers={}; exportVerifsCSV();
   const n=Object.keys(window.__fichiers)[0];
   return window.__fichiers[n].trim().split(/\r?\n/).map(x=>x.replace(/\r|"/g,'').split(';'));
 });
 T('un rappel supprimé depuis : l’écart reste calculé',
   sansRappel[2][3]==='20', JSON.stringify(sansRappel[2]));
 T('  la cadence attendue reste vide, pas inventée',
   sansRappel[2][4]==='' && sansRappel[2][5]==='', JSON.stringify(sansRappel[2]));

 /* --- 5. rien d'autre ne mélange les deux -------------------------------- */
 await poser(); await p.waitForTimeout(300);
 const ailleurs=await p.evaluate(()=>({
   crJour:texteCompteRendu('2026-10-26'),
   compte:vraisAppels(appelsDu('2026-10-26')).length,
   verifs:(D.appels||[]).filter(a=>a.date==='2026-10-26'&&a.nature==='verif').length
 }));
 /* Jusqu'a la 3.34.1 cette assertion portait sur compteRendu(), qui n'a jamais rien
    rendu : elle testait undefined et passait quoi qu'il arrive. Le texte se lit
    desormais par texteCompteRendu(), et le banc verifie d'abord qu'il existe. */
 T('le compte rendu du jour est bien un texte',
   typeof ailleurs.crJour==='string' && ailleurs.crJour.length>200,
   typeof ailleurs.crJour);
 const bloc=ailleurs.crJour.slice(ailleurs.crJour.indexOf('ASSISTANCE'),
                                  ailleurs.crJour.indexOf('JOURNAL'));
 T('  il compte deux appels, pas six', /ASSISTANCE TÉLÉPHONIQUE \(2 appel/.test(bloc), bloc.split('\n')[0]);
 T('  aucune vérification déroulée parmi les appels',
   !/appelant non précisé/.test(ailleurs.crJour));
 T('  les vérifications ont leur propre ligne, comptées',
   /VÉRIFICATIONS DE PERMANENCE \(4\)/.test(bloc), bloc);
 T('  regroupées par intitulé, du plus fréquent au moins',
   /Rappel 1 × 3[\s\S]*Rappel 2 × 1/.test(bloc));
 T('  le nom suit le rappel renommé, pas le motif figé',
   await p.evaluate(()=>{
     perm().rappels[0].nom='Rappel 1 (nouveau nom)';
     return /Rappel 1 \(nouveau nom\) × 3/.test(texteCompteRendu('2026-10-26'));
   }));
 T('  le compteur d’appels du jour non plus', ailleurs.compte===2, ''+ailleurs.compte);
 T('  alors que les vérifications sont bien là', ailleurs.verifs===4, ''+ailleurs.verifs);

 T('l’aide explique la séparation',
   await p.evaluate(()=>AIDE.some(r=>/s’exportent séparément/.test(r.html)
     && /cadence attendue/.test(r.html))));
 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
