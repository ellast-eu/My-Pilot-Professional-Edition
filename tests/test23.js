const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:900,height:1200}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1400);
 const out=await p.evaluate(()=>{
  const log=[]; fichierCharge=true;
  D.parametres.categories=modeleCategories();
  D.chantiers=[]; D.notes=[];
  // reproduction de la situation de Stella : 4 animations, 1 seule rattachée à septembre
  D.chantiers.push({id:'a1',categorie:'animation',libelle:'EGM FEYZIN',date:'',statut:'reporte',
    tiers:'EGM',commune:'VENISSIEUX',type:'Sensibilisation réglementaire'});
  D.notes.push({id:'n1',date:'2026-09-18',heure:'14:00',contenu:'report acté',chantier_id:'a1',duree:20,type:'suivi'});
  D.chantiers.push({id:'a2',categorie:'animation',libelle:'Journée Sécurité SPIE',date:'2026-10-01',statut:'pret'});
  D.chantiers.push({id:'a3',categorie:'animation',libelle:'GRAND LYON',date:'2026-10-09',statut:'pret'});
  D.chantiers.push({id:'a4',categorie:'animation',libelle:'GRAND LYON',date:'2026-11-27',statut:'pret'});
  for(let i=0;i<102;i++) D.chantiers.push({id:'d'+i,categorie:'chantier',libelle:'Dés '+i,date:'',
    date_action:'2026-09-'+String(i%28+1).padStart(2,'0'),statut:'3 - En attente de tiers'});
  for(let i=0;i<57;i++) D.chantiers.push({id:'dh'+i,categorie:'chantier',libelle:'Dés vieux '+i,date:'',
    date_action:'2026-05-10',statut:'1 - À instruire'});

  const o=statsPeriode('2026-09-01','2026-09-30');
  log.push('animations dans la période : '+o.acts.filter(c=>c.categorie==='animation').map(c=>c.libelle).join(', '));
  log.push('avancement : '+o.avanc.map(x=>x.lib+'='+x.n+(x.hors?' (+'+x.hors+' hors)':'')).join('  '));
  const h=construireRapportPDF('2026-09-01','2026-09-30');
  const m=h.match(/Hors période, présentes au fichier[^<]*/);
  log.push('mention : '+(m?m[0].replace(/\s+/g,' '):'ABSENTE'));
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
