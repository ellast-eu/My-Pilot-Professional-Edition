/* 3.36.0 — l'onglet Options, et le format des dates au choix.
   Le point dur : en mode « fr » le champ visible est un <input type="text">, mais
   .value doit continuer à rendre de l'ISO, sinon les ~70 lectures de l'application
   lisent du vide et des dates se perdent en silence. C'est ce que ce banc traque. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 /* navigateur volontairement en anglais : c'est la situation de Stella */
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
   args:['--lang=en-US']});
 const ctx=await b.newContext({viewport:{width:1280,height:1000},locale:'en-US'});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(APP); await p.waitForTimeout(1500);

 const poser=()=>p.evaluate(()=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[{id:'c1',categorie:'chantier',date:'2026-11-12',heure:'14:30',duree:60,
     libelle:'Essai',statut:'',archive:false}];
   D=normaliser(D); vueActive='chantiers'; rendre();
 });

 /* --- 1. l'onglet s'appelle Options --------------------------------------- */
 const ong=await p.evaluate(()=>[...document.querySelectorAll('nav button[data-vue]')]
   .map(x=>x.dataset.vue+':'+x.textContent).join(' · '));
 T('l’onglet Données s’appelle Options', /donnees:Options/.test(ong), ong);
 T('  la clé interne reste « donnees »', /donnees:/.test(ong));
 T('l’aide a suivi', await p.evaluate(()=>
   AIDE.some(r=>r.titre==='Options, fichier et exports')
   && !AIDE.some(r=>/onglet Données/.test(r.html))));
 /* Les versions antérieures portent désormais le suffixe -private (v1.0-public),
    mais leur TEXTE n'a pas été réécrit : l'entrée 3.19.0 raconte toujours ce qui s'est
    passé à l'époque où l'onglet s'appelait Données. C'est ça qu'on vérifie. */
 T('  mais le journal n’a pas été réécrit', await p.evaluate(()=>
   JOURNAL_VERSIONS.some(v=>/^3\.19\.0(-private)?$/.test(v[0]) && /depuis Données/.test(v[1]))));

 /* --- 2. le réglage existe et bascule -------------------------------------- */
 await p.evaluate(()=>{ vueActive='donnees'; rendre() }); await p.waitForTimeout(400);
 const sel=await p.evaluate(()=>{const e=document.getElementById('fmtDate');
   return e?{v:e.value, opts:[...e.options].map(o=>o.value).join(',')}:null});
 T('le réglage est dans Options', !!sel, JSON.stringify(sel));
 T('  et vaut « auto » par défaut', sel.v==='auto', sel.v);
 T('  avec les deux choix', sel.opts==='auto,fr', sel.opts);

 /* --- 3. en mode auto, les champs restent natifs --------------------------- */
 await poser(); await p.waitForTimeout(300);
 await p.evaluate(()=>editerChantier('c1')); await p.waitForTimeout(400);
 let f=await p.evaluate(()=>{const e=document.querySelector('#modCorps [name="date"]');
   return {type:e.type, val:e.value}});
 T('mode auto : le champ date est natif', f.type==='date', f.type);
 T('  et rend bien sa date', f.val==='2026-11-12', f.val);
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(250);

 /* --- 4. en mode fr, le champ change de nature mais pas de contrat --------- */
 await p.evaluate(()=>{ D.parametres.format_date='fr'; rendre() }); await p.waitForTimeout(350);
 await p.evaluate(()=>editerChantier('c1')); await p.waitForTimeout(400);
 f=await p.evaluate(()=>{const e=document.querySelector('#modCorps [name="date"]');
   const brut=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(e);
   const h=document.querySelector('#modCorps [name="heure"]');
   return {type:e.type, affiche:brut, value:e.value, heure:h.value,
     heureAff:Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(h)}});
 T('mode fr : le champ date devient un champ texte', f.type==='text', f.type);
 T('  il AFFICHE le français', f.affiche==='12/11/2026', f.affiche);
 T('  mais .value rend toujours de l’ISO', f.value==='2026-11-12', f.value);
 T('  l’heure s’affiche en 24 h', f.heureAff==='14:30', f.heureAff);
 T('  et .value la rend telle quelle', f.heure==='14:30', f.heure);
 T('  valChamp() lit la même chose', await p.evaluate(()=>valChamp('date'))==='2026-11-12');
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(250);

 /* --- 5. la saisie, y compris en frappe rapide ----------------------------- */
 const saisies=await p.evaluate(()=>{
   const e=document.createElement('input');
   e.setAttribute('data-fr','date'); document.body.appendChild(e);
   armerChampFr(e);
   const S=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
   const essai=t=>{ S.call(e,t); return e.value };
   const r={};
   ['12/11/2026','12/11/26','12/11','1/2/2026','121126','12112026','2026-11-12',
    '12-11-2026','','12/13/2026','abc','32/01/2026','29/02/2025'].forEach(t=>{r[t||'(vide)']=essai(t)});
   e.remove(); return r;
 });
 T('jj/mm/aaaa', saisies['12/11/2026']==='2026-11-12', saisies['12/11/2026']);
 T('  année sur deux chiffres', saisies['12/11/26']==='2026-11-12', saisies['12/11/26']);
 T('  sans année : l’année courante', saisies['12/11']===new Date().getFullYear()+'-11-12', saisies['12/11']);
 T('  un seul chiffre par champ', saisies['1/2/2026']==='2026-02-01', saisies['1/2/2026']);
 T('  frappe rapide à 6 chiffres', saisies['121126']==='2026-11-12', saisies['121126']);
 T('  frappe rapide à 8 chiffres', saisies['12112026']==='2026-11-12', saisies['12112026']);
 T('  de l’ISO collé passe tel quel', saisies['2026-11-12']==='2026-11-12', saisies['2026-11-12']);
 T('  le tiret comme séparateur', saisies['12-11-2026']==='2026-11-12', saisies['12-11-2026']);
 T('vide reste vide', saisies['(vide)']==='', saisies['(vide)']);
 T('  un mois à 13 est refusé, pas deviné', saisies['12/13/2026']==='', saisies['12/13/2026']);
 T('  du texte est refusé', saisies['abc']==='', saisies['abc']);
 T('  le 32 janvier est refusé', saisies['32/01/2026']==='', saisies['32/01/2026']);
 T('  le 29 février d’une année non bissextile aussi', saisies['29/02/2025']==='', saisies['29/02/2025']);

 const heures=await p.evaluate(()=>{
   const e=document.createElement('input');
   e.setAttribute('data-fr','heure'); document.body.appendChild(e);
   armerChampFr(e);
   const S=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
   const r={}; ['14:30','14h30','1430','930','9','24:00','14:65','abc']
     .forEach(t=>{ S.call(e,t); r[t]=e.value });
   e.remove(); return r;
 });
 T('l’heure en 24 h', heures['14:30']==='14:30');
 T('  le h français', heures['14h30']==='14:30', heures['14h30']);
 T('  quatre chiffres', heures['1430']==='14:30', heures['1430']);
 T('  trois chiffres', heures['930']==='09:30', heures['930']);
 T('  une heure ronde', heures['9']==='09:00', heures['9']);
 T('  24:00 est refusé', heures['24:00']==='', heures['24:00']);
 T('  65 minutes aussi', heures['14:65']==='', heures['14:65']);

 /* --- 6. une frappe illisible se voit, et ne s'efface pas ------------------ */
 /* Sur une fiche existante, Date est désactivé depuis la 3.35.0 : c'est l'événement
    qui fait foi. La saisie se teste donc là où elle a lieu — le formulaire d'événement. */
 const horsChamp=()=>p.evaluate(()=>document.getElementById('fevLib').focus());
 await p.evaluate(()=>editerChantier('c1')); await p.waitForTimeout(400);
 T('fiche existante : le champ Date est désactivé, bouton calendrier compris',
   await p.evaluate(()=>{const e=document.querySelector('#modCorps [name="date"]');
     return e.disabled===true
       && !e.parentNode.querySelector('[data-fr-cal]')}));
 await p.click('[data-act="fiche-evt"]'); await p.waitForTimeout(300);
 await p.fill('#fevDate','99/99/9999'); await horsChamp(); await p.waitForTimeout(300);
 const faux=await p.evaluate(()=>{const e=document.getElementById('fevDate');
   return {brut:Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(e),
     rouge:e.classList.contains('fr-faux'), aria:e.getAttribute('aria-invalid')}});
 T('une frappe illisible est signalée en rouge', faux.rouge===true && faux.aria==='true',
   JSON.stringify(faux));
 T('  et n’est pas effacée dans le dos de l’utilisatrice', faux.brut==='99/99/9999', faux.brut);
 /* à l'inverse, ce qui est lisible est remis au propre */
 await p.fill('#fevDate','3/4'); await horsChamp(); await p.waitForTimeout(300);
 const propre=await p.evaluate(()=>{const e=document.getElementById('fevDate');
   return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(e)});
 T('  « 3/4 » est remis au propre à la sortie du champ',
   propre==='03/04/'+new Date().getFullYear(), propre);

 /* --- 7. le calendrier natif reste joignable ------------------------------- */
 const cal=await p.evaluate(()=>{
   const b=document.querySelector('#ficheEvt [data-fr-cal]');
   if(!b) return {absent:true};
   let ouvert=false;
   const vrai=HTMLInputElement.prototype.showPicker;
   HTMLInputElement.prototype.showPicker=function(){ ouvert=true };
   b.click();
   HTMLInputElement.prototype.showPicker=vrai;
   const n=document.getElementById('frPick');
   return {ouvert:ouvert, natif:!!n && n.type==='date', pre:n?n.value:null};
 });
 T('le bouton calendrier est là', !cal.absent);
 T('  il ouvre bien le sélecteur natif', cal.ouvert===true);
 T('  lequel est bien un champ date', cal.natif===true);
 T('  pré-positionné sur la date du champ', cal.pre==='2026-04-03', ''+cal.pre);
 /* et ce que le calendrier renvoie atterrit bien dans le champ visible */
 const retour=await p.evaluate(()=>{
   const n=document.getElementById('frPick');
   n.value='2026-07-14'; n.dispatchEvent(new Event('change'));
   const e=document.getElementById('fevDate');
   return {iso:e.value,
     vu:Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(e)};
 });
 T('  la date choisie revient dans le champ, en français',
   retour.iso==='2026-07-14' && retour.vu==='14/07/2026', JSON.stringify(retour));
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(250);

 /* --- 8. le va-et-vient complet : saisir, enregistrer, relire -------------- */
 await p.evaluate(()=>{
   D.chantiers=[{id:'c2',categorie:'chantier',libelle:'À dater',statut:'',archive:false}];
   D=normaliser(D); rendre(); editerChantier('c2');
 }); await p.waitForTimeout(400);
 await p.click('[data-act="fiche-evt"]'); await p.waitForTimeout(300);
 await p.fill('#fevDate','25/12/2026');
 await p.fill('#fevHeure','9h15');
 await p.click('[data-act="fiche-add-evt"]'); await p.waitForTimeout(450);
 const bout=await p.evaluate(()=>{const c=D.chantiers.find(x=>x.id==='c2');
   return {n:c.evenements.length, e:c.evenements[0], date:c.date, heure:c.heure}});
 T('une date tapée en français arrive en ISO dans les données',
   bout.n===1 && bout.e.date==='2026-12-25', JSON.stringify(bout.e));
 T('  l’heure aussi', bout.e.heure==='09:15', bout.e.heure);
 T('  et la date de référence suit', bout.date==='2026-12-25', bout.date);
 T('  le dossier entre au planning du bon jour',
   await p.evaluate(()=>chantiersDu('2026-12-25').length)===1);

 /* --- 9. changer de mode ne perd rien -------------------------------------- */
 const bascule=await p.evaluate(()=>{
   D.parametres.format_date='auto'; rendre();
   const a=D.chantiers.find(x=>x.id==='c2').date;
   D.parametres.format_date='fr'; rendre();
   const b=D.chantiers.find(x=>x.id==='c2').date;
   return {a:a,b:b};
 });
 T('basculer de mode ne touche pas aux données', bascule.a==='2026-12-25' && bascule.b==='2026-12-25',
   JSON.stringify(bascule));

 /* --- 10. mise en page ----------------------------------------------------- */
 for(const [w,hh] of [[1280,1000],[390,900]]){
   await p.setViewportSize({width:w,height:hh});
   await p.evaluate(()=>{ D.parametres.format_date='fr'; vueActive='chantiers'; rendre();
     editerChantier('c2') }); await p.waitForTimeout(400);
   const m=await p.evaluate(()=>{
     const d=document.getElementById('modale');
     const s=document.querySelector('#modCorps .chp-fr');
     if(!d.open || !s) return {ouvert:d.open, trouve:!!s};
     const r=s.getBoundingClientRect(), c=document.getElementById('modCorps').getBoundingClientRect();
     return {ouvert:true, trouve:true, large:r.width, /* un rect à zéro = rien de mesuré */
       dedans:r.width>40 && r.right<=c.right+1 && r.left>=c.left-1,
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : la fiche est bien ouverte et porte un champ français`,
     m.ouvert===true && m.trouve===true, JSON.stringify(m));
   T(`  ${w}px : le champ et son bouton tiennent dans la fenêtre`, m.dedans===true,
     JSON.stringify(m));
   T(`  ${w}px : pas de défilement latéral`, m.page===false);
   await p.screenshot({path:'/tmp/fmt_'+w+'.png'});
   await p.evaluate(()=>fermerModale()); await p.waitForTimeout(200);
 }


 /* --- 11. l'armement ne dépend pas du minutage ----------------------------- */
 /* Le MutationObserver est un filet, pas le mécanisme : son rappel est asynchrone.
    Tout est donc armé SYNCHRONEMENT à l'injection. Ces assertions lisent les champs
    dans la même évaluation que leur création — sans aucune attente. Si elles passent,
    plus rien ne dépend du moment où l'observateur se réveille. */
 const sync=await p.evaluate(()=>{
   const L=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get;
   const o={};
   D.parametres.format_date='fr';
   /* a) une fiche ouverte par ouvrirModale */
   D.chantiers=[{id:'s1',categorie:'chantier',date:'2026-11-12',heure:'14:30',
     libelle:'Sync',statut:'',archive:false}];
   D=normaliser(D); vueActive='chantiers'; rendre();
   editerChantier('s1');
   const d=document.querySelector('#modCorps [name="date"]');
   o.fiche={vu:L.call(d), iso:d.value};
   /* b) l'îlot « + Événement » */
   ficheFormEvt(null);
   const fe=document.getElementById('fevDate');
   o.evt={vu:L.call(fe), iso:fe.value};
   /* c) l'îlot « + Tâche » */
   ficheFormTache();
   const ft=document.getElementById('ftEch');
   o.tache={vu:L.call(ft), iso:ft.value, lisible:dateValide(ft.value)};
   fermerModale();
   /* d) la vue Options, écrite par rendre() */
   vueActive='donnees'; rendre();
   const pd=document.getElementById('perDeb');
   o.options={type:pd.type, arme:pd.__fr===true};
   return o;
 });
 T('fiche : .value rend de l’ISO dès l’injection, sans attendre',
   /^\d{4}-\d{2}-\d{2}$/.test(sync.fiche.iso) && /^\d{2}\/\d{2}\/\d{4}$/.test(sync.fiche.vu),
   JSON.stringify(sync.fiche));
 T('îlot Événement : idem', /^\d{4}-\d{2}-\d{2}$/.test(sync.evt.iso)
   && /^\d{2}\/\d{2}\/\d{4}$/.test(sync.evt.vu), JSON.stringify(sync.evt));
 T('îlot Tâche : idem', sync.tache.lisible===true
   && /^\d{2}\/\d{2}\/\d{4}$/.test(sync.tache.vu), JSON.stringify(sync.tache));
 T('vue Options : les champs de période sont armés', sync.options.arme===true,
   JSON.stringify(sync.options));

 /* saisirDate() écrit sa valeur par défaut dans la foulée de l'injection : c'est le
    cas qui cassait réellement — la date proposée s'affichait en ISO. */
 const sd=await p.evaluate(()=>{
   const L=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get;
   saisirDate("Quand ?","2026-12-25");
   const e=document.getElementById('sdDate');
   const r={vu:L.call(e), iso:e.value};
   e.closest('dialog').querySelector('[data-s="non"]').click();
   return r;
 });
 T('saisirDate affiche sa date par défaut en français, pas en ISO',
   sd.vu==='25/12/2026' && sd.iso==='2026-12-25', JSON.stringify(sd));

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
