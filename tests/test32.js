const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
/* 3.16.1 — carte vivante : couleurs de catégorie, membranes, cristaux, gestes, extinction */
const {chromium}=require('playwright'); const fs=require('fs');
const ok=[],ko=[];
const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const tr=async(p,sel)=>p.evaluate(s=>{
  const e=document.querySelector(s); if(!e) return null;
  const m=/translate\(([-\d.]+),([-\d.]+)\)(?:\s*scale\(([\d.]+)\))?/.exec(e.getAttribute('transform')||'');
  return m?{x:+m[1],y:+m[2],k:m[3]?+m[3]:1}:null;
},sel);

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.addInitScript(()=>{            /* compteur d'images : la simulation doit s'éteindre */
   window.__raf=0; const f=requestAnimationFrame;
   requestAnimationFrame=function(c){ window.__raf++; return f(c) };
 });
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+'');
 await p.waitForTimeout(1600);
 await p.evaluate(()=>{fichierCharge=true; rendre()});

 /* jeu d'essai : un groupe de 3 dans une catégorie, des isolées dans une autre */
 await p.evaluate(()=>{
   const cats=categories();
   const A=cats[0].cle, B=(cats[1]||cats[0]).cle;
   [['Relancer les propriétaires non répondants','courrier de relance après six mois sans réponse',A],
    ['Courrier type pour les non réponses','modèle de courrier de relance propriétaire',A],
    ['Relance propriétaire par téléphone','appeler le propriétaire avant le courrier de relance',A],
    ['Cartographier les communes à risque','repérer les communes de mises en danger',B],
    ['Préparer la réunion annuelle entreprises','',B]
   ].forEach(x=>D.idees.push(normaliserIdee({titre:x[0],note:x[1],cat:x[2]})));
   vueActive='idees'; rendre();
 });
 await p.waitForTimeout(900);

 /* 1. les couleurs viennent des catégories, pas d'une palette inventée */
 const coul=await p.evaluate(()=>{
   const cats=categories();
   const voulues=new Set(cats.map(k=>(k.couleur||'').toUpperCase()));
   const vues=Array.from(document.querySelectorAll('#idSvg .id-b circle,#idSvg .id-b path'))
     .map(e=>(e.getAttribute('stroke')||'').toUpperCase()).filter(Boolean);
   const mem=Array.from(document.querySelectorAll('#idSvg .id-mem .trait'))
     .map(e=>(e.getAttribute('stroke')||'').toUpperCase());
   return {etrangeres:vues.filter(c=>!voulues.has(c)),
     distinctes:new Set(vues).size, mem, voulues:[...voulues]};
 });
 T('aucune couleur étrangère aux catégories', coul.etrangeres.length===0, coul.etrangeres.join(','));
 T('deux catégories donnent deux couleurs', coul.distinctes===2, ''+coul.distinctes);
 T('la membrane prend la couleur de sa catégorie',
   coul.mem.length===1 && coul.voulues.indexOf(coul.mem[0])>=0, coul.mem.join(','));

 /* 2. la membrane : un objet visible, titré */
 const mem=await p.evaluate(()=>{
   const g=document.querySelector('#idSvg .id-mem');
   if(!g) return null;
   const c=g.querySelector('.trait'), pr=g.querySelector('.prise'), t=g.querySelector('text');
   const st=getComputedStyle(c), sp=getComputedStyle(pr);
   return {r:+c.getAttribute('r'), titre:t.textContent, grp:g.getAttribute('data-idgrp'),
     traitInerte:st.pointerEvents, priseActive:sp.pointerEvents,
     pointille:c.getAttribute('stroke-dasharray'),
     memeRayon:+pr.getAttribute('r')===+c.getAttribute('r'),
     ySousLeTitre:+t.getAttribute('y') < +c.getAttribute('cy')-+c.getAttribute('r')};
 });
 T('la membrane existe et a un rayon', mem && mem.r>40, mem?''+Math.round(mem.r):'absente');
 T('elle porte le titre du groupe', !!mem.titre && mem.titre.length>2, mem.titre);
 T('elle est en pointillé', mem.pointille==='5 4', mem.pointille);
 T('le titre est posé au-dessus', mem.ySousLeTitre===true);
 T('le trait visible ne capte rien', mem.traitInerte==='none', mem.traitInerte);
 T('l’anneau transparent capte le clic', mem.priseActive==='stroke', mem.priseActive);
 T('l’anneau suit le rayon du trait', mem.memeRayon===true);

 /* 3. cliquer l'anneau sélectionne tout le groupe */
 await p.evaluate(()=>{selIdees={}});
 const anneau=await p.evaluate(()=>{
   const g=document.querySelector('#idSvg .id-mem .prise');
   const r=g.getBoundingClientRect();
   return {x:r.left+r.width/2, y:r.top+1};     /* sur l'anneau, en haut du cercle */
 });
 await p.mouse.click(anneau.x,anneau.y);
 await p.waitForTimeout(400);
 const selGrp=await p.evaluate(()=>Object.keys(selIdees).length);
 T('un clic sur la membrane sélectionne le groupe', selGrp===3, ''+selGrp);

 /* 4. glisser une bulle : elle bouge, et cela ne vaut pas sélection */
 await p.evaluate(()=>{selIdees={}; rendre()});
 await p.waitForTimeout(700);
 const av=await tr(p,'#idSvg .id-b');
 const box=await p.evaluate(()=>{
   const r=document.querySelector('#idSvg .id-b').getBoundingClientRect();
   return {x:r.left+r.width/2,y:r.top+r.height/2};
 });
 await p.mouse.move(box.x,box.y);
 await p.mouse.down();
 for(const d of [20,45,70,95,120]) await p.mouse.move(box.x+d,box.y-d/2,{steps:2});
 const pendant=await tr(p,'#idSvg .id-b');      /* position pendant le geste */
 await p.mouse.up();
 await p.waitForTimeout(600);
 const ap=await tr(p,'#idSvg .id-b');           /* après rappel par les forces */
 const selApres=await p.evaluate(()=>Object.keys(selIdees).length);
 const suivi=Math.hypot(pendant.x-av.x,pendant.y-av.y);
 T('la bulle suit le pointeur au pixel', suivi>120 && suivi<145, Math.round(suivi)+'px pour 134px');
 T('relâchée, elle est reprise par son groupe',
   Math.hypot(ap.x-pendant.x,ap.y-pendant.y)>30 && Math.hypot(ap.x-av.x,ap.y-av.y)<90,
   `${Math.round(pendant.x)},${Math.round(pendant.y)} → ${Math.round(ap.x)},${Math.round(ap.y)}`);
 T('un glisser ne sélectionne pas', selApres===0, ''+selApres);

 /* 5. un clic court sélectionne toujours */
 const box2=await p.evaluate(()=>{
   const r=document.querySelector('#idSvg .id-b').getBoundingClientRect();
   return {x:r.left+r.width/2,y:r.top+r.height/2};
 });
 await p.mouse.click(box2.x,box2.y);
 await p.waitForTimeout(400);
 T('un clic court sélectionne', (await p.evaluate(()=>Object.keys(selIdees).length))===1);
 await p.evaluate(()=>{selIdees={}; rendre()});
 await p.waitForTimeout(600);

 /* 6. faire glisser le fond déplace la carte */
 const vue0=await p.evaluate(()=>({...vueIdeesT}));
 const fond=await p.evaluate(()=>{
   const r=document.getElementById('idSvg').getBoundingClientRect();
   return {x:r.left+12,y:r.bottom-12};        /* un coin, loin des bulles */
 });
 await p.mouse.move(fond.x,fond.y);
 await p.mouse.down();
 for(const d of [15,40,70,100]) await p.mouse.move(fond.x+d,fond.y-d/3,{steps:2});
 await p.mouse.up();
 await p.waitForTimeout(300);
 const vue1=await p.evaluate(()=>({...vueIdeesT}));
 T('le fond se fait glisser', Math.abs(vue1.x-vue0.x)>40, `${vue0.x} → ${Math.round(vue1.x)}`);
 T('le glissement du fond ne change pas l’échelle', vue1.k===vue0.k);

 /* 7. zoom par les boutons */
 await p.click('[data-act="id-zplus"]');
 await p.waitForTimeout(200);
 const z1=await p.evaluate(()=>vueIdeesT.k);
 await p.click('[data-act="id-zmoins"]');
 await p.waitForTimeout(200);
 const z2=await p.evaluate(()=>vueIdeesT.k);
 T('le bouton + agrandit', z1>1.2, ''+z1.toFixed(2));
 T('le bouton − réduit', Math.abs(z2-1)<0.01, ''+z2.toFixed(2));
 await p.click('[data-act="id-zplus"]'); await p.click('[data-act="id-zplus"]');
 await p.waitForTimeout(200);
 const tAvRaz=await tr(p,'#idSvg > g');
 T('la transformation est bien portée par le groupe racine', tAvRaz && tAvRaz.k>1.4,
   JSON.stringify(tAvRaz));
 await p.click('[data-act="id-zraz"]');
 await p.waitForTimeout(200);
 const raz=await p.evaluate(()=>({...vueIdeesT}));
 T('le bouton ⟳ revient à la vue entière', raz.k===1 && raz.x===0 && raz.y===0, JSON.stringify(raz));

 /* 8. bornes du zoom */
 for(let i=0;i<12;i++) await p.click('[data-act="id-zplus"]');
 await p.waitForTimeout(200);
 const haut=await p.evaluate(()=>vueIdeesT.k);
 for(let i=0;i<24;i++) await p.click('[data-act="id-zmoins"]');
 await p.waitForTimeout(200);
 const bas=await p.evaluate(()=>vueIdeesT.k);
 T('le zoom est borné en haut', haut<=3.001, ''+haut.toFixed(2));
 T('le zoom est borné en bas', bas>=0.399, ''+bas.toFixed(2));
 await p.click('[data-act="id-zraz"]');

 /* 9. la molette : Ctrl zoome, seule elle laisse défiler la page */
 const svgC=await p.evaluate(()=>{
   const r=document.getElementById('idSvg').getBoundingClientRect();
   return {x:r.left+r.width/2,y:r.top+r.height/2};
 });
 await p.setViewportSize({width:1280,height:560});   /* la page doit pouvoir défiler */
 await p.waitForTimeout(500);
 const svgC2=await p.evaluate(()=>{
   const r=document.getElementById('idSvg').getBoundingClientRect();
   return {x:r.left+r.width/2,y:Math.min(r.top+r.height/2,window.innerHeight-20)};
 });
 svgC.x=svgC2.x; svgC.y=svgC2.y;
 T('la page est bien défilable pour ce contrôle',
   await p.evaluate(()=>document.scrollingElement.scrollHeight>window.innerHeight+40));
 await p.evaluate(()=>window.scrollTo(0,0));
 await p.mouse.move(svgC.x,svgC.y);
 await p.mouse.wheel(0,220);
 await p.waitForTimeout(250);
 const apresMolette=await p.evaluate(()=>({k:vueIdeesT.k,defile:window.scrollY}));
 T('la molette seule ne zoome pas', Math.abs(apresMolette.k-1)<0.001, ''+apresMolette.k);
 T('la molette seule fait défiler la page', apresMolette.defile>0, ''+apresMolette.defile);
 await p.evaluate(()=>window.scrollTo(0,0));
 await p.waitForTimeout(200);
 await p.mouse.move(svgC.x,svgC.y);
 await p.keyboard.down('Control');
 await p.mouse.wheel(0,-220);
 await p.keyboard.up('Control');
 await p.waitForTimeout(250);
 const zCtrl=await p.evaluate(()=>({k:vueIdeesT.k,defile:window.scrollY}));
 T('Ctrl + molette zoome', zCtrl.k>1.05, ''+zCtrl.k.toFixed(2));
 T('Ctrl + molette ne fait pas défiler', zCtrl.defile===0, ''+zCtrl.defile);
 await p.click('[data-act="id-zraz"]');
 await p.setViewportSize({width:1280,height:1000});
 await p.waitForTimeout(400);

 /* 10. la simulation s'éteint toute seule : pas de boucle qui tourne en fond */
 await p.evaluate(()=>{rendre(); window.__raf=0});
 await p.waitForTimeout(4000);
 const r1=await p.evaluate(()=>window.__raf);
 await p.waitForTimeout(2500);
 const r2=await p.evaluate(()=>window.__raf);
 T('la simulation tourne puis s’arrête', r1>20 && r2===r1, `images ${r1} puis ${r2}`);
 const fige=await p.evaluate(()=>{
   const g=document.querySelector('#idSvg .id-b');
   return g.getAttribute('transform');
 });
 await p.waitForTimeout(600);
 T('la carte est posée et ne bouge plus',
   fige===(await p.evaluate(()=>document.querySelector('#idSvg .id-b').getAttribute('transform'))));

 /* 11. quitter l'onglet arrête la boucle */
 await p.evaluate(()=>{vueActive='idees'; rendre()});
 await p.waitForTimeout(200);
 await p.evaluate(()=>{vueActive='jour'; rendre(); window.__raf=0});
 await p.waitForTimeout(1500);
 T('quitter l’onglet arrête la simulation', (await p.evaluate(()=>window.__raf))===0,
   ''+(await p.evaluate(()=>window.__raf)));
 await p.evaluate(()=>{vueActive='idees'; rendre()});
 await p.waitForTimeout(800);

 /* 12. la carte ne saute pas d'un rendu à l'autre */
 const p1=await tr(p,'#idSvg .id-b');
 await p.evaluate(()=>rendre());
 await p.waitForTimeout(120);
 const p2=await tr(p,'#idSvg .id-b');
 T('les positions sont mémorisées entre deux rendus',
   Math.hypot(p2.x-p1.x,p2.y-p1.y)<25,
   `${Math.round(p1.x)},${Math.round(p1.y)} → ${Math.round(p2.x)},${Math.round(p2.y)}`);
 await p.waitForTimeout(2500);

 /* 13. le cristal : hexagone sur la carte, éclosion, ouverture */
 await p.evaluate(()=>{
   selIdees={}; const m=metaIdees(); m.metas[0].ideas.forEach(i=>selIdees[i.id]=true); rendre();
 });
 await p.waitForTimeout(300);
 await p.click('[data-act="id-crist"]');
 await p.waitForTimeout(300);
 await p.fill('#crReponse', JSON.stringify({
   titre:'Un parcours de relance unique',
   synthese:'Les relances se font au cas par cas. Un enchaînement unique rendrait le suivi lisible.',
   objectifs:['Un parcours unique'],premieres_etapes:['Lister les dossiers'],
   points_de_vigilance:['Garder une trace datée']}));
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>/Intégrer/.test(b.textContent)).click()});
 await p.waitForTimeout(400);
 T('la fiche du cristal s’ouvre', await p.evaluate(()=>document.getElementById('modale').open));
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>b.textContent==='Fermer').click()});
 await p.waitForTimeout(120);
 const eclosion=await p.evaluate(()=>{
   const f=document.querySelector('#idSvg .id-b.cri .id-f');
   return f?{debut:f.getAttribute('transform'),trans:getComputedStyle(f).transitionDuration}:null;
 });
 T('le cristal est sur la carte', !!eclosion);
 T('il éclot par une transition', eclosion && parseFloat(eclosion.trans)>0.3, eclosion&&eclosion.trans);
 await p.waitForTimeout(1200);
 const pose=await p.evaluate(()=>
   document.querySelector('#idSvg .id-b.cri .id-f').getAttribute('transform'));
 T('l’éclosion se termine à l’échelle 1', /scale\(1\)/.test(pose), pose);
 const hexa=await p.evaluate(()=>{
   const g=document.querySelector('#idSvg .id-b.cri');
   const d=g.querySelector('path').getAttribute('d');
   return {sommets:(d.match(/L/g)||[]).length+1, ferme:/Z$/.test(d),
     rayons:g.querySelectorAll('path').length};
 });
 T('le cristal a six sommets', hexa.sommets===6, ''+hexa.sommets);
 T('le tracé est fermé', hexa.ferme===true);
 T('il porte ses trois rayons', hexa.rayons===2, ''+hexa.rayons);
 await p.evaluate(()=>{fermerModale()});
 await p.waitForTimeout(200);
 await p.click('#idSvg .id-b.cri');
 await p.waitForTimeout(350);
 T('cliquer le cristal ouvre sa fiche',
   await p.evaluate(()=>document.getElementById('modale').open &&
     /relance/i.test(document.getElementById('modTitre').textContent)));
 await p.evaluate(()=>fermerModale());

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));
 console.log('\nRÉUSSIS '+ok.length);
 if(ko.length){ console.log('ÉCHECS  '+ko.length); ko.forEach(x=>console.log('  ✗ '+x)) }
 else console.log('ÉCHECS  0');
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
