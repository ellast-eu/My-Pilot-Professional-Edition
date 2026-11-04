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
  // categorie d'import saine, issue du modele
  let mod=null; modeleCategories().forEach(x=>{ if(x.cle==='chantier') mod=x });
  D.parametres.categories[0]=mod;
  D.parametres.gestionnaire="Testeuse Exemple";
  // feuille synthetique : 2 lignes d'en-tete + 6 lignes, dont 2 a Stella
  const L=[[],[]];
  const row=(gest,ref_technique,client)=>{const r=[];r[0]=gest;r[1]="Type A";r[5]="3 - En attente de tiers";
    r[6]="b. Préparé, à envoyer";r[7]=ref_technique;r[8]=client;r[18]="C4";return r};
  L.push(row("Testeuse Exemple","50000000000001","CLIENT A"));
  L.push(row("Paul Durand","50000000000002","CLIENT B"));
  L.push(row("Paul Durand","50000000000003","CLIENT C"));
  L.push(row("Testeuse Exemple","50000000000004","CLIENT D"));
  L.push(row("Marie Ott","50000000000005","CLIENT E"));
  L.push(row("Marie Ott","50000000000006","CLIENT F"));

  let d=diagImport(), r=analyserImport(L);
  log.push(`SAIN      : filtre=${d.filtre} applique=${d.applique} souci=${d.souci} cols=${d.cols} | retenues=${r.nouv.length+r.maj.length+r.inchange} ecartees=${r.autres}`);

  // sabotage 1 : la categorie perd son champ de filtre (cas de Stella)
  D.parametres.categories[0].filtre="";
  d=diagImport(); r=analyserImport(L);
  log.push(`SANS FILTRE: filtre=${d.filtre||'(vide)'} applique=${d.applique} souci=${d.souci} | retenues=${r.nouv.length+r.maj.length+r.inchange} ecartees=${r.autres}`);
  ecranImport(r);
  const btns=[...document.querySelectorAll('#modPied button')].map(b=>b.textContent.trim());
  const alerte=document.querySelector('#modCorps').innerText.indexOf("NON APPLIQUÉ")>=0;
  log.push(`             boutons=[${btns.join(' | ')}] alerte=${alerte}`);

  // reparation
  reparerImportCat();
  d=diagImport(); r=analyserImport(L);
  log.push(`REPARE     : filtre=${d.filtre} applique=${d.applique} souci=${d.souci} cols=${d.cols} | retenues=${r.nouv.length+r.maj.length+r.inchange} ecartees=${r.autres}`);

  // sabotage 2 : le champ de filtre existe mais n'est relie a aucune colonne
  D.parametres.categories[0].champs.forEach(f=>{ if(f.cle==='gestionnaire') f.col=0 });
  d=diagImport();
  log.push(`COL PERDUE : filtre=${d.filtre} champConnu=${d.champConnu} souci=${d.souci}`);
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
