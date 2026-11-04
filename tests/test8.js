const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1500);
 const out=await p.evaluate(()=>{
  const log=[]; fichierCharge=true;
  let mod=null; modeleCategories().forEach(x=>{ if(x.cle==='chantier') mod=x });
  D.parametres.categories[0]=mod; D.parametres.gestionnaire="Testeuse Exemple";
  const today=auj();
  /* les états viennent de la configuration, pas d'un libellé en dur */
  const EA=D.parametres.etats_affaire;
  const A={id:'a',categorie:'chantier',ref_technique:'50000000000001',libelle:'ACTIF',date:today,etat_affaire:EA[1]};
  const B={id:'b',categorie:'chantier',ref_technique:'50000000000099',libelle:'PARTI',date:today,etat_affaire:EA[0]};
  D.chantiers=[A,B];
  D.notes=[{id:'n1',date:today,heure:'09:00',contenu:'compte rendu visite',chantier_id:'b',duree:45,type:'suivi',
            suite:{texte:'relancer le notaire',echeance:today,fait:false}},
           {id:'n2',date:today,heure:'10:00',contenu:'appel',chantier_id:'a',duree:15,type:'suivi'}];

  /* la ligne est bâtie depuis la cartographie courante : les rangs de colonnes
     ne sont plus codés en dur dans le banc d'essai */
  const cols=champsImport(), larg=Math.max(...cols.map(c=>c.c))+1;
  const r=new Array(larg).fill('');
  r[cols.find(c=>c.k==='gestionnaire').c-1]="Testeuse Exemple";
  r[cols.find(c=>c.k==='ref_technique').c-1]="50000000000001";
  r[cols.find(c=>c.k==='etat_affaire').c-1]=EA[1];
  const L=[new Array(larg).fill(''),new Array(larg).fill('')]; L.push(r);
  const an=analyserImport(L);
  log.push(`absents proposes : ${an.absents.map(c=>c.libelle).join(', ')}`);
  ecranImport(an);
  [...document.querySelectorAll('#modCorps input.abs')].forEach(x=>x.checked=true);
  window.confirm=()=>true;
  validerImport(true,true,true);

  const bb=chantierPar('b');
  log.push(`PARTI : encore present=${!!bb} archive=${!!bb.archive} motif="${bb.archive_motif}"`);
  log.push(`notes conservees=${D.notes.length} | rattachement note n1="${D.notes[0].chantier_id}" | duree=${D.notes[0].duree}`);
  log.push(`tache "relancer" toujours dans la note=${!!D.notes[0].suite.texte}`);
  log.push(`planning du jour : ${chantiersDu(today).map(c=>c.libelle).join(', ')||'(vide)'}`);
  log.push(`en attente : ${suitesOuvertes().length} tache(s) — la relance du dossier archive est masquee`);
  log.push(`selecteur de rattachement propose : ${(optionsLien("").match(/<option value="c:/g)||[]).length} activite(s)`);
  filtreCh.arch='actifs';   log.push(`Activites « actifs »    : ${vueChantiers().match(/data-chantier/g).length}`);
  filtreCh.arch='archives'; log.push(`Activites « archives »  : ${vueChantiers().match(/data-chantier/g).length}`);
  filtreCh.arch='tous';     log.push(`Activites « tous »      : ${vueChantiers().match(/data-chantier/g).length}`);
  filtreCh.arch='actifs';

  // le dossier revient dans le reporting
  const r2=new Array(larg).fill('');
  r2[cols.find(c=>c.k==='gestionnaire').c-1]="Testeuse Exemple";
  r2[cols.find(c=>c.k==='ref_technique').c-1]="50000000000099";
  r2[cols.find(c=>c.k==='etat_affaire').c-1]=EA[0];
  const an2=analyserImport([new Array(larg).fill(''),new Array(larg).fill(''),r,r2]);
  log.push(`retour : revenus=${an2.revenus.map(c=>c.libelle).join(', ')} absents=${an2.absents.length}`);
  ecranImport(an2); validerImport(true,true,false);
  log.push(`apres reactivation : archive=${!!chantierPar('b').archive} | planning=${chantiersDu(today).map(c=>c.libelle).join(', ')}`);
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
