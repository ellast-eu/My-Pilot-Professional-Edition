/* 3.24.0 — modules de pause : un .html rangé à côté de l'application, joué dedans.
   Le banc se monte son propre dossier : app + module/, comme sur le poste. */
const path=require('path'), fs=require('fs'), os=require('os');
const RACINE=path.resolve(__dirname,'..');
const SRC=path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

const BAC=fs.mkdtempSync(path.join(os.tmpdir(),'mp-mod-'));
fs.mkdirSync(path.join(BAC,'module'));
fs.copyFileSync(SRC, path.join(BAC,'MyPilot_Pro.html'));
/* un module qui a ses propres ressources : c'est ce que sandbox casserait */
fs.writeFileSync(path.join(BAC,'module','style.css'),'body{background:#0b7}');
fs.writeFileSync(path.join(BAC,'module','jeu.js'),'window.MODULE_JS=true');
fs.writeFileSync(path.join(BAC,'module','jeu.html'),
`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Jeu d'essai</title>
<link rel="stylesheet" href="style.css"><script src="jeu.js"><\/script></head>
<body><h1 id="h">Module en marche</h1>
<script>
try{localStorage.setItem('mod','1');document.title='stockage ok'}catch(e){document.title='stockage '+e.name}
try{parent.postMessage({de:'module'},'*')}catch(e){}
try{window.VU_PARENT = !!parent.document}catch(e){window.VU_PARENT=false}
<\/script></body></html>`);
fs.writeFileSync(path.join(BAC,'module','revision.html'),
 '<!doctype html><meta charset="utf-8"><title>Révision</title><h1>Révision</h1>');
fs.writeFileSync(path.join(BAC,'module','parle.html'),
`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Parle</title></head>
<body><button id="fin">Terminer</button>
<script>
try{parent.postMessage({mypilot:'pret'},'*')}catch(e){}
document.getElementById('fin').onclick=function(){
  try{parent.postMessage({mypilot:'fermer'},'*')}catch(e){}};
document.getElementById('intrus')||setTimeout(function(){
  try{parent.postMessage({mypilot:'voler', D:'donne'},'*')}catch(e){}},200);
<\/script></body></html>`);
fs.writeFileSync(path.join(BAC,'module','notes.txt'),'pas un module');
const APP='file://'+path.join(BAC,'MyPilot_Pro.html');

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:900}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(APP); await p.waitForTimeout(1500);

 /* --- 1. la validation des chemins ------------------------------------- */
 const v=await p.evaluate(()=>({
   bon:cheminModuleSain('jeu.html'),
   sousDossier:cheminModuleSain('revision/quiz.html'),
   htm:cheminModuleSain('vieux.htm'),
   remonte:cheminModuleSain('../../etc/passwd.html'),
   remonte2:cheminModuleSain('a/../../b.html'),
   absolu:cheminModuleSain('/etc/truc.html'),
   antislash:cheminModuleSain('sous\\jeu.html'),
   pasPage:cheminModuleSain('jeu.js'),
   txt:cheminModuleSain('notes.txt'),
   vide:cheminModuleSain(''),
   dossier:nomDossierModule('  /module/  '),
   dossierRemonte:nomDossierModule('../secret'),
   dossierVide:nomDossierModule('')
 }));
 T('un .html simple passe', v.bon==='jeu.html', v.bon);
 T('un sous-dossier passe', v.sousDossier==='revision/quiz.html', v.sousDossier);
 T('.htm aussi', v.htm==='vieux.htm', v.htm);
 T('remonter d’un dossier est refusé', v.remonte==='', JSON.stringify(v.remonte));
 T('  y compris au milieu du chemin', v.remonte2==='', JSON.stringify(v.remonte2));
 T('un chemin absolu est ramené au dossier', v.absolu==='etc/truc.html', v.absolu);
 T('les antislashs sont normalisés', v.antislash==='sous/jeu.html', v.antislash);
 T('un .js n’est pas un module', v.pasPage==='', JSON.stringify(v.pasPage));
 T('un .txt non plus', v.txt==='', JSON.stringify(v.txt));
 T('vide reste vide', v.vide==='');
 T('le dossier est nettoyé', v.dossier==='module', v.dossier);
 T('un dossier qui remonte retombe sur « module »', v.dossierRemonte==='module', v.dossierRemonte);
 T('un dossier vide retombe sur « module »', v.dossierVide==='module', v.dossierVide);

 /* --- 2. la carte porte le module -------------------------------------- */
 await p.evaluate(()=>{
   fichierCharge=true; D=vierge(); M=D.carte;
   M.sections.amuse=[{id:'i1',texte:'Jeu d’essai',duree:10,favori:false,module:'jeu.html'},
                     {id:'i2',texte:'Sortir prendre l’air',duree:10,favori:false,module:''}];
   vueActive='jour'; rendre(); ouvrirPause();
 });
 await p.waitForTimeout(400);
 const c=await p.evaluate(()=>{
   const co=document.getElementById('modCorps');
   return {badge:co.querySelectorAll('.item .mod').length,
     jouer:co.querySelectorAll('[data-jouer]').length,
     lier:co.querySelectorAll('[data-lier]').length,
     parcourir:co.querySelectorAll('[data-parcourir]').length,
     titre:(co.querySelector('.item .mod')||{}).title};
 });
 T('seul l’élément avec module porte le badge', c.badge===1, ''+c.badge);
 T('  et seul lui offre « lancer »', c.jouer===1, ''+c.jouer);
 T('chaque ligne peut associer un fichier', c.lier===2, ''+c.lier);
 T('chaque section propose de parcourir un dossier', c.parcourir===5, ''+c.parcourir);
 T('le badge montre le chemin résolu', c.titre==='module/jeu.html', c.titre);

 /* --- 3. le module se lance et fonctionne ------------------------------- */
 await p.click('[data-jouer="i1"]'); await p.waitForTimeout(1200);
 const f=await p.evaluate(()=>{
   const d=document.getElementById('jeuBoite');
   return d?{ouverte:d.open, titre:document.getElementById('jeuTitre').textContent,
     chemin:document.getElementById('jeuChemin').textContent,
     src:document.getElementById('jeuCadre').getAttribute('src')}:null;
 });
 T('la fenêtre de module s’ouvre', f && f.ouverte===true);
 T('  elle porte le nom de l’activité', f.titre==='Jeu d’essai', f.titre);
 T('  et affiche le chemin résolu', f.chemin==='module/jeu.html', f.chemin);
 T('  l’iframe pointe sur le bon fichier', f.src==='module/jeu.html', f.src);

 const cadre=await (await p.$('#jeuCadre')).contentFrame();
 T('le document du module est chargé', !!cadre);
 const dans=await cadre.evaluate(()=>({
   h1:(document.getElementById('h')||{}).textContent,
   titre:document.title,
   css:getComputedStyle(document.body).backgroundColor,
   js:typeof window.MODULE_JS,
   parent:window.VU_PARENT}));
 T('  son HTML s’affiche', dans.h1==='Module en marche', dans.h1);
 T('  son CSS propre est appliqué', dans.css==='rgb(0, 187, 119)', dans.css);
 T('  son JS propre est exécuté', dans.js==='boolean', dans.js);
 T('  son stockage fonctionne', dans.titre==='stockage ok', dans.titre);
 T('le module ne peut pas lire le pilotage', dans.parent===false, ''+dans.parent);
 const versModule=await p.evaluate(()=>{
   try{ return !!document.getElementById('jeuCadre').contentDocument }catch(e){ return 'bloqué' }});
 T('le pilotage ne peut pas entrer dans le module', versModule===false||versModule==='bloqué', ''+versModule);
 await p.screenshot({path:'/tmp/module_ouvert.png'});

 /* --- 4. fermer arrête le module ---------------------------------------- */
 await p.click('[data-jeu="fermer"]'); await p.waitForTimeout(400);
 const ap=await p.evaluate(()=>({ouverte:document.getElementById('jeuBoite').open,
   src:document.getElementById('jeuCadre').getAttribute('src')}));
 T('la fenêtre se ferme', ap.ouverte===false);
 T('  et le module est arrêté, pas laissé en fond', ap.src==='about:blank', ap.src);

 /* --- 5. un chemin invalide ne lance rien -------------------------------- */
 await p.evaluate(()=>{ M.sections.amuse[0].module='../../dehors.html'; ouvrirPause() });
 await p.waitForTimeout(300);
 const inv=await p.evaluate(()=>{
   ouvrirModule('X','../../dehors.html');
   return document.getElementById('jeuBoite').open;
 });
 T('un chemin qui remonte ne lance rien', inv===false, ''+inv);

 /* --- 6. depuis le rappel de pause -------------------------------------- */
 await p.evaluate(()=>{
   try{document.getElementById('modale').close()}catch(e){}
   M.sections.amuse=[{id:'i1',texte:'Jeu d’essai',duree:10,favori:false,module:'jeu.html'}];
   suggestion={cle:'amuse',motif:'essai',item:M.sections.amuse[0],limite:null};
   fenetrePause(true);
 }); await p.waitForTimeout(400);
 T('le rappel montre « Révéler »',
   await p.evaluate(()=>!!document.querySelector('[data-act="pause-reveler"]')));
 await p.click('[data-act="pause-reveler"]'); await p.waitForTimeout(300);
 T('révéler propose « Lancer » quand l’activité porte un module',
   await p.evaluate(()=>!!document.querySelector('[data-act="pause-jouer"]')));
 await p.click('[data-act="pause-jouer"]'); await p.waitForTimeout(1000);
 T('  et le module s’ouvre',
   await p.evaluate(()=>document.getElementById('jeuBoite').open===true));

 /* --- 6 bis. le module peut parler à l'application -------------------- */
 await p.evaluate(()=>{ fermerModule(); ouvrirModule('Parle','parle.html',5) });
 await p.waitForTimeout(1200);
 T('« pret » retire le message d’absence',
   await p.evaluate(()=>document.getElementById('jeuVide').innerHTML===''));
 T('  un message inconnu ne fait rien',
   await p.evaluate(()=>document.getElementById('jeuBoite').open===true));
 const cad=await (await p.$('#jeuCadre')).contentFrame();
 await cad.click('#fin'); await p.waitForTimeout(600);
 T('« fermer » rend la main',
   await p.evaluate(()=>document.getElementById('jeuBoite').open===false));
 T('  et le module est arrêté',
   await p.evaluate(()=>document.getElementById('jeuCadre').getAttribute('src'))==='about:blank');
 /* un message émis alors que rien n'est ouvert ne doit rien déclencher */
 T('un message hors fenêtre est ignoré',
   await p.evaluate(()=>{ dispatchEvent(new MessageEvent('message',{data:{mypilot:'fermer'}}));
     return document.getElementById('jeuBoite').open===false }));
 await p.evaluate(()=>ouvrirModule('Jeu','jeu.html',5)); await p.waitForTimeout(900);
 T('un message d’une autre source est ignoré',
   await p.evaluate(()=>{ dispatchEvent(new MessageEvent('message',{data:{mypilot:'fermer'},source:window}));
     return document.getElementById('jeuBoite').open===true }));

 /* --- 7. mise en page de la fenêtre ------------------------------------- */
 for(const [w,hh] of [[1280,900],[1024,1366],[390,844]]){
   await p.setViewportSize({width:w,height:hh}); await p.waitForTimeout(400);
   const m=await p.evaluate(()=>{
     const d=document.getElementById('jeuBoite'),r=d.getBoundingClientRect();
     const c=document.getElementById('jeuCadre').getBoundingClientRect();
     return {hors:r.right>innerWidth+1||r.bottom>innerHeight+1||r.left<-1||r.top<-1,
       cadreH:Math.round(c.height),cadreL:Math.round(c.width),
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : la fenêtre tient dans l’écran`, !m.hors);
   T(`${w}px : le module a de la place`, m.cadreH>hh*0.6 && m.cadreL>w*0.8,
     m.cadreL+'×'+m.cadreH);
   T(`${w}px : pas de défilement latéral`, !m.page);
 }
 await p.setViewportSize({width:1280,height:900});
 await p.evaluate(()=>fermerModule()); await p.waitForTimeout(300);

 /* --- 8. le réglage survit à l'enregistrement --------------------------- */
 const aller=await p.evaluate(()=>{
   M.reglages.dossier_modules='mes-jeux';
   M.sections.amuse=[{id:'i1',texte:'Jeu',duree:5,favori:false,module:'jeu.html'}];
   const copie=JSON.parse(JSON.stringify(D));
   D=normaliser(copie); M=D.carte;
   return {dossier:M.reglages.dossier_modules, module:M.sections.amuse[0].module,
     url:urlModule(M.sections.amuse[0].module)};
 });
 T('le dossier choisi survit au rechargement', aller.dossier==='mes-jeux', aller.dossier);
 T('  le module aussi', aller.module==='jeu.html', aller.module);
 T('  et le chemin se recompose', aller.url==='mes-jeux/jeu.html', aller.url);

 /* --- 9. l'aide ---------------------------------------------------------- */
 T('l’aide décrit les modules',
   await p.evaluate(()=>AIDE.some(r=>/Les modules/.test(r.html) && /sans réseau/.test(r.html))));

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 fs.rmSync(BAC,{recursive:true,force:true});
 process.exit(ko.length?1:0);
})();
