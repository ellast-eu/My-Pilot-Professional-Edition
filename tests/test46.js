/* 3.26.0 — chaque section dit quand elle est proposée ; les accompagnements ont
   leur bouton ; un élément peut porter un lien. */
const path=require('path'), fs=require('fs'), os=require('os');
const RACINE=path.resolve(__dirname,'..');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

const BAC=fs.mkdtempSync(path.join(os.tmpdir(),'mp-sec-'));
fs.mkdirSync(path.join(BAC,'module'));
fs.copyFileSync(path.join(RACINE,'MyPilot_Pro.html'), path.join(BAC,'MyPilot_Pro.html'));
fs.writeFileSync(path.join(BAC,'module','jeu.html'),
  '<!doctype html><meta charset="utf-8"><title>Jeu</title><h1>Jeu</h1>');
const APP='file://'+path.join(BAC,'MyPilot_Pro.html');

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:950}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(APP); await p.waitForTimeout(1500);

 /* --- 1. validation des liens -------------------------------------------- */
 const L=await p.evaluate(()=>({
   https:lienSain('https://open.spotify.com/playlist/37i9'),
   http:lienSain('http://intranet/revision'),
   appli:lienSain('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'),
   fichier:lienSain('file:///D:/audio/focus.m3u'),
   espaces:lienSain('   https://exemple.fr/a   '),
   js:lienSain('javascript:alert(1)'),
   jsCasse:lienSain('JaVaScRiPt:alert(1)'),
   data:lienSain('data:text/html,<script>x<\/script>'),
   blob:lienSain('blob:https://x/y'),
   sansProto:lienSain('open.spotify.com/playlist'),
   controle:lienSain('https://x\u0000y'),
   vide:lienSain('')}));
 T('une URL https passe', L.https==='https://open.spotify.com/playlist/37i9');
 T('http aussi', !!L.http);
 T('un schéma applicatif passe', L.appli==='spotify:playlist:37i9dQZF1DXcBWIGoYBM5M', L.appli);
 T('un fichier local passe', !!L.fichier, L.fichier);
 T('les espaces sont rognés', L.espaces==='https://exemple.fr/a', JSON.stringify(L.espaces));
 T('javascript: est refusé', L.js==='', JSON.stringify(L.js));
 T('  quelle que soit la casse', L.jsCasse==='', JSON.stringify(L.jsCasse));
 T('data: est refusé', L.data==='', JSON.stringify(L.data));
 T('blob: est refusé', L.blob==='', JSON.stringify(L.blob));
 T('un lien sans protocole est refusé', L.sansProto==='', JSON.stringify(L.sansProto));
 T('un caractère de contrôle fait refuser', L.controle==='', JSON.stringify(L.controle));
 T('vide reste vide', L.vide==='');

 /* --- 2. les valeurs par défaut ------------------------------------------- */
 const d0=await p.evaluate(()=>{ D=vierge(); M=D.carte; return M.reglages.quand });
 T('amuse-bouches en pause courte', d0.amuse==='courte', d0.amuse);
 T('accompagnements sur demande', d0.accomp==='demande', d0.accomp);
 T('plats sur demande', d0.plat==='demande', d0.plat);
 T('spécialités sur demande', d0.specialite==='demande', d0.specialite);
 T('desserts sur demande', d0.dessert==='demande', d0.dessert);
 T('le seuil « long » vaut 30 min',
   await p.evaluate(()=>M.reglages.seuil_long)===30);

 /* --- 3. le tirage suit le réglage ---------------------------------------- */
 const garnir=()=>p.evaluate(()=>{
   fichierCharge=true; D=vierge(); M=D.carte;
   const it=(id,t,d)=>({id:id,texte:t,duree:d,favori:false,module:'',lien:''});
   M.sections.amuse=[it('a1','Court',5)];
   M.sections.accomp=[it('c1','Fond',0)];
   M.sections.plat=[it('p1','Long',60)];
   M.reglages.filtrer_duree=true;
   vueActive='jour'; rendre();
 });
 await garnir();
 let r=await p.evaluate(()=>{
   const out={};
   suggestion=null; out.court = proposerPause('x',10) ? suggestion.cle : null;
   suggestion=null; out.long  = proposerPause('x',90) ? suggestion.cle : null;
   suggestion=null; out.sansTemps = proposerPause('x',null) ? suggestion.cle : null;
   return out;
 });
 T('par défaut, seul amuse-bouches est tiré, créneau court', r.court==='amuse', ''+r.court);
 T('  et créneau long aussi', r.long==='amuse', ''+r.long);
 T('  les plats « sur demande » ne sortent jamais', r.sansTemps==='amuse', ''+r.sansTemps);

 r=await p.evaluate(()=>{
   M.reglages.quand.plat='longue';
   const out={};
   suggestion=null; out.court = proposerPause('x',10) ? suggestion.cle : null;
   suggestion=null; out.long  = proposerPause('x',90) ? suggestion.cle : null;
   /* le seuil décide de l'ÉLIGIBILITÉ de la section ; la durée de l'élément décide
      ensuite s'il tient. Les deux filtres se composent : on teste ici le premier. */
   out.pile  = sectionsTirables(30).indexOf('plat')>=0;
   out.juste = sectionsTirables(29).indexOf('plat')>=0;
   return out;
 });
 T('réglé en « pause longue », le plat sort sur un grand créneau', r.long==='plat', ''+r.long);
 T('  pas sur un petit', r.court==='amuse', ''+r.court);
 T('  le seuil rend la section éligible dès 30 min', r.pile===true, ''+r.pile);
 T('  et pas à 29', r.juste===false, ''+r.juste);

 r=await p.evaluate(()=>{
   M.reglages.seuil_long=60;
   suggestion=null; const a = proposerPause('x',45) ? suggestion.cle : null;
   M.reglages.seuil_long=30;
   return a;
 });
 T('le seuil est bien celui du réglage', r==='amuse', ''+r);

 r=await p.evaluate(()=>{
   MENU_SECTIONS.forEach(s=>M.reglages.quand[s[0]]='demande');
   suggestion=null; return proposerPause('x',null);
 });
 T('tout sur demande : plus rien n’est proposé', r===false, ''+r);

 /* un créneau trop court pour ce qui est tiré : on déborde plutôt que de se taire */
 r=await p.evaluate(()=>{
   MENU_SECTIONS.forEach(s=>M.reglages.quand[s[0]]='demande');
   M.reglages.quand.plat='courte';
   suggestion=null;
   return proposerPause('x',5) ? {cle:suggestion.cle,motif:suggestion.motif} : null;
 });
 T('rien ne tient : on propose quand même en le disant',
   r && r.cle==='plat' && /ne tient dans ce créneau/.test(r.motif), JSON.stringify(r));

 /* --- 4. le bouton du bandeau ---------------------------------------------- */
 await garnir(); await p.waitForTimeout(300);
 const h=await p.evaluate(()=>{
   const n=[...document.querySelectorAll('.etat-btns > button')].map(b=>b.id);
   const e=document.getElementById('btnAccomp');
   return {ordre:n.join(','), visible:!!e && e.getBoundingClientRect().width>0,
     long:e.querySelector('.ap-long').textContent, court:e.querySelector('.ap-court').textContent,
     couleur:getComputedStyle(e).color};
 });
 T('le bouton est entre Aide et Pause', h.ordre==='btnApropos,btnAide,btnAccomp,btnPause', h.ordre);
 T('  il est visible', h.visible);
 T('  avec un libellé court en réserve', h.long==='Accompagnement' && h.court==='Fond',
   h.long+'/'+h.court);
 T('  et la teinte des autres boutons du bandeau', h.couleur==='rgb(201, 207, 201)', h.couleur);

 await p.click('#btnAccomp'); await p.waitForTimeout(350);
 let f=await p.evaluate(()=>({titre:document.getElementById('modTitre').textContent,
   corps:document.getElementById('modCorps').textContent,
   lignes:document.querySelectorAll('#modCorps .item').length,
   hasard:!!document.querySelector('[data-acchasard]')}));
 T('la fenêtre s’ouvre', f.titre==='Accompagnement', f.titre);
 T('  elle liste la section', f.lignes===1, ''+f.lignes);
 T('  elle propose le tirage', f.hasard===true);
 T('  et dit que rien ne s’interrompt', /Rien ne s’interrompt/.test(f.corps));

 /* --- 5. module et lien sur un accompagnement ------------------------------ */
 await p.evaluate(()=>{
   M.sections.accomp=[{id:'c1',texte:'Podcast cyber',duree:0,favori:false,module:'',
     lien:'https://exemple.fr/podcast'},
     {id:'c2',texte:'Mise en situation',duree:0,favori:true,module:'jeu.html',lien:''}];
   ouvrirAccompagnements();
 }); await p.waitForTimeout(300);
 f=await p.evaluate(()=>({
   premier:document.querySelector('#modCorps .item .txt').textContent,
   lien:document.querySelectorAll('[data-acclien]').length,
   jouer:document.querySelectorAll('[data-accjouer]').length}));
 T('les favoris passent en tête', f.premier==='Mise en situation', f.premier);
 T('  l’élément à lien offre « Ouvrir »', f.lien===1, ''+f.lien);
 T('  celui à module offre « Lancer »', f.jouer===1, ''+f.jouer);

 const pop=ctx.waitForEvent('page',{timeout:4000}).catch(()=>null);
 await p.click('[data-acclien="c1"]');
 const q=await pop;
 T('cliquer « Ouvrir » passe le lien au système', !!q, q?q.url():'aucune page');
 if(q) await q.close();
 await p.evaluate(()=>{ouvrirAccompagnements()}); await p.waitForTimeout(250);
 await p.click('[data-accjouer="c2"]'); await p.waitForTimeout(900);
 T('cliquer « Lancer » ouvre le module',
   await p.evaluate(()=>document.getElementById('jeuBoite').open===true));
 await p.evaluate(()=>fermerModule()); await p.waitForTimeout(250);

 /* --- 6. le réglage dans la carte ------------------------------------------ */
 await p.evaluate(()=>ouvrirPause()); await p.waitForTimeout(350);
 const c=await p.evaluate(()=>{
   const s=[...document.querySelectorAll('[data-quand]')];
   return {n:s.length, cles:s.map(x=>x.dataset.quand).join(','),
     valeurs:s.map(x=>x.value).join(','),
     options:[...s[0].options].map(o=>o.value).join(','),
     seuil:!!document.getElementById('sugSeuil')};
 });
 T('chaque section porte son réglage', c.n===5, ''+c.n);
 T('  dans l’ordre de la carte', c.cles==='amuse,accomp,plat,specialite,dessert', c.cles);
 T('  trois valeurs possibles', c.options==='courte,longue,demande', c.options);
 T('  le seuil est réglable', c.seuil);
 await p.selectOption('[data-quand="plat"]','longue'); await p.waitForTimeout(350);
 T('changer le réglage l’enregistre',
   await p.evaluate(()=>M.reglages.quand.plat)==='longue');

 /* --- 7. l'alerte suit le réglage ------------------------------------------ */
 let al=await p.evaluate(()=>{
   MENU_SECTIONS.forEach(s=>M.reglages.quand[s[0]]='demande'); ouvrirPause();
   return document.getElementById('modCorps').textContent;
 });
 T('tout sur demande : l’alerte le dit', /plus aucune pause ne vous sera proposée/.test(al));
 al=await p.evaluate(()=>{
   M.reglages.quand.specialite='courte'; M.sections.specialite=[]; ouvrirPause();
   return document.getElementById('modCorps').textContent;
 });
 T('une section tirée mais vide : l’alerte le dit', /sont vides : rien ne se déclenchera/.test(al));
 al=await p.evaluate(()=>{
   M.reglages.quand.specialite='demande'; M.reglages.quand.amuse='courte'; ouvrirPause();
   return document.getElementById('modCorps').textContent;
 });
 T('tout va bien : pas d’alerte',
   !/plus aucune pause|rien ne se déclenchera/.test(al));

 /* --- 8. tout survit au rechargement --------------------------------------- */
 const apres=await p.evaluate(()=>{
   M.reglages.quand.plat='longue'; M.reglages.seuil_long=45;
   M.sections.accomp=[{id:'c1',texte:'Podcast',duree:0,favori:false,module:'jeu.html',
     lien:'spotify:playlist:1'}];
   D=normaliser(JSON.parse(JSON.stringify(D))); M=D.carte;
   return {quand:M.reglages.quand.plat, seuil:M.reglages.seuil_long,
     module:M.sections.accomp[0].module, lien:M.sections.accomp[0].lien};
 });
 T('le réglage de section survit', apres.quand==='longue', apres.quand);
 T('  le seuil aussi', apres.seuil===45, ''+apres.seuil);
 T('  le module aussi', apres.module==='jeu.html', apres.module);
 T('  et le lien', apres.lien==='spotify:playlist:1', apres.lien);
 const sale=await p.evaluate(()=>{
   D.carte.sections.accomp=[{id:'x',texte:'Piège',lien:'javascript:alert(1)',module:'../a.html'}];
   D.carte.reglages.quand={amuse:'nimporte quoi'};
   D=normaliser(JSON.parse(JSON.stringify(D))); M=D.carte;
   return {lien:M.sections.accomp[0].lien, module:M.sections.accomp[0].module,
     quand:M.reglages.quand.amuse};
 });
 T('un fichier trafiqué ne fait pas passer javascript:', sale.lien==='', JSON.stringify(sale.lien));
 T('  ni un module qui remonte', sale.module==='', JSON.stringify(sale.module));
 T('  ni un réglage inconnu', sale.quand==='courte', sale.quand);

 /* --- 8 bis. la roue dentée ouvre tout l'élément ------------------------- */
 await p.evaluate(()=>{
   fichierCharge=true; D=vierge(); M=D.carte;
   M.sections.amuse=[{id:'i1',texte:'jeu-3d',duree:0,favori:false,module:'',lien:''}];
   vueActive='jour'; rendre(); ouvrirPause();
 }); await p.waitForTimeout(350);
 await p.click('[data-lier="i1"]'); await p.waitForTimeout(350);
 const ch=await p.evaluate(()=>{
   const d=document.querySelector('dialog.saisie-val');
   return d?{titre:d.querySelector('h3').textContent,
     champs:[...d.querySelectorAll('input')].map(i=>i.id).join(','),
     nom:d.querySelector('#raNom').value}:null;
 });
 T('la roue ouvre une fenêtre de modification', !!ch && /Modifier/.test(ch.titre), ch&&ch.titre);
 T('  avec nom, durée, module et lien', ch.champs==='raNom,raDur,raMod,raLien', ch.champs);
 T('  le nom est pré-rempli', ch.nom==='jeu-3d', ch.nom);
 /* un nom vide effacerait l'élément de la carte : on doit le refuser */
 await p.fill('#raNom','   ');
 await p.click('dialog.saisie-val [data-s="oui"]'); await p.waitForTimeout(300);
 T('un nom vide est refusé',
   await p.evaluate(()=>!!document.querySelector('dialog.saisie-val')));
 await p.fill('#raNom','Mise en situation sécurité');
 await p.fill('#raDur','15');
 await p.fill('#raMod','jeu.html');
 await p.fill('#raLien','https://exemple.fr/aide');
 await p.click('dialog.saisie-val [data-s="oui"]'); await p.waitForTimeout(400);
 const ap2=await p.evaluate(()=>{
   const i=M.sections.amuse[0];
   return {t:i.texte,d:i.duree,m:i.module,l:i.lien,
     ferme:!document.querySelector('dialog.saisie-val'),
     affiche:document.getElementById('modCorps').textContent};
 });
 T('le nom est enregistré', ap2.t==='Mise en situation sécurité', ap2.t);
 T('  la durée aussi', ap2.d===15, ''+ap2.d);
 T('  le module aussi', ap2.m==='jeu.html', ap2.m);
 T('  et le lien', ap2.l==='https://exemple.fr/aide', ap2.l);
 T('  la fenêtre se referme', ap2.ferme);
 T('  la carte se redessine avec le nouveau nom', /Mise en situation sécurité/.test(ap2.affiche));
 /* annuler ne doit rien changer */
 await p.click('[data-lier="i1"]'); await p.waitForTimeout(300);
 await p.fill('#raNom','Autre chose');
 await p.click('dialog.saisie-val [data-s="non"]'); await p.waitForTimeout(300);
 T('annuler ne change rien', await p.evaluate(()=>M.sections.amuse[0].texte)==='Mise en situation sécurité');
 /* un module invalide est refusé sans perdre la saisie */
 await p.click('[data-lier="i1"]'); await p.waitForTimeout(300);
 await p.fill('#raMod','../dehors.html');
 await p.click('dialog.saisie-val [data-s="oui"]'); await p.waitForTimeout(300);
 T('un module qui remonte est refusé',
   await p.evaluate(()=>!!document.querySelector('dialog.saisie-val')));
 T('  et la saisie est conservée',
   await p.evaluate(()=>document.getElementById('raNom').value)==='Mise en situation sécurité');
 await p.click('dialog.saisie-val [data-s="non"]'); await p.waitForTimeout(250);

 /* --- 9. mise en page ------------------------------------------------------- */
 for(const [w,hh] of [[1280,950],[760,900],[390,844]]){
   await p.setViewportSize({width:w,height:hh}); await p.waitForTimeout(400);
   const m=await p.evaluate(()=>{
     const e=document.getElementById('btnAccomp'),r=e.getBoundingClientRect();
     const t=document.querySelector('.etat-btns').getBoundingClientRect();
     const lg=getComputedStyle(e.querySelector('.ap-long')).display;
     return {dedans:r.left>=t.left-1 && r.right<=t.right+1, visible:r.width>0,
       page:document.documentElement.scrollWidth>innerWidth+1, lg:lg};
   });
   T(`${w}px : le bouton reste dans le groupe`, m.dedans && m.visible);
   T(`${w}px : pas de défilement latéral`, !m.page);
   if(w<=760) T(`${w}px : le libellé court prend le relais`, m.lg==='none', m.lg);
   await p.screenshot({path:'/tmp/accomp_'+w+'.png',clip:{x:0,y:0,width:w,height:Math.min(130,hh)}});
 }
 await p.setViewportSize({width:1280,height:950});
 await p.evaluate(()=>ouvrirPause()); await p.waitForTimeout(350);
 const mp=await p.evaluate(()=>{
   const c=document.getElementById('modCorps');
   return c.scrollWidth>c.clientWidth+1;
 });
 T('la carte ne déborde pas avec les réglages', !mp);
 await p.screenshot({path:'/tmp/carte_reglages.png'});

 T('l’aide décrit le nouveau fonctionnement',
   await p.evaluate(()=>AIDE.some(r=>/Quand chaque section est proposée/.test(r.html)
     && /n’est pas une pause/.test(r.html))));
 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 fs.rmSync(BAC,{recursive:true,force:true});
 process.exit(ko.length?1:0);
})();
