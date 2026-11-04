const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1200}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1400);
 /* v1.5 : les rubriques vivent dans la section Organisation. */
 await p.evaluate(()=>{ fichierCharge=true; vueActive='donnees'; ongletOptions='organisation'; rendre() });
 await p.waitForTimeout(400);
 const noms=()=>p.evaluate(()=>rubriques().map(r=>r.nom));
 console.log('ordre initial :', (await noms()).join(' | '));
 const etat=await p.evaluate(()=>{
   const b=[...document.querySelectorAll('[data-rubmv]')];
   const prem=b.filter(x=>x.dataset.sens==='-1')[0];
   const der=b.filter(x=>x.dataset.sens==='1').slice(-1)[0];
   return {total:b.length, premierMonterDesactive:prem.disabled, dernierDescendreDesactive:der.disabled};
 });
 console.log('boutons :', etat.total, '| ▲ du 1er désactivé :', etat.premierMonterDesactive,
             '| ▼ du dernier désactivé :', etat.dernierDescendreDesactive);
 // descendre la 1re, puis remonter la derniere de deux crans
 await p.evaluate(()=>document.querySelectorAll('[data-rubmv][data-sens="1"]')[0].click());
 await p.waitForTimeout(250);
 console.log('après ▼ sur la 1re :', (await noms()).slice(0,3).join(' | '));
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('[data-rubmv][data-sens="-1"]')]; b[b.length-1].click() });
 await p.waitForTimeout(250);
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('[data-rubmv][data-sens="-1"]')]; b[b.length-2].click() });
 await p.waitForTimeout(250);
 const fin=await noms();
 console.log('après 2× ▲ sur la dernière :', fin.slice(-3).join(' | '));
 // l'ordre est-il repris ailleurs ?
 const ailleurs=await p.evaluate(()=>{
   const o=optionsLien("");
   const rub=[...o.matchAll(/<option value="r:[^"]+"[^>]*>([^<]+)</g)].map(m=>m[1]);
   return rub;
 });
 console.log('ordre dans le sélecteur de note :', ailleurs.slice(0,4).join(' | '));
 console.log('identique à la liste :', JSON.stringify(ailleurs)===JSON.stringify(fin));
 // persistance
 await p.waitForTimeout(900);
 const persiste=await p.evaluate(()=>JSON.parse(localStorage.getItem('pst-pilot-v1')).parametres.rubriques.map(r=>r.nom));
 console.log('enregistré dans le tampon :', JSON.stringify(persiste)===JSON.stringify(fin));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
