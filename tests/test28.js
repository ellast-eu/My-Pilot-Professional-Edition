const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:900}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.goto(''+APP+''); await p.waitForTimeout(1600);
 const r=await p.evaluate(()=>({defaut:NOM_DEFAUT, affiche:D.parametres.nom_app,
   entete:(document.querySelector('.app-nom')||document.querySelector('header'))?.textContent.trim().slice(0,40),
   v:APP_VERSION}));
 console.log('NOM_DEFAUT =', r.defaut, '| paramètre =', r.affiche, '| v'+r.v);
 console.log('en-tête :', JSON.stringify(r.entete), '| erreurs', errs.length);
 await ctx.close(); await b.close();
})();
