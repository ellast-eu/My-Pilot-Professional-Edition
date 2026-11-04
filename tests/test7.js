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
  // quelle colonne porte date_interv ?
  const col=champsImport().filter(x=>x.k==='date_interv')[0];
  log.push('colonne date_interv : '+(col?col.c:'ABSENTE'));
  log.push('reconnaissance : '+['FAIT','fait','Fait.',' OK ','Réalisé','REALISE','Terminé','à programmer','2026-08-27']
    .map(v=>`"${v}"=>${estMarqueFait(v)}`).join('  '));

  const cas=[['FAIT','marqueur'],['fait','minuscule'],['Réalisé','accent'],
             ['à programmer','texte libre'],['2026-11-04','vraie date'],['','vide']];
  cas.forEach(([val,lbl],i)=>{
    const f={id:'x'+i,categorie:'chantier',ref_technique:'5000000000010'+i,libelle:'F'+i,date:'2026-10-05',
             etat_affaire:'3 - En attente de tiers'};
    D.chantiers=[f];
    const r=[]; r[0]="Testeuse Exemple"; r[7]='5000000000010'+i; r[5]="3 - En attente de tiers";
    if(col) r[col.c-1]=val;
    const o=ligneVersDossier(r);
    appliquerImport(f,o,true);
    log.push(`  ${lbl.padEnd(12)} "${val}"`.padEnd(34)+` -> date planif = "${f.date}"`);
  });
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
