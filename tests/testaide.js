const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await (await b.newContext()).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1400);
 const r=await p.evaluate(()=>{
   window.ouvrirAide('activites');
   const a=document.getElementById('paCorps').textContent;
   window.ouvrirAide('journal');
   const j=document.getElementById('paCorps').textContent;
   window.ouvrirAide('permanence');
   const t=document.getElementById('paCorps').textContent;
   return {rubriques:window.AIDE.length,
     cr_act:/Transmettre un dossier/.test(a) && /historique des notes/.test(a),
     cr_note:/Transmettre une note ou un appel/.test(j),
     perm:/plage tenue/.test(t) && /les plages s’additionnent/.test(t)};
 });
 console.log(r, '| erreurs', errs.length);
 await b.close();
})();
