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
  D.parametres.id_nom='Testeuse Exemple'; D.parametres.id_fonction='Prévention';
  D.parametres.id_entite='Service régional';
  const j=n=>{const d=new Date(); d.setDate(d.getDate()-n); return iso(d)};
  D.chantiers=[]; D.notes=[]; D.appels=[];
  const tp=['Visite de chantier','Attente retour client','Constat de mise en danger',
            'Non-respect des prescriptions','Déraccordement','Réunion','Consignation'];
  for(let i=0;i<95;i++) D.chantiers.push({id:'d'+i,categorie:'chantier',libelle:'Dés '+i,date:'',
    date_action:j(i%28+1),statut:'3 - En attente de tiers',type:tp[i%tp.length]});
  for(let i=0;i<9;i++) D.chantiers.push({id:'c'+i,categorie:'convocation',libelle:'Conv '+i,
    date:j(i*3+1),statut:i<3?'termine':'a_preparer',tiers:'SARL Ent '+(i%4),type:'Constat de mise en danger'});
  // animations : datees dans la periode cette fois
  for(let i=0;i<4;i++) D.chantiers.push({id:'an'+i,categorie:'animation',libelle:'QHS '+i,
    date:j(i*6+2),statut:'termine',tiers:'Eiffage',participants:12+i,type:'Réunion'});
  for(let i=0;i<4;i++) D.chantiers.push({id:'t'+i,categorie:'transverse',libelle:'Tr '+i,
    date:j(i*8+1),statut:'realise'});
  const a=j(30), z=iso(new Date());
  let o=statsPeriode(a,z);
  log.push('prévention : actes='+o.prev.total+' conv='+o.prev.conv+' anim='+o.prev.anim
    +' entreprises='+o.prev.ents+' public='+o.prev.publics+' (règle '+o.prev.regle+')');
  log.push('   natures : '+o.prev.actes.slice(0,5).map(x=>x[0]+' '+x[1]).join(', '));
  const h=construireRapportPDF(a,z);
  log.push('section présente : '+/Prévention et réduction du risque/.test(h)
    +' | couverture territoriale : '+/Couverture territoriale/.test(h));

  // categorie vide rendue visible
  D.chantiers=D.chantiers.filter(c=>c.categorie!=='animation');
  for(let i=0;i<4;i++) D.chantiers.push({id:'anh'+i,categorie:'animation',libelle:'QHS ancien '+i,
    date:'2026-03-0'+(i+1),statut:'termine'});
  o=statsPeriode(a,z);
  log.push('avancement : '+o.avanc.map(x=>x.lib+'='+x.n+(x.vide?' (vide, '+x.hors+' hors période)':'')).join('  '));
  const h2=construireRapportPDF(a,z);
  log.push('mention hors période : '+(/Hors période, présentes au fichier/.test(h2)?'affichée':'ABSENTE'));
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
