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
 await p.goto(''+APP+''); await p.waitForTimeout(1500);
 const out=await p.evaluate(()=>{
  const log=[]; fichierCharge=true;
  D.contacts=[]; D.organisations=[{id:'o1',nom:'Exemple Service régional',interne:true}];
  const noms=[['Sophie','Vidal'],['Paul','Exemple'],['Marie','Ott'],['Luc','Meyer'],
              ['Sophie','Rey'],['Karim','Benali'],['Alice','Dubois'],['Jean','Prost']];
  noms.forEach((n,i)=>D.contacts.push(normaliserContact({id:'k'+i,prenom:n[0],nom:n[1],org_id:i<3?'o1':''})));
  const C=D.contacts;
  C[0].liens=[{vers:'k1',type:'Responsable de'},{vers:'k2',type:'Collègue de'},
              {vers:'k3',type:'Partenaire de'},{vers:'k4',type:'Collègue de'}];
  C[1].liens=[{vers:'k5',type:'Responsable de'}];
  C[3].liens=[{vers:'k6',type:'Partenaire de'},{vers:'k7',type:'Collègue de'}];

  grapheNiv=1; const s1=fragGraphe('k0');
  log.push('niv1 : noeuds='+(s1.match(/class="grf-n/g)||[]).length+' aretes='+(s1.match(/class="grf-a/g)||[]).length);
  grapheNiv=2; const s2=fragGraphe('k0');
  log.push('niv2 : noeuds='+(s2.match(/class="grf-n/g)||[]).length+' aretes='+(s2.match(/class="grf-a/g)||[]).length);
  grapheNiv=1;
  const isole=normaliserContact({id:'z',prenom:'Zoé',nom:'Sans-lien'}); D.contacts.push(isole);
  log.push('contact isole : '+(fragGraphe('z').indexOf('Aucun lien saisi')>=0?'message explicite OK':'PROBLEME'));
  editerContact('k0');
  return log;
 });
 out.forEach(l=>console.log(l));
 await p.waitForTimeout(400);
 const el=await p.$('#modCorps .grf-box');
 if(el) await el.screenshot({path:'graphe1.png'});
 await p.evaluate(()=>{ grapheNiv=2; const z=document.querySelector('#modCorps .grf-box'); z.parentNode.innerHTML=fragGraphe('k0'); });
 await p.waitForTimeout(300);
 const el2=await p.$('#modCorps .grf-box');
 if(el2) await el2.screenshot({path:'graphe2.png'});
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
