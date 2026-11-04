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
  const j=n=>{const d=new Date(); d.setDate(d.getDate()-n); return iso(d)};
  D.chantiers=[]; D.notes=[];
  // 20 dossiers actives + 8 archivees en septembre, non qualifiees
  for(let i=0;i<20;i++) D.chantiers.push({id:'d'+i,categorie:'chantier',libelle:'Actif '+i,date:'',
    date_action:j(i*3+1),statut:'3 - En attente de tiers'});
  for(let i=0;i<8;i++) D.chantiers.push({id:'ar'+i,categorie:'chantier',libelle:'Archivé '+i,date:'',
    date_action:j(i*2+5),statut:'3 - En attente de tiers',archive:j(i*2+4),archive_motif:'absent du reporting'});
  const a=j(120), z=iso(new Date());

  let o=statsPeriode(a,z);
  log.push('avant qualification : menées à terme='+o.clos+' (statut '+o.closStatut+', archive '+o.closArch
    +') · sorties='+o.sortis+' · non qualifiées='+o.nonQualif);
  log.push('à qualifier détectés : '+aQualifier().length);

  // qualification en masse : 6 traites, 2 sortis
  qualifierArchives();
  const sels=[...document.querySelectorAll('#modCorps select[data-qa]')];
  sels.forEach((s,i)=>{ s.value = i<6 ? 'traite' : 'sorti' });
  [...document.querySelectorAll('#modPied button')].find(x=>x.textContent.trim()==='Enregistrer').click();

  o=statsPeriode(a,z);
  log.push('après qualification : menées à terme='+o.clos+' (statut '+o.closStatut+', archive '+o.closArch
    +') · sorties='+o.sortis+' · non qualifiées='+o.nonQualif+' · taux='+o.tauxClos+' %');
  log.push('avertissement « aucune clôture » : '+(o.sansCloture.length?o.sansCloture.join(', '):'éteint'));
  const h=construireRapportPDF(a,z);
  const m=h.match(/Affaires menées à terme[^<]*/);
  log.push('phrase du rapport : '+(m?m[0]:'ABSENTE'));

  // un dossier sorti ne doit pas etre compte comme abouti
  log.push('contrôle : sorti compté abouti ? '+
    (D.chantiers.filter(c=>c.archive_issue==='sorti').some(estAbouti)?'OUI (problème)':'non'));
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
