const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 for(const [f,lbl] of [['/mnt/user-data/outputs/PST_Pilot_v3.6.1.html','3.6.1 (avant)'],
                       [path.join(RACINE,'MyPilot_Pro.html'),'3.6.2 (corrigee)']]){
  const ctx=await b.newContext({viewport:{width:1280,height:1000}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
  await p.goto('file://'+f); await p.waitForTimeout(1400);
  await p.evaluate(()=>{
    fichierCharge=true;
    D.contacts=[normaliserContact({nom:'Exemple',prenom:'Paul'}),
                normaliserContact({nom:'Ott',prenom:'Marie'}),
                normaliserContact({nom:'Meyer',prenom:'Luc'})];
    vueActive='contacts'; rendre();
  });
  await p.waitForTimeout(300);
  await p.click('#ctq');
  // frappe caractere par caractere, comme un humain
  for(const ch of 'berth') await p.type('#ctq',ch,{delay:60});
  const r=await p.evaluate(()=>{
    const e=document.getElementById('ctq');
    return {focus:document.activeElement===e, val:e?e.value:'(champ disparu)',
            caret:e?e.selectionStart:null,
            lignes:document.querySelectorAll('[data-contact]').length};
  });
  console.log(`${lbl.padEnd(16)} focus=${r.focus}  valeur="${r.val}"  caret=${r.caret}  resultats=${r.lignes}  erreurs=${errs.length}`);
  await ctx.close();
 }
 await b.close();
})();
