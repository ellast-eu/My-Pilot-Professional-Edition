const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:900,height:1000}}); const p=await ctx.newPage();
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1400);
 const out=await p.evaluate(()=>{
  const log=[]; fichierCharge=true;
  D.parametres.categories=modeleCategories();
  const j=n=>{const d=new Date(); d.setDate(d.getDate()-n); return iso(d)};
  D.chantiers=[]; D.notes=[];
  // 130 dossiers comme apres un import Excel : la plupart SANS date d'intervention
  for(let i=0;i<130;i++){
    const datee = i<3;                       // seules 3 portent une vraie date
    D.chantiers.push({id:'d'+i,categorie:'chantier',libelle:'Dossier '+i,
      date: datee ? j(i*5+2) : '',
      date_action: j((i%150)+1),             // colonne « Date dernière action » du reporting
      statut:'3 - En attente de tiers',commune:'Violay'});
  }
  for(let i=0;i<4;i++) D.chantiers.push({id:'cv'+i,categorie:'convocation',libelle:'Convoc '+i,
    date:j(i*7+3),statut:'termine',commune:'Lyon'});
  // des notes datees sur des dossiers non datees : du travail bien reel
  for(let i=10;i<45;i++) D.notes.push({id:'n'+i,date:j((i%120)+1),heure:'09:00',
    contenu:'suivi dossier',chantier_id:'d'+i,duree:20,type:'suivi'});

  const a=j(180), z=iso(new Date());
  const o=statsPeriode(a,z);
  log.push('activités retenues sur 6 mois : '+o.acts.length+' (sur '+D.chantiers.length+' fiches)');
  log.push('   par catégorie : '+o.parCat.map(x=>x[0]+' '+x[1]).join(', '));
  const sansDate=D.chantiers.filter(c=>!c.date).length;
  log.push('fiches sans date : '+sansDate);
  const notesSurSansDate=D.notes.filter(n=>{
    const c=chantierPar(n.chantier_id); return c && !c.date && dansInt(n.date,a,z)}).length;
  log.push('notes datées portant sur une fiche sans date : '+notesSurSansDate);
  const actionDansPeriode=D.chantiers.filter(c=>!c.date && dansInt(c.date_action,a,z)).length;
  log.push('fiches sans date dont la dernière action tombe dans la période : '+actionDansPeriode);
  return log;
 });
 out.forEach(l=>console.log(l));
 await ctx.close(); await b.close();
})();
