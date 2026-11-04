const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
/* 3.19.1 — tout bouton du bandeau doit se lire, dans chacun de ses états */
const {chromium}=require('playwright'); const fs=require('fs');
const ok=[],ko=[];
const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:800}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+'');
 await p.waitForTimeout(1400);

 const ETATS=[
  ['sans fichier lié',        ()=>{fichierCharge=false; poignee=null;}],
  ['fichier lié, auto arrêté',()=>{fichierCharge=true; poignee={}; D.parametres.auto=false; dernierEnr='à 13:09'; sale=false;}],
  ['fichier lié, auto actif', ()=>{fichierCharge=true; poignee={}; D.parametres.auto=true;  dernierEnr='à 13:09'; sale=false;}],
  ['modifications en attente',()=>{fichierCharge=true; poignee={}; D.parametres.auto=false; sale=true;}],
  ['enregistrement en cours', ()=>{fichierCharge=true; poignee={}; D.parametres.auto=true;  sale=true;}]
 ];
 for(const [nom,etat] of ETATS){
  const r=await p.evaluate(fn=>{
   eval('('+fn+')')(); majEtat(); rendre();
   const lum=c=>{const m=/rgba?\((\d+), (\d+), (\d+)/.exec(c); if(!m) return null;
     const f=[+m[1],+m[2],+m[3]].map(v=>{v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
     return .2126*f[0]+.7152*f[1]+.0722*f[2]};
   const fondBandeau=getComputedStyle(document.querySelector('.bandeau')).backgroundColor;
   const Lb=lum(fondBandeau);
   return ['btnApropos','btnAide','btnPause','btnEnr'].map(id=>{
     const e=document.getElementById(id);
     const cs=getComputedStyle(e), rc=e.getBoundingClientRect();
     if(cs.display==='none' || rc.width===0) return {id, masque:true};
     /* le fond propre du bouton s'il est opaque, sinon celui du bandeau */
     const a=/rgba\([^)]*,\s*0\)/.test(cs.backgroundColor);
     const fond = a ? fondBandeau : cs.backgroundColor;
     const Lt=lum(cs.color), Lf=lum(fond);
     const texte=(Math.max(Lt,Lf)+.05)/(Math.min(Lt,Lf)+.05);
     /* un bouton dont le fond ne se distingue pas du bandeau doit au moins avoir un bord lisible */
     const Lfond=lum(fond), Lbord=lum(cs.borderTopColor);
     const fondVsBandeau=(Math.max(Lfond,Lb)+.05)/(Math.min(Lfond,Lb)+.05);
     const bord=(Math.max(Lbord,Lb)+.05)/(Math.min(Lbord,Lb)+.05);
     return {id, masque:false, texte:+texte.toFixed(2), bord:+bord.toFixed(2),
       fondVsBandeau:+fondVsBandeau.toFixed(2), transparent:a,
       creux:e.classList.contains('creux'), lib:e.textContent.trim()};
   });
  }, etat.toString());
  for(const x of r){
   if(x.masque){ T(nom+' · '+x.id+' : masqué volontairement', true); continue }
   T(nom+' · '+x.id+' : texte lisible', x.texte>=4.5, 'contraste '+x.texte+' pour « '+x.lib+' »');
   /* un bouton sans fond n'a que son bord pour exister ; un bouton plein se voit
      par son texte, déjà contrôlé au-dessus */
   if(x.transparent)
     T(nom+' · '+x.id+' : le bord dessine le bouton', x.bord>=1.8,
       'bord '+x.bord+' pour « '+x.lib+' »');
  }
 }

 /* le cas précis signalé : fichier lié et enregistrement automatique */
 const cas=await p.evaluate(()=>{
   fichierCharge=true; poignee={}; D.parametres.auto=true; dernierEnr='à 13:09'; sale=false;
   majEtat(); rendre();
   const e=document.getElementById('btnEnr'), cs=getComputedStyle(e);
   return {creux:e.classList.contains('creux'), couleur:cs.color,
     bord:cs.borderTopColor, lib:e.textContent.trim()};
 });
 T('Enregistrer passe bien en creux sous auto', cas.creux===true);
 T('mais garde la couleur claire des boutons du bandeau',
   cas.couleur==='rgb(201, 207, 201)', cas.couleur);
 T('et un bord visible', cas.bord==='rgb(74, 81, 76)', cas.bord);

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));
 console.log('\nRÉUSSIS '+ok.length);
 if(ko.length){ console.log('ÉCHECS  '+ko.length); ko.forEach(x=>console.log('  ✗ '+x)) }
 else console.log('ÉCHECS  0');
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
