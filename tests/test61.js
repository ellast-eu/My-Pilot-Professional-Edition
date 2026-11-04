/* v1.2 — la source automatique d'une rubrique.
   Le défaut signalé par Stella : la propriété `auto` n'était réglable nulle part.
   Seules les rubriques d'usine en portaient une ; supprimer « Traitement en série »
   rendait le chrono irrécupérable autrement qu'en éditant le fichier à la main. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const J=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 let confirmations=[]; let reponse=true;
 p.on('dialog',async d=>{ confirmations.push(d.message()); await (reponse?d.accept():d.dismiss()) });

 await p.goto(APP); await p.waitForTimeout(1500);

 const poser=()=>p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   /* Une journée de comptage porte une liste de sessions, pas un seul créneau. */
   D.compteur=[{id:'s1',date:j[0],traites:10,
     sessions:[{debut:'08:00',fin:'09:00'}]}];
   D.notes=[{id:'n1',date:j[0],heure:'09:00',type:'',chantier_id:'',
     rubrique_id:'r-traitement',contenu:'Une note',duree:15,suite:null},
            {id:'n2',date:j[0],heure:'10:00',type:'',chantier_id:'',
     rubrique_id:'r-traitement',contenu:'Une autre',duree:5,suite:null}];
   D=normaliser(D); vueActive='donnees'; rendre();
 },{j:{0:J(0)}});
 const sources=()=>p.evaluate(()=>rubriques().map(r=>r.nom+':'+(r.auto||'—')).join(', '));

 await poser(); await p.waitForTimeout(400);

 /* --- 1. le réglage existe enfin ------------------------------------------ */
 const sel=await p.evaluate(()=>{
   const l=[...document.querySelectorAll('[data-rubauto]')];
   return {n:l.length, opts:l.length?[...l[0].options].map(o=>o.value).join(','):''};
 });
 T('chaque rubrique porte sa liste de sources', sel.n===5, ''+sel.n);
 T('  avec les trois choix', sel.opts===',compteur,appels', sel.opts);
 T('le formulaire d’ajout aussi',
   await p.evaluate(()=>!!document.getElementById('rubAuto')));

 /* --- 2. le cas de Stella : supprimer puis remettre ----------------------- */
 const avant=await p.evaluate(({j})=>minutesRubrique('r-traitement',[j[0]]),{j:{0:J(0)}});
 T('la rubrique compte bien le chrono du compteur', avant===60+20, ''+avant);

 reponse=true; confirmations=[];
 await p.click('[data-suprub="r-traitement"]'); await p.waitForTimeout(400);
 T('supprimer prévient AVANT', confirmations.length===1, confirmations.join(''));
 T('  en annonçant les notes détachées', /2 note\(s\)/.test(confirmations[0]||''),
   (confirmations[0]||'').slice(0,120));
 T('  et la perte de la récupération', /Chrono du compteur/.test(confirmations[0]||''));
 T('  la rubrique est bien partie',
   await p.evaluate(()=>rubriques().some(r=>r.id==='r-traitement'))===false);

 /* on la recrée à la main, comme elle l'a fait */
 await p.fill('#rubNom','Traitement en série');
 await p.selectOption('#rubFam','regalien');
 await p.click('[data-act="rub-add"]'); await p.waitForTimeout(400);
 const sansSrc=await p.evaluate(({j})=>{
   const r=rubriques().find(x=>x.nom==='Traitement en série');
   return {auto:r.auto, min:minutesRubrique(r.id,[j[0]])};
 },{j:{0:J(0)}});
 T('recréée sans source, elle ne compte pas le chrono',
   sansSrc.auto==='' && sansSrc.min===0, JSON.stringify(sansSrc));

 /* et on lui redonne la source — c'est ce qui était impossible */
 const rid=await p.evaluate(()=>rubriques().find(x=>x.nom==='Traitement en série').id);
 await p.selectOption(`[data-rubauto="${rid}"]`,'compteur'); await p.waitForTimeout(400);
 const remis=await p.evaluate(({j,rid})=>({auto:rubriques().find(x=>x.id===rid).auto,
   min:minutesRubrique(rid,[j[0]])}),{j:{0:J(0)},rid});
 T('lui rendre la source rétablit le chrono', remis.auto==='compteur' && remis.min===60,
   JSON.stringify(remis));

 /* --- 3. une source n'appartient qu'à une rubrique ------------------------ */
 await poser(); await p.waitForTimeout(400);
 await p.selectOption('[data-rubauto="r-mail"]','compteur'); await p.waitForTimeout(400);
 const uniq=await p.evaluate(()=>rubriques().filter(r=>r.auto==='compteur').map(r=>r.nom));
 T('la source quitte la rubrique qui la portait', uniq.length===1 && uniq[0]==='Traitement du mail',
   await sources());
 const totaux=await p.evaluate(({j})=>rubriques()
   .reduce((s,r)=>s+minutesAuto(r,[j[0]]),0),{j:{0:J(0)}});
 T('  le chrono n’est donc compté qu’une fois', totaux===60, ''+totaux);

 /* --- 4. on peut aussi la retirer ----------------------------------------- */
 await p.selectOption('[data-rubauto="r-mail"]',''); await p.waitForTimeout(400);
 T('retirer la source est possible',
   await p.evaluate(()=>rubriques().every(r=>r.auto!=='compteur')), await sources());

 /* --- 5. ajouter une rubrique AVEC sa source ------------------------------ */
 await p.fill('#rubNom','Comptage');
 await p.selectOption('#rubAuto','compteur');
 await p.click('[data-act="rub-add"]'); await p.waitForTimeout(400);
 T('on peut créer une rubrique avec sa source d’emblée',
   await p.evaluate(()=>{const r=rubriques().find(x=>x.nom==='Comptage'); return r&&r.auto==='compteur'}),
   await sources());

 /* --- 6. refuser la suppression ne supprime rien -------------------------- */
 await poser(); await p.waitForTimeout(400);
 reponse=false; confirmations=[];
 await p.click('[data-suprub="r-traitement"]'); await p.waitForTimeout(400);
 const refus=await p.evaluate(()=>({existe:rubriques().some(r=>r.id==='r-traitement'),
   liees:(D.notes||[]).filter(n=>n.rubrique_id==='r-traitement').length}));
 T('refuser la confirmation ne supprime pas', refus.existe===true);
 T('  et ne détache aucune note', refus.liees===2, ''+refus.liees);

 /* une rubrique sans note ni source part sans confirmation */
 reponse=true; confirmations=[];
 await p.click('[data-suprub="r-orga"]'); await p.waitForTimeout(400);
 T('une rubrique vide se supprime sans confirmation inutile',
   confirmations.length===0
   && await p.evaluate(()=>rubriques().some(r=>r.id==='r-orga'))===false,
   confirmations.join(''));

 /* --- 7. mise en page ------------------------------------------------------ */
 for(const [w,hh] of [[1280,1000],[390,900]]){
   await p.setViewportSize({width:w,height:hh});
   await poser(); await p.waitForTimeout(350);
   const m=await p.evaluate(()=>{
     const r=document.querySelector('[data-rubauto]');
     if(!r) return {absent:true};
     const row=r.closest('.item');
     return {dedans:row.scrollWidth<=row.clientWidth+1,
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : la ligne de rubrique ne déborde pas`, m.dedans===true, JSON.stringify(m));
   T(`  ${w}px : pas de défilement latéral`, m.page===false);
   await p.screenshot({path:'/tmp/rub_'+w+'.png'});
 }

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
