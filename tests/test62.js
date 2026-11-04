/* v1.4 — les notes sans rattachement.
   Une note sans activité ni rubrique n'apparaît nulle part : ni sous un dossier, ni
   sous une rubrique. Elle existe pourtant, et compte dans les totaux. C'est ce que
   Stella a subi en supprimant une rubrique. */
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
 p.on('dialog',d=>d.accept());
 await p.goto(APP); await p.waitForTimeout(1500);

 const poser=()=>p.evaluate(({j})=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[{id:'c1',categorie:'chantier',libelle:'Un dossier',statut:'',archive:false}];
   D.notes=[
     {id:'n1',date:j[0],heure:'09:00',type:'',chantier_id:'',rubrique_id:'r-traitement',
      contenu:'Rattachée à une rubrique',duree:15,suite:null},
     {id:'n2',date:j[-1],heure:'10:00',type:'',chantier_id:'',rubrique_id:'r-traitement',
      contenu:'Elle aussi',duree:5,suite:null},
     {id:'n3',date:j[-2],heure:'11:00',type:'',chantier_id:'c1',rubrique_id:'',
      contenu:'Rattachée à un dossier',duree:10,suite:null}];
   D=normaliser(D); vueActive='journal'; rendre();
 },{j:{0:J(0),'-1':J(-1),'-2':J(-2)}});
 const bloc=()=>p.evaluate(()=>{
   const b=[...document.querySelectorAll('.bloc')]
     .find(x=>/Notes sans rattachement/.test(x.textContent));
   return b?{n:b.querySelectorAll('[data-orph]').length, txt:b.textContent}:null;
 });

 await poser(); await p.waitForTimeout(450);
 T('tout est rattaché : aucun bloc', (await bloc())===null);

 /* --- le scénario de Stella : supprimer la rubrique ----------------------- */
 await p.evaluate(()=>{ vueActive='donnees'; ongletOptions='organisation'; rendre() }); await p.waitForTimeout(350);
 await p.click('[data-suprub="r-traitement"]'); await p.waitForTimeout(450);
 await p.evaluate(()=>{ vueActive='journal'; rendre() }); await p.waitForTimeout(450);

 let z=await bloc();
 T('les notes détachées apparaissent dans le Journal', z && z.n===2,
   z?('lignes : '+z.n):'bloc absent');
 T('  le bloc dit combien', /Notes sans rattachement\s*2/.test((z&&z.txt)||''),
   (z&&z.txt||'').slice(0,80));
 T('  et d’où elles viennent', /était rattachée à : rubrique « Traitement en série »/
   .test((z&&z.txt)||''), (z&&z.txt||'').slice(0,220));
 T('  la note rattachée à un dossier n’y est pas',
   !/Rattachée à un dossier/.test((z&&z.txt)||''));
 T('  les plus récentes d’abord', await p.evaluate(()=>
   [...document.querySelectorAll('[data-orph]')].map(e=>e.dataset.orph).join(','))==='n1,n2');

 /* --- les ranger sur place ------------------------------------------------ */
 const rid=await p.evaluate(()=>rubriques()[0].id);
 await p.selectOption('[data-orph="n1"]','r:'+rid); await p.waitForTimeout(450);
 const apres=await p.evaluate(({rid})=>{
   const n=notePar('n1');
   return {rub:n.rubrique_id, trace:n.chantier_ref, attendu:rid};
 },{rid});
 T('choisir une rubrique rattache la note', apres.rub===apres.attendu, JSON.stringify(apres));
 T('  et la trace disparaît, elle a servi', apres.trace==='', JSON.stringify(apres.trace));
 z=await bloc();
 T('  le bloc n’en liste plus qu’une', z && z.n===1, z?('lignes : '+z.n):'bloc absent');

 /* la dernière rangée fait disparaître le bloc */
 await p.selectOption('[data-orph="n2"]','r:'+rid); await p.waitForTimeout(450);
 T('une fois tout rangé, le bloc s’efface', (await bloc())===null);
 T('  et les deux notes comptent bien dans la rubrique',
   await p.evaluate(({j,rid})=>minutesRubrique(rid,[j[0],j[-1]]),
     {j:{0:J(0),'-1':J(-1)},rid})===20);

 /* --- « Ouvrir la note » reste le chemin vers une activité ---------------- */
 await poser(); await p.waitForTimeout(400);
 await p.evaluate(()=>{ (D.notes||[]).forEach(n=>{ if(n.id==='n1'){
   souvenirLien(n); n.rubrique_id=''; n.chantier_id=''; } }); vueActive='journal'; rendre() });
 await p.waitForTimeout(400);
 await p.click('[data-orph="n1"] ~ [data-note="n1"]'); await p.waitForTimeout(450);
 T('« Ouvrir la note » ouvre la fiche', await p.evaluate(()=>
   document.getElementById('modale').open===true));
 T('  qui propose bien les activités, pas seulement les rubriques',
   await p.evaluate(()=>{
     const s=document.querySelector('#modCorps [name="lien"]');
     return !!s && /Un dossier/.test(s.textContent);
   }));
 await p.evaluate(()=>fermerModale()); await p.waitForTimeout(250);

 /* --- une liste longue ne déborde pas ------------------------------------- */
 await p.evaluate(({j})=>{
   D.notes=[];
   for(let k=0;k<20;k++) D.notes.push({id:'o'+k,date:j[0],heure:'09:00',type:'',
     chantier_id:'',rubrique_id:'',contenu:'Orpheline '+k,duree:5,suite:null});
   D=normaliser(D); vueActive='journal'; rendre();
 },{j:{0:J(0)}});
 await p.waitForTimeout(450);
 z=await bloc();
 T('vingt orphelines : le bloc en montre douze', z && z.n===12, z?('lignes : '+z.n):'absent');
 T('  et annonce le reste', /et 8 de plus/.test((z&&z.txt)||''), (z&&z.txt||'').slice(-120));

 /* --- mise en page -------------------------------------------------------- */
 for(const [w,hh] of [[1280,1000],[390,900]]){
   await p.setViewportSize({width:w,height:hh});
   await p.evaluate(()=>rendre()); await p.waitForTimeout(350);
   const m=await p.evaluate(()=>{
     const r=document.querySelector('[data-orph]');
     if(!r) return {absent:true};
     const l=r.closest('.ligne');
     return {dedans:l.scrollWidth<=l.clientWidth+1,
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : la ligne ne déborde pas`, m.dedans===true, JSON.stringify(m));
   T(`  ${w}px : pas de défilement latéral`, m.page===false);
   await p.screenshot({path:'/tmp/orph_'+w+'.png'});
 }

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
