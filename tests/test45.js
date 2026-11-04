/* 3.25.0 — le temps de l'activité au cadran de la fenêtre de module :
   décompte, passage à zéro, dépassement en négatif et en rouge. */
const path=require('path'), fs=require('fs'), os=require('os');
const RACINE=path.resolve(__dirname,'..');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

const BAC=fs.mkdtempSync(path.join(os.tmpdir(),'mp-chrono-'));
fs.mkdirSync(path.join(BAC,'module'));
fs.copyFileSync(path.join(RACINE,'MyPilot_Pro.html'), path.join(BAC,'MyPilot_Pro.html'));
fs.writeFileSync(path.join(BAC,'module','jeu.html'),
  '<!doctype html><meta charset="utf-8"><title>Jeu</title><h1>Jeu</h1>');
const APP='file://'+path.join(BAC,'MyPilot_Pro.html');

/* Le temps réel est trop lent pour un banc : on déplace l'horloge, pas le code. */
const HORLOGE=`(()=>{let d=0;const V=Date.now;Date.now=()=>V()+d;
  window.__avancer=ms=>{d+=ms};})()`;

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:900}});
 await ctx.addInitScript(HORLOGE);
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(APP); await p.waitForTimeout(1500);

 /* la couleur se lit dans le thème, elle n'est pas recopiée dans le banc */
 const ROUGE=await p.evaluate(()=>{const d=document.createElement('i');
   d.style.color='var(--rouge)'; document.body.appendChild(d);
   const c=getComputedStyle(d).color; d.remove(); return c});
 /* --- 1. le formatage ---------------------------------------------------- */
 const f=await p.evaluate(()=>({
   zero:mmss(0), s9:mmss(9000), m1:mmss(60000), m12:mmss(12*60000),
   h1:mmss(3600000), h1m2s3:mmss((3600+2*60+3)*1000), negatif:mmss(-90000)}));
 T('00:00', f.zero==='00:00', f.zero);
 T('neuf secondes', f.s9==='00:09', f.s9);
 T('une minute', f.m1==='01:00', f.m1);
 T('douze minutes', f.m12==='12:00', f.m12);
 T('une heure passe en h:mm:ss', f.h1==='1:00:00', f.h1);
 T('  et compose bien', f.h1m2s3==='1:02:03', f.h1m2s3);
 T('le signe est porté par l’affichage, pas par le format', f.negatif==='01:30', f.negatif);

 const poser=(duree)=>p.evaluate(d=>{
   fichierCharge=true; D=vierge(); M=D.carte;
   M.sections.amuse=[{id:'i1',texte:'Jeu',duree:d,favori:false,module:'jeu.html'}];
   vueActive='jour'; rendre();
   ouvrirModule('Jeu','jeu.html',d);
 },duree);
 const lire=()=>p.evaluate(()=>{
   const e=document.getElementById('jeuChrono');
   if(!e) return null;
   return {cache:e.hidden, txt:e.textContent, libelle:(e.querySelector('em')||{}).textContent,
     rouge:e.classList.contains('depasse'),
     couleur:getComputedStyle(e).color, gras:getComputedStyle(e).fontWeight,
     titre:e.title,
     // placé à droite du bandeau, avant les boutons
     avantBoutons:(()=>{const t=document.querySelector('.jeu-tete');
       const n=[...t.children]; return n.indexOf(e)>n.indexOf(t.querySelector('.chemin'))
         && n.indexOf(e)<n.indexOf(t.querySelector('[data-jeu="recharger"]'))})(),
     aDroite:(()=>{const r=e.getBoundingClientRect(),t=document.querySelector('.jeu-tete').getBoundingClientRect();
       return r.left > t.left + t.width/2})()};
 });
 const avancer=(ms)=>p.evaluate(m=>{window.__avancer(m)},ms);

 /* --- 2. le décompte d'une activité de 12 min ---------------------------- */
 await poser(12); await p.waitForTimeout(400);
 let c=await lire();
 T('le cadran est visible', c && c.cache===false);
 T('  il est en haut à droite du bandeau', c.avantBoutons && c.aDroite);
 T('  il part du temps de l’activité', /1(1:5\d|2:00)$/.test(c.txt), c.txt);
 T('  et dit ce qu’il compte', c.libelle==='il reste', c.libelle);
 T('  en noir', c.rouge===false, c.couleur);

 await avancer(5*60000); await p.waitForTimeout(1200);
 c=await lire();
 /* le banc consomme lui-même quelques secondes : on vise la minute, pas la seconde */
 T('après 5 min il reste environ 7 min', /0(6:5\d|7:0\d)$/.test(c.txt), c.txt);
 T('  toujours en noir', c.rouge===false);

 /* --- 3. le passage à zéro ----------------------------------------------- */
 await avancer(7*60000); await p.waitForTimeout(1200);
 c=await lire();
 T('à l’échéance le décompte bascule', c.rouge===true, c.txt);
 T('  le signe négatif apparaît', c.txt.indexOf('−')>=0, c.txt);
 T('  le libellé change', c.libelle==='dépassé de', c.libelle);
 T('  la police passe au rouge', c.couleur===ROUGE, c.couleur+' attendu '+ROUGE);
 T('  et en gras', +c.gras>=700, c.gras);
 T('  l’infobulle le dit', /dépassé/.test(c.titre), c.titre);

 await avancer(3*60000+20000); await p.waitForTimeout(1200);
 c=await lire();
 T('le dépassement s’accumule', /0[23]:\d\d$/.test(c.txt), c.txt);
 T('  et reste rouge', c.rouge===true);

 /* --- 4. sans durée : temps écoulé, jamais rouge -------------------------- */
 await p.evaluate(()=>fermerModule()); await p.waitForTimeout(300);
 await poser(0); await p.waitForTimeout(400);
 c=await lire();
 T('sans durée, le cadran reste utile', c.cache===false && /00:0\d$/.test(c.txt), c.txt);
 T('  il compte le temps écoulé', c.libelle==='écoulé', c.libelle);
 await avancer(20*60000); await p.waitForTimeout(1200);
 c=await lire();
 T('  il monte', /^écoulé20:\d\d$/.test(c.txt.replace(/\s/g,'')), c.txt);
 T('  et ne vire jamais au rouge', c.rouge===false);

 /* --- 5. le minuteur s'arrête avec la fenêtre ----------------------------- */
 await p.evaluate(()=>fermerModule()); await p.waitForTimeout(400);
 T('fermer arrête le minuteur', await p.evaluate(()=>window.jeuChrono===null));
 const fige=await p.evaluate(()=>document.getElementById('jeuChrono').textContent);
 await avancer(5*60000); await p.waitForTimeout(1400);
 T('  rien ne tourne en fond',
   await p.evaluate(()=>document.getElementById('jeuChrono').textContent)===fige);

 /* --- 6. relancer repart de zéro ------------------------------------------ */
 await poser(12); await p.waitForTimeout(400);
 c=await lire();
 T('relancer repart du temps plein', /1(1:5\d|2:00)$/.test(c.txt), c.txt);
 T('  et en noir', c.rouge===false);
 T('un seul minuteur tourne à la fois',
   await p.evaluate(()=>{const a=window.jeuChrono; demarrerChrono(5); return a!==window.jeuChrono}));

 /* --- 7. depuis le rappel de pause, la durée suit ------------------------- */
 await p.evaluate(()=>fermerModule()); await p.waitForTimeout(300);
 await p.evaluate(()=>{
   M.sections.amuse=[{id:'i1',texte:'Jeu',duree:25,favori:false,module:'jeu.html'}];
   suggestion={cle:'amuse',motif:'essai',item:M.sections.amuse[0],limite:null};
   fenetrePause(true);
 }); await p.waitForTimeout(350);
 await p.click('[data-act="pause-reveler"]'); await p.waitForTimeout(250);
 await p.click('[data-act="pause-jouer"]'); await p.waitForTimeout(900);
 c=await lire();
 T('lancé depuis le rappel, le cadran prend la durée de l’activité', /2(4:5\d|5:00)$/.test(c.txt), c.txt);

 /* --- 8. mise en page ------------------------------------------------------ */
 for(const [w,hh] of [[1280,900],[760,900],[390,844]]){
   await p.setViewportSize({width:w,height:hh}); await p.waitForTimeout(350);
   const m=await p.evaluate(()=>{
     const t=document.querySelector('.jeu-tete'),e=document.getElementById('jeuChrono');
     const rt=t.getBoundingClientRect(),re=e.getBoundingClientRect();
     return {deb:t.scrollWidth>t.clientWidth+1,
       dedans:re.left>=rt.left-1 && re.right<=rt.right+1,
       coupe:e.scrollWidth>e.clientWidth+1};
   });
   T(`${w}px : le bandeau ne déborde pas`, !m.deb);
   T(`${w}px : le cadran reste dans le bandeau`, m.dedans);
   T(`${w}px : le cadran n’est pas tronqué`, !m.coupe);
   await p.screenshot({path:'/tmp/chrono_'+w+'.png'});
 }

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 fs.rmSync(BAC,{recursive:true,force:true});
 process.exit(ko.length?1:0);
})();
