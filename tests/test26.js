const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1100}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1400);
 const out=await p.evaluate(()=>{
  const log=[]; fichierCharge=true;
  D.parametres.categories=modeleCategories();
  D.chantiers=[{id:'c1',categorie:'convocation',libelle:'2026-067 VILLIEURBANNE',reference:'2026-067',
    date:auj(),statut:'pret',commune:'Villeurbanne'}];
  D.notes=[{id:'n1',date:auj(),heure:'11:00',contenu:'Réunion convocation 2026-067',chantier_id:'c1',
    duree:60,type:'Réunion',suite:{texte:'Faire CR à DPM',echeance:auj(),fait:false}}];

  // A — traiter l'action depuis la note
  editerNote('n1');
  const b1=[...document.querySelectorAll('#modPied button')].map(x=>x.textContent.trim());
  log.push('A · boutons de la note : '+b1.join(' | '));
  [...document.querySelectorAll('#modPied button')].find(x=>/Traiter/.test(x.textContent)).click();
  const titre=document.getElementById('modTitre').textContent;
  document.getElementById('suiteNote').value='CR rédigé et transmis';
  dureeSuite=30;
  [...document.querySelectorAll('#modPied button')].find(x=>/Enregistrer la note/.test(x.textContent)).click();
  log.push('A · fenêtre ouverte : "'+titre+'" → action soldée : '+(D.notes[0].suite.fait===true));
  const neuve=D.notes.filter(n=>n.id!=='n1')[0];
  log.push('A · note créée : "'+(neuve?neuve.contenu:'AUCUNE')+'" · '+(neuve?neuve.duree:'-')+' min · rattachée à '
    +(neuve&&neuve.chantier_id==='c1'?'c1 (correct)':'?'));
  log.push('A · retour sur la note d\'origine : '+(document.getElementById('modTitre').textContent.indexOf('Note du')===0));
  fermerModale();

  // B — permanence : entreprise et commune à la saisie
  perm().actif=true; D.appels=[]; vueActive='jour'; rendre();
  const champs=['apTel','apQui','apEnt','apCom','apObj'].map(i=>document.getElementById(i)?i:'MANQUANT:'+i);
  log.push('B · champs présents : '+champs.join(', '));
  document.getElementById('apTel').value='0478112233';
  document.getElementById('apQui').value='M. DELGADO';
  document.getElementById('apEnt').value='DPM Échafaudage';
  document.getElementById('apCom').value='Villeurbanne';
  document.getElementById('apObj').value='Point échafaudage';
  ajouterAppel();
  const ap=D.appels[0];
  log.push('B · appel enregistré : entreprise="'+ap.entreprise+'" commune="'+ap.commune+'"');
  log.push('B · champs vidés après saisie : '+(document.getElementById('apEnt').value===''
    && document.getElementById('apCom').value===''));

  // C — un formulaire sans champ de lien ne détache plus
  const av=D.notes[0].chantier_id;
  poserLien(D.notes[0],'');
  log.push('C · lien après lecture d\'un champ absent : '+(D.notes[0].chantier_id===av?'conservé':'PERDU'));
  poserLien(D.notes[0],'0');
  log.push('C · détachement explicite : '+(D.notes[0].chantier_id===''?'effectué':'raté')
    +' · trace = '+(D.notes[0].chantier_ref||'(aucune)'));
  log.push('C · signalé comme rompu : '+lienRompu(D.notes[0]));
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
