const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
/* 3.19.0 — fenêtre À propos et journal des versions déplacé */
const {chromium}=require('playwright'); const fs=require('fs');
const ok=[],ko=[];
const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+'');
 await p.waitForTimeout(1500);
 const V=await p.evaluate(()=>APP_VERSION);

 /* 1. le bouton est dans l'en-tête, avant Aide, et visible */
 const bt=await p.evaluate(()=>{
   const e=document.getElementById('btnApropos');
   if(!e) return null;
   const a=document.getElementById('btnAide'), pa=document.getElementById('btnPause');
   const r=e.getBoundingClientRect(), cs=getComputedStyle(e);
   const fond=getComputedStyle(document.querySelector('.bandeau')).backgroundColor;
   const lg=e.querySelector('.ap-long'), ct=e.querySelector('.ap-court');
   return {texte:(getComputedStyle(lg).display!=='none'?lg.textContent:ct.textContent),
     court:ct?ct.textContent:'', x:Math.round(r.x), largeur:Math.round(r.width),
     visible:r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none',
     couleur:cs.color, fond:fond,
     avantAide:!!(e.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING),
     avantPause:!!(e.compareDocumentPosition(pa)&Node.DOCUMENT_POSITION_FOLLOWING),
     margeAuto:cs.marginLeft};
 });
 T('le bouton À propos existe', !!bt, 'absent');
 T('il s’appelle « À propos »', bt && bt.texte==='À propos', bt&&bt.texte);
 T('un libellé court existe pour les fenêtres étroites', bt && bt.court==='Infos', bt&&bt.court);
 T('il précède Aide et Pause', bt && bt.avantAide && bt.avantPause);
 T('il est visible et a une taille', bt && bt.visible===true && bt.largeur>40, bt&&''+bt.largeur);
 /* le piège de la 3.15.0 : un bouton de la couleur du fond */
 const lis=(c)=>{const m=/rgba?\((\d+), (\d+), (\d+)/.exec(c); if(!m) return null;
   const f=[+m[1],+m[2],+m[3]].map(v=>{v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
   return .2126*f[0]+.7152*f[1]+.0722*f[2]};
 const Lt=lis(bt.couleur), Lf=lis(bt.fond);
 const contraste=(Math.max(Lt,Lf)+.05)/(Math.min(Lt,Lf)+.05);
 T('il se détache du bandeau', contraste>4, 'contraste '+contraste.toFixed(1));

 /* 2. il est accessible avant même d'avoir lié un fichier */
 const avantFichier=await p.evaluate(()=>{
   const e=document.getElementById('btnApropos');
   return {charge:fichierCharge, affiche:getComputedStyle(e).display!=='none', actif:!e.disabled};
 });
 T('accessible sans fichier lié',
   avantFichier.charge===false && avantFichier.affiche && avantFichier.actif,
   JSON.stringify(avantFichier));

 /* 3. la fenêtre s'ouvre et dit l'essentiel */
 await p.click('#btnApropos');
 await p.waitForTimeout(350);
 const A=await p.evaluate(()=>AUTEUR);
 const N=await p.evaluate(()=>NOM_DEFAUT);
 const ap=await p.evaluate(()=>({
   ouverte:document.getElementById('modale').open,
   titre:document.getElementById('modTitre').textContent,
   texte:document.getElementById('modCorps').textContent,
   boutons:[...document.querySelectorAll('#modPied button')].map(b=>b.textContent)}));
 T('la fenêtre s’ouvre', ap.ouverte===true);
 T('elle s’intitule « À propos »', ap.titre==='À propos', ap.titre);
 for(const [q,v] of [
   ['le nom et la version',new RegExp(N.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' v'+V.replace(/\./g,'\\.'))],
   ['l’auteur',new RegExp('Auteur\\s*'+A)],
   /* 3.39.0 : passage sous GNU GPL v3 ou ultérieure. Le pied ne se contente plus de
      nommer la licence, il porte l'avis court recommandé par la FSF — c'est lui qui
      dit à l'utilisatrice ce qu'elle a le droit de faire. */
   ['la licence',/Licence\s*GNU GPL v3 ou ultérieure/],
   ['la mention de copyright',new RegExp('© 2026 '+A+'\\.')],
   ['le logiciel est annoncé libre',/logiciel libre/i],
   ['l’absence de garantie',/sans aucune garantie/i],
   ['la réciprocité du partage',/en faire autant pour vos versions/],
   ['où trouver le texte complet',/LICENSE/],
   ['le fonctionnement hors ligne',/hors ligne/],
   ['l’absence de service tiers',/aucun service tiers/],
   ['le lien vers le journal',/Journal des versions/]
 ]) T('À propos : '+q, v.test(ap.texte), '');
 /* Le plafond passe de 900 à 1000 : la 3.39.0 y ajoute l'avis de licence, qui n'est
    pas du remplissage. « Brève » doit vouloir dire « sans bavardage », pas « sans
    licence ». Le texte a par ailleurs été resserré pour ne pas tout consommer. */
 T('la fenêtre reste brève', ap.texte.length<1000, ap.texte.length+' caractères');
 T('un seul bouton : Fermer', ap.boutons.length===1 && ap.boutons[0]==='Fermer', ap.boutons.join('|'));

 /* 4. le journal des versions */
 const nb=await p.evaluate(()=>JOURNAL_VERSIONS.length);
 T('le journal compte toutes les versions', nb>60, ''+nb);
 const compte=await p.evaluate(()=>
   document.querySelector('#modCorps .note-aide').textContent);
 T('le nombre de versions est annoncé', new RegExp(nb+' versions').test(compte), compte);
 await p.click('[data-act="ap-versions"]');
 await p.waitForTimeout(350);
 const jv=await p.evaluate(()=>({
   titre:document.getElementById('modTitre').textContent,
   lignes:document.querySelectorAll('#modCorps .diag > div').length,
   texte:document.getElementById('modCorps').textContent,
   boutons:[...document.querySelectorAll('#modPied button')].map(b=>b.textContent),
   defile:document.getElementById('modCorps').scrollHeight>document.getElementById('modCorps').clientHeight}));
 T('le journal s’ouvre', jv.titre==='Journal des versions', jv.titre);
 T('il liste toutes les versions', jv.lignes===nb, jv.lignes+' / '+nb);
 T('il défile au lieu de déborder', jv.defile===true);
 T('la version du jour y est', new RegExp('v'+V.replace(/\./g,'\\.')).test(jv.texte), V);
 T('la plus ancienne aussi', /v1\.0\.0/.test(jv.texte));
 T('les versions récentes y sont',
   /v3\.18\.0/.test(jv.texte)&&/v3\.17\.0/.test(jv.texte)&&/v3\.16\.0/.test(jv.texte));
 T('l’ordre va du récent à l’ancien',
   jv.texte.indexOf('v'+V)<jv.texte.indexOf('v3.16.0') &&
   jv.texte.indexOf('v3.16.0')<jv.texte.indexOf('v1.0.0'));
 T('les nouvelles entrées décrivent bien les livraisons',
   /champ Affaire/.test(jv.texte) && /Compte rendu/.test(jv.texte) && /guillemets courbes/.test(jv.texte));
 T('un retour vers À propos est proposé',
   jv.boutons.some(x=>/À propos/.test(x)), jv.boutons.join('|'));

 /* 5. le retour fonctionne */
 await p.evaluate(()=>{const l=[...document.querySelectorAll('#modPied button')];
   l.find(b=>/À propos/.test(b.textContent)).click()});
 await p.waitForTimeout(300);
 T('le retour ramène à À propos',
   (await p.evaluate(()=>document.getElementById('modTitre').textContent))==='À propos');
 await p.evaluate(()=>fermerModale());

 /* 6. le journal a quitté la vue Données */
 await p.evaluate(()=>{fichierCharge=true; vueActive='donnees'; rendre()});
 await p.waitForTimeout(400);
 const don=await p.evaluate(()=>{
   const t=document.getElementById('vue').textContent;
   return {journal:/Journal des versions/.test(t),
     entrees:(t.match(/v1\.0\.0/g)||[]).length,
     diagnostic:/Diagnostic du poste|Version de l'application/.test(t)};
 });
 T('le journal a quitté la vue Données', don.journal===false);
 T('plus aucune entrée de version n’y traîne', don.entrees===0, ''+don.entrees);
 T('le diagnostic du poste y reste', don.diagnostic===true);

 /* 7. Échap ferme, et la fenêtre s'ouvre par-dessus une vue quelconque */
 await p.evaluate(()=>{vueActive='jour'; rendre()});
 await p.waitForTimeout(250);
 await p.click('#btnApropos');
 await p.waitForTimeout(300);
 await p.keyboard.press('Escape');
 await p.waitForTimeout(250);
 T('Échap ferme la fenêtre',
   (await p.evaluate(()=>document.getElementById('modale').open))===false);

 /* 8. la fenêtre suit le nom personnalisé de l'application */
 await p.evaluate(()=>{D.parametres.nom_app='Pilotage PST'; rendre()});
 await p.click('#btnApropos');
 await p.waitForTimeout(300);
 T('elle reprend le nom personnalisé',
   new RegExp('Pilotage PST v'+V.replace(/\./g,'\\.'))
     .test(await p.evaluate(()=>document.getElementById('modCorps').textContent)));
 await p.evaluate(()=>{fermerModale(); D.parametres.nom_app=NOM_DEFAUT; rendre()});

 /* 9. l'aide en parle */
 await p.evaluate(()=>window.ouvrirAide('raccourcis'));
 await p.waitForTimeout(350);
 const aide=await p.evaluate(()=>document.getElementById('paCorps').textContent);
 T('l’aide décrit le bouton À propos', /Version et licence/.test(aide) && /journal des versions/i.test(aide));
 await p.evaluate(()=>window.fermerAide());

 /* 10. le bandeau tient toujours */
 for(const w of [1280,1050,860,640,390]){
   await p.setViewportSize({width:w,height:900});
   await p.waitForTimeout(250);
   const r=await p.evaluate(()=>{
     const g=i=>{const e=document.getElementById(i); if(!e) return null;
       const b=e.getBoundingClientRect();
       return {x:Math.round(b.x),r:Math.round(b.right),v:b.width>0&&getComputedStyle(e).display!=='none'}};
     return {ap:g('btnApropos'),ai:g('btnAide'),pa:g('btnPause'),
       sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth};
   });
   const groupes = r.ap && r.ai && r.ap.r<=r.ai.x+2 && (!r.pa.v || r.ai.r<=r.pa.x+2);
   T(w+'px : pas de débordement horizontal', r.sw<=r.cw, r.sw+'/'+r.cw);
   T(w+'px : les trois boutons restent groupés', groupes,
     JSON.stringify({ap:r.ap&&r.ap.x,ai:r.ai&&r.ai.x,pa:r.pa&&r.pa.x}));
 }
 /* 11. le libellé bascule, et le groupe ne se scinde jamais */
 for(const [w,attendu] of [[1280,'À propos'],[900,'À propos'],[700,'Infos'],[500,'Infos']]){
   await p.setViewportSize({width:w,height:900});
   await p.evaluate(()=>{fichierCharge=true; poignee={}; D.parametres.auto=true;
     dernierEnr='à 13:09'; sale=false; majEtat(); rendre()});
   await p.waitForTimeout(250);
   const v=await p.evaluate(()=>{
     const e=document.getElementById('btnApropos');
     const lg=e.querySelector('.ap-long');
     const g=i=>{const x=document.getElementById(i).getBoundingClientRect();
       return {x:Math.round(x.x),y:Math.round(x.y)}};
     return {libelle:getComputedStyle(lg).display!=='none'?'À propos':'Infos',
       ap:g('btnApropos'),ai:g('btnAide'),pa:g('btnPause'),
       sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth};
   });
   T(w+'px : le libellé est « '+attendu+' »', v.libelle===attendu, v.libelle);
   T(w+'px : les trois boutons sur la même ligne',
     v.ap.y===v.ai.y && v.ai.y===v.pa.y, JSON.stringify([v.ap.y,v.ai.y,v.pa.y]));
   T(w+'px : aucun débordement', v.sw<=v.cw, v.sw+'/'+v.cw);
 }
 await p.setViewportSize({width:1280,height:1000});

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));
 console.log('\nRÉUSSIS '+ok.length);
 if(ko.length){ console.log('ÉCHECS  '+ko.length); ko.forEach(x=>console.log('  ✗ '+x)) }
 else console.log('ÉCHECS  0');
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
