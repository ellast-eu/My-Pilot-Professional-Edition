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
  D.chantiers=[]; D.notes=[];
  // situation de Stella : dossiers archives en septembre, derniere action en aout (sortis du reporting)
  for(let i=0;i<8;i++) D.chantiers.push({id:'ar'+i,categorie:'chantier',libelle:'Soldé '+i,date:'',
    date_action:'2026-08-1'+i, archive:'2026-09-1'+i, archive_motif:'absent du reporting',
    statut:'3 - En attente de tiers', commune: i<2?'Violay':''});
  for(let i=0;i<20;i++) D.chantiers.push({id:'d'+i,categorie:'chantier',libelle:'Actif '+i,date:'',
    date_action:'2026-09-0'+(i%9+1),statut:'1 - À instruire',commune:''});
  const a='2026-09-01', z='2026-09-30';

  let o=statsPeriode(a,z);
  log.push('rattachés à septembre : '+o.acts.length+'  (dont par archivage : '+o.parArch+')');
  log.push('archives visibles dans la période : '+o.acts.filter(c=>c.archive).length+' / 8');
  log.push('non qualifiées : '+o.nonQualif);

  // qualification
  D.chantiers.forEach(c=>{ if(c.archive) c.archive_issue='traite' });
  o=statsPeriode(a,z);
  log.push('après qualification : menées à terme='+o.clos+' · taux='+o.tauxClos+' %');
  const h=construireRapportPDF(a,z);
  const g=(re)=>{const m=h.match(re); return m?m[0].replace(/\s+/g,' '):'ABSENT'};
  log.push('méthode : '+g(/Un dossier est rattaché[^<]*/));
  log.push('avancement : '+g(/Affaires menées à terme[^<]*/));
  log.push('communes  : '+g(/\d+ commune\(s\) concernée\(s\)[^<]*/));
  log.push('jours ouvrés : '+g(/imputées sur[^<]*/));
  log.push('avertissement : '+(/À vérifier avant diffusion/.test(h)?'affiché':'éteint'));
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
