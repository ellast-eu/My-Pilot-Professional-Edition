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
  const log=[];
  fichierCharge=true;
  let mod=null; modeleCategories().forEach(x=>{ if(x.cle==='chantier') mod=x });
  D.parametres.categories[0]=mod;
  D.parametres.gestionnaire="Testeuse Exemple";
  D.chantiers=[]; D.notes=[];
  // fiche existante, bien renseignee
  const f={id:'f1',categorie:'chantier',ref_technique:'50000000000001',libelle:'CLIENT A',tiers:'CLIENT A',
    nom_client:'CLIENT A',segment:'C4',poste:'POSTE X',date:'2026-10-05',
    etat_affaire:'3 - En attente de tiers',statut:'3 - En attente de tiers',action:'Relancer le notaire'};
  // fiche qui n'est plus dans le fichier
  const g={id:'f2',categorie:'chantier',ref_technique:'50000000000099',libelle:'CLIENT Z',etat_affaire:'2 - Instruction en cours'};
  D.chantiers=[f,g];
  D.notes=[{id:'n1',date:'2026-09-01',heure:'09:00',contenu:'note liee',chantier_id:'f2',duree:10,type:'suivi'}];

  const L=[[],[]];
  // meme Référence technique que f1 : segment vide, nom client vide, action vide, date = FAIT
  const r1=[]; r1[0]="Testeuse Exemple"; r1[5]="3 - Visite Sécurité après 6 mois";
  r1[6]="c. En partance"; r1[7]="50000000000001"; r1[8]=""; r1[18]=""; r1[22]="FAIT";
  L.push(r1);
  const r2=[]; r2[0]="Paul Durand"; r2[7]="50000000000002"; r2[8]="CLIENT B"; L.push(r2);

  const r=analyserImport(L);
  log.push(`retenues=${r.nouv.length+r.maj.length+r.inchange} ecartees=${r.autres} absents=${r.absents.length} datesFloues=${r.flous.length}`);
  log.push(`diffs proposees sur f1 : ${(r.maj[0]?r.maj[0].diffs:[]).map(d=>d.lib+': "'+(d.av||'vide')+'" -> "'+d.ap+'"').join(' | ')}`);
  log.push(`absent liste : ${r.absents.map(c=>c.ref_technique+' '+c.libelle).join(', ')}`);
  log.push(`dates floues : ${r.flous.map(x=>x.ref_technique+' '+x.l.map(y=>y.lib+'='+y.val).join('/')).join(', ')}`);

  ecranImport(r);
  // cocher la suppression proposee
  const bx=[...document.querySelectorAll('#modCorps input.abs')];
  log.push(`cases de suppression : ${bx.length} | cochees par defaut : ${bx.filter(x=>x.checked).length}`);
  bx.forEach(x=>x.checked=true);
  window.confirm=()=>true;
  validerImport(true,true,true);

  const f1=D.chantiers.filter(c=>c.id==='f1')[0];
  log.push(`APRES  segment="${f1.segment}" nom_client="${f1.nom_client}" action="${f1.action}" tiers="${f1.tiers}"`);
  log.push(`APRES  date planif="${f1.date}" | date_interv="${f1.date_interv}" | etat="${f1.etat_affaire}"`);
  log.push(`APRES  fiches restantes=${D.chantiers.length} | note orpheline rattachee a "${D.notes[0].chantier_id}"`);
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
