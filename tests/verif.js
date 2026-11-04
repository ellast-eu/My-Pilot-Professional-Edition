const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 for(const w of [1280,390]){
  const ctx=await b.newContext({viewport:{width:w,height:900}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
  await p.goto(''+APP+''); await p.waitForTimeout(1600);
  const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
    v:APP_VERSION, imp:getComputedStyle(document.getElementById('impression')).display}));
  console.log(w+'px : scrollWidth',r.sw,'/ client',r.cw,'| v'+r.v,'| #impression',r.imp,'| erreurs',errs.length,errs.slice(0,1));
  await ctx.close();
 }
 await b.close();
})();
