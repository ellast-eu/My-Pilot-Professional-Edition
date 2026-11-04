const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
/* 3.20.0 — bandeau animé de la fenêtre À propos */
const {chromium}=require('playwright'); const fs=require('fs');
const ok=[],ko=[];
const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:950}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.addInitScript(()=>{ window.__raf=0; const f=setInterval;
   window.setInterval=function(c,d){ window.__raf++; return f(c,d) }; });
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+'');
 await p.waitForTimeout(1500);
 const DEF=await p.evaluate(()=>NOM_DEFAUT);
 const lisible=t=>String(t||'').replace(/\u00b7/g,' ');  /* l'espace s'affiche en point rouge */
 /* la copie porte un nom personnalisé : le bandeau doit afficher celui du code */
 await p.evaluate(()=>{fichierCharge=true; D.parametres.nom_app='My Pilot Pro'; rendre()});

 await p.click('#btnApropos');
 await p.waitForTimeout(150);

 /* 1. le bandeau existe, en tête, avec logo et sous-titre */
 const ban=await p.evaluate(()=>{
   const b=document.querySelector('#modCorps .ap-ban');
   if(!b) return null;
   const corps=document.getElementById('modCorps');
   const lg=b.querySelector('.ap-logo'), n=b.querySelector('.ap-nom'), so=b.querySelector('.ap-sous');
   const cs=getComputedStyle(b), csn=getComputedStyle(n);
   return {premier:corps.firstElementChild===b,
     logo:!!(lg && lg.querySelector('svg')),
     sous:so?so.textContent:'',
     fond:cs.backgroundColor, couleurNom:csn.color,
     pleineLargeur:Math.round(b.getBoundingClientRect().width)
       >=Math.round(corps.getBoundingClientRect().width)-1,
     aria:n.getAttribute('aria-label')};
 });
 T('le bandeau existe', !!ban, 'absent');
 T('il est tout en haut de la fenêtre', ban && ban.premier===true);
 T('il porte le logo', ban && ban.logo===true);
 T('il porte le sous-titre', ban && /pilotage d’activité/.test(ban.sous), ban&&ban.sous);
 T('il s’étend sur toute la largeur', ban && ban.pleineLargeur===true);
 T('fond sombre et texte clair', ban && ban.fond==='rgb(25, 28, 27)'
   && ban.couleurNom==='rgb(242, 243, 241)', ban&&ban.fond+' / '+ban.couleurNom);
 T('le nom est lisible par un lecteur d’écran pendant l’animation',
   ban && ban.aria===DEF, ban&&ban.aria);

 /* 2. l'animation est en cours : des 0 et des 1 en rouge */
 const enCours=await p.evaluate(()=>{
   const n=document.getElementById('apNom');
   const bits=n.querySelectorAll('.bit');
   return {texte:n.textContent, bits:bits.length,
     couleurBit:bits.length?getComputedStyle(bits[0]).color:''};
 });
 T('des chiffres binaires s’affichent', enCours.bits>0, enCours.texte);
 T('ils ne contiennent que des 0 et des 1',
   /^[01]+$/.test(enCours.texte.replace(/[^0-9A-ZÀ-Ÿ·]/g,'').replace(/[A-ZÀ-Ÿ·]/g,'')),
   enCours.texte);
 T('ils sont en rouge', enCours.couleurBit==='rgb(216, 35, 42)', enCours.couleurBit);

 /* 3. l'animation se termine sur le nom par défaut du code */
 await p.waitForTimeout(1800);
 const fini=await p.evaluate(()=>{
   const n=document.getElementById('apNom');
   return {texte:n.textContent, bits:n.querySelectorAll('.bit').length,
     points:n.querySelectorAll('.pt').length,
     anim:!!window.animApropos};
 });
 T('elle se fige sur le nom par défaut', lisible(fini.texte)===DEF, fini.texte+' (attendu '+DEF+')');
 T('plus aucun chiffre ne subsiste', fini.bits===0, ''+fini.bits);
 T('l’espace devient un point rouge, comme dans l’en-tête',
   fini.points===(DEF.split(' ').length-1), ''+fini.points);
 T('la minuterie est arrêtée', fini.anim===false);

 /* 4. c'est bien le nom du code, pas celui de la copie */
 const corps=await p.evaluate(()=>document.getElementById('modCorps').textContent);
 T('le bandeau ignore le nom personnalisé',
   !/My Pilot Pro/.test(await p.evaluate(()=>document.getElementById('apNom').textContent)));
 T('la ligne Version garde le nom de la copie', /My Pilot Pro v/.test(corps));

 /* 5. rien ne tourne après fermeture */
 await p.evaluate(()=>{fermerModale(); window.__raf=0});
 await p.waitForTimeout(150);
 await p.click('#btnApropos');
 await p.waitForTimeout(120);
 await p.evaluate(()=>{const l=[...document.querySelectorAll('#modPied button')];
   l.find(b=>b.textContent==='Fermer').click()});
 await p.waitForTimeout(1500);
 T('fermer en pleine animation l’arrête',
   (await p.evaluate(()=>!!window.animApropos))===false);

 /* 6. passer au journal l'arrête aussi */
 await p.click('#btnApropos');
 await p.waitForTimeout(120);
 await p.click('[data-act="ap-versions"]');
 await p.waitForTimeout(900);
 const jv=await p.evaluate(()=>({anim:!!window.animApropos,
   titre:document.getElementById('modTitre').textContent,
   bandeau:!!document.querySelector('#modCorps .ap-ban')}));
 T('le journal n’a pas de bandeau', jv.bandeau===false);
 T('et l’animation y est arrêtée', jv.anim===false, jv.titre);

 /* 7. le retour la relance */
 await p.evaluate(()=>{const l=[...document.querySelectorAll('#modPied button')];
   l.find(b=>/À propos/.test(b.textContent)).click()});
 await p.waitForTimeout(150);
 T('le retour relance l’animation',
   (await p.evaluate(()=>document.querySelectorAll('#apNom .bit').length))>0);
 await p.waitForTimeout(1800);
 T('et elle se fige à nouveau sur le nom',
   lisible(await p.evaluate(()=>document.getElementById('apNom').textContent))===DEF);
 await p.evaluate(()=>fermerModale());

 /* 8. ouvertures répétées : une seule minuterie à la fois */
 /* la modale bloque un second clic : on rouvre par le code, comme le ferait un
    enchaînement À propos → journal → retour répété */
 await p.evaluate(()=>{window.__raf=0; for(let i=0;i<4;i++) ouvrirApropos();});
 await p.waitForTimeout(100);
 const multi=await p.evaluate(()=>({minuteries:window.__raf, anim:!!window.animApropos}));
 T('quatre ouvertures ne laissent qu’une animation vivante', multi.anim===true);
 T('et une seule minuterie par ouverture', multi.minuteries===4, ''+multi.minuteries);
 await p.waitForTimeout(1800);
 T('elle se termine proprement',
   lisible(await p.evaluate(()=>document.getElementById('apNom').textContent))===DEF &&
   (await p.evaluate(()=>!!window.animApropos))===false);
 await p.evaluate(()=>fermerModale());

 /* 9. mouvement réduit : le nom s'affiche tout de suite */
 const ctx2=await b.newContext({viewport:{width:1280,height:950},reducedMotion:'reduce'});
 const p2=await ctx2.newPage();
 const errs2=[]; p2.on('pageerror',e=>errs2.push(''+e));
 await p2.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p2.goto(''+APP+'');
 await p2.waitForTimeout(1500);
 await p2.evaluate(()=>{fichierCharge=true; rendre()});
 await p2.click('#btnApropos');
 await p2.waitForTimeout(100);
 const red=await p2.evaluate(()=>({texte:document.getElementById('apNom').textContent,
   bits:document.querySelectorAll('#apNom .bit').length, anim:!!window.animApropos}));
 T('mouvement réduit : le nom est posé d’emblée', lisible(red.texte)===DEF, red.texte);
 T('mouvement réduit : aucune animation', red.bits===0 && red.anim===false);
 T('mouvement réduit : aucune erreur', errs2.length===0, errs2.slice(0,1).join());
 await ctx2.close();

 /* 10. le bandeau tient en fenêtre étroite */
 for(const w of [900,560,390]){
   await p.setViewportSize({width:w,height:900});
   await p.click('#btnApropos');
   await p.waitForTimeout(1900);
   const r=await p.evaluate(()=>{
     const n=document.getElementById('apNom'), c=document.getElementById('modCorps');
     const rn=n.getBoundingClientRect(), rc=c.getBoundingClientRect();
     return {deborde:rn.width>rc.width+1, texte:n.textContent,
       sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth};
   });
   T(w+'px : le nom ne déborde pas', r.deborde===false, r.texte);
   T(w+'px : aucun débordement de page', r.sw<=r.cw, r.sw+'/'+r.cw);
   await p.evaluate(()=>fermerModale());
 }
 await p.setViewportSize({width:1280,height:950});

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));
 console.log('\nRÉUSSIS '+ok.length);
 if(ko.length){ console.log('ÉCHECS  '+ko.length); ko.forEach(x=>console.log('  ✗ '+x)) }
 else console.log('ÉCHECS  0');
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
