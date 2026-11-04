const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 for(const [w,n] of [[1280,8],[1280,20],[900,8],[390,8]]){
  const ctx=await b.newContext({viewport:{width:w,height:1000}}); const p=await ctx.newPage();
  await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
  await p.goto(''+APP+''); await p.waitForTimeout(1400);
  await p.evaluate(nb=>{
   fichierCharge=true;
   const base=[['Relancer les propriétaires non répondants','courrier de relance après six mois'],
    ['Courrier type pour les non réponses','modèle de courrier de relance propriétaire'],
    ['Relance propriétaire par téléphone','appeler le propriétaire avant le courrier de relance'],
    ['Cartographier les communes à risque','repérer les communes de mise en danger'],
    ['Carte des communes sensibles','visualiser les communes à risque'],
    ['Préparer la réunion annuelle entreprises','ordre du jour'],
    ['Fiche réflexe pour les convocations',''],
    ['Automatiser le rapport mensuel','gagner du temps sur le rapport mensuel']];
   const cs=categories();
   for(let k=0;k<nb;k++){const x=base[k%base.length];
     D.idees.push(normaliserIdee({titre:x[0]+(k>=base.length?' '+(k+1):''),note:x[1],
       cat:(cs[k%3]||cs[0]||{}).cle||''}))}
   vueActive='idees'; rendre();
  },n);
  await p.waitForTimeout(4500);
  const r=await p.evaluate(()=>{
   const g=[...document.querySelectorAll('#idSvg .id-b')].map(e=>{
     const m=/translate\(([-\d.]+),([-\d.]+)\)/.exec(e.getAttribute('transform'));
     const t=e.querySelector('text');
     return {x:+m[1],y:+m[2],lib:t.textContent,
       r:+(e.querySelector('circle')?.getAttribute('r')||31)};
   });
   // boite d'etiquette : largeur mesuree reellement
   const boites=[...document.querySelectorAll('#idSvg .id-b text')]
     .map(t=>{const b=t.getBoundingClientRect(); return {x:b.left,y:b.top,width:b.width,height:b.height}});
   let chev=0, pires=[];
   for(let i=0;i<boites.length;i++) for(let j=i+1;j<boites.length;j++){
     const A=boites[i],B=boites[j];
     const ox=Math.min(A.x+A.width,B.x+B.width)-Math.max(A.x,B.x);
     const oy=Math.min(A.y+A.height,B.y+B.height)-Math.max(A.y,B.y);
     if(ox>1 && oy>1){ chev++; pires.push(g[i].lib+' / '+g[j].lib) }
   }
   const vb=document.getElementById('idSvg').getAttribute('viewBox').split(' ');
   const xs=g.map(q=>q.x), ys=g.map(q=>q.y);
   // bulles posees sur une membrane a laquelle elles n'appartiennent pas
   const M=metaIdees(); const dedans={};
   M.metas.forEach(m=>m.ideas.forEach(i=>dedans['i:'+i.id]=m.cle));
   let intrus=0;
   document.querySelectorAll('#idSvg .id-mem .trait').forEach(c=>{
     const cx=+c.getAttribute('cx'),cy=+c.getAttribute('cy'),R=+c.getAttribute('r');
     const cle=c.parentNode.getAttribute('data-idgrp');
     [...document.querySelectorAll('#idSvg .id-b')].forEach(e=>{
       const id=e.getAttribute('data-bulle'); if(!id) return;
       if(dedans['i:'+id]===cle) return;
       const m=/translate\(([-\d.]+),([-\d.]+)\)/.exec(e.getAttribute('transform'));
       if(Math.hypot(+m[1]-cx,+m[2]-cy) < R) intrus++;
     });
   });
   return {chev,pires:pires.slice(0,3),intrus,
     largeur:Math.round(Math.max(...xs)-Math.min(...xs)),
     hauteur:Math.round(Math.max(...ys)-Math.min(...ys)),
     L:Math.round(+vb[2]),H:Math.round(+vb[3]),
     hors:g.filter(q=>q.x<0||q.x>+vb[2]||q.y<0||q.y>+vb[3]).length,
     coupes:(()=>{const s=document.getElementById('idSvg').getBoundingClientRect();
       let c=0;
       document.querySelectorAll('#idSvg .id-b text,#idSvg .id-mem text').forEach(t=>{
         const b=t.getBoundingClientRect();
         if(b.left<s.left-0.5||b.right>s.right+0.5||b.top<s.top-0.5||b.bottom>s.bottom+0.5) c++;
       });
       return c})(),
     quiCoupe:(()=>{const s=document.getElementById('idSvg').getBoundingClientRect();
       const l=[];
       document.querySelectorAll('#idSvg .id-b text,#idSvg .id-mem text').forEach(t=>{
         const b=t.getBoundingClientRect();
         const d=[];
         if(b.left<s.left-0.5) d.push('gauche '+Math.round(s.left-b.left));
         if(b.right>s.right+0.5) d.push('droite '+Math.round(b.right-s.right));
         if(b.top<s.top-0.5) d.push('haut '+Math.round(s.top-b.top));
         if(b.bottom>s.bottom+0.5) d.push('bas '+Math.round(b.bottom-s.bottom));
         if(d.length) l.push((t.parentNode.classList.contains('id-mem')?'[membrane] ':'')+t.textContent+' : '+d.join(', '));
       });
       return l})()};
  });
  console.log(`${w}px / ${n} idées : étiquettes qui se chevauchent ${r.chev} | intrus dans une membrane ${r.intrus}`
   +` | étalement ${r.largeur}×${r.hauteur} sur ${r.L}×${r.H} | bulles hors cadre ${r.hors} | étiquettes coupées ${r.coupes}`);
  if(r.quiCoupe.length) console.log('      coupées :', r.quiCoupe.join('  |  '));
  if(r.pires.length) console.log('      ', r.pires.join('  ·  '));
  await ctx.close();
 }
 await b.close();
})();
