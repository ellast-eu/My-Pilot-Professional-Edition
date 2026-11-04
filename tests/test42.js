/* 3.23.0 — « Passées sans trace » : rien ne doit passer inaperçu au retour d'une absence. */
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
 await p.goto(''+APP+''); await p.waitForTimeout(1500);

 /* un jeu qui couvre chaque cas de sortie de la liste */
 await p.evaluate(({d3,d10,d45,d4,d5,d0,d2,d12})=>{
   fichierCharge=true;
   D=vierge(); D.parametres.categories=modeleCategories();
   const a=(id,d,lib,x)=>Object.assign({id:id,categorie:'chantier',date:d,heure:'09:00',
     libelle:lib,commune:'SAINT-MARTIN',reference:'R-'+id,statut:'',archive:false},x||{});
   D.chantiers=[
     a('v1',d3,'Visite sans trace'),
     a('v2',d10,'Intervention sans trace'),
     a('v3',d45,'Vieille visite sans trace'),
     a('n1',d4,'Visite notée'),
     a('cl',d5,'Visite close',{statut:statutClos('chantier')}),
     a('an',d5,'Visite annulée',{statut:'annule'}),
     a('ar',d5,'Visite archivée',{archive:true}),
     a('auj',d0,'Rendez-vous du jour'),
     a('dem',d2,'Rendez-vous à venir'),
     a('sd','','Sans date')
   ];
   D.notes=[{id:'x1',date:d4,heure:'10:00',type:'',chantier_id:'n1',rubrique_id:'',
             contenu:'Compte rendu de la visite',duree:30,suite:null},
            {id:'x2',date:d12,heure:'10:00',type:'',chantier_id:'v2',rubrique_id:'',
             contenu:'Préparation',duree:10,suite:null}];
   horizonSansTrace=30; voirEcartesST=false;
   rendre();
 },{d3:J(-3),d10:J(-10),d45:J(-45),d4:J(-4),d5:J(-5),d0:J(0),d2:J(2),d12:J(-12)});

 await p.evaluate(()=>{vueActive='jour'; rendre()});
 await p.waitForTimeout(300);
 /* --- 1. ce que le moteur retient -------------------------------------- */
 let t=await p.evaluate(()=>{const x=sansTraceListes();
   return {o:x.ouvertes.map(c=>c.id),e:x.ecartees.map(c=>c.id)}});
 T('les activités sans trace sont retenues', t.o.join(',')==='v1,v2,v3', t.o.join(','));
 T('  une activité notée le jour dit est exclue', t.o.indexOf('n1')<0);
 T('  une note antérieure ne vaut pas trace', t.o.indexOf('v2')>=0);
 T('  close, annulée, archivée : exclues',
   ['cl','an','ar'].every(i=>t.o.indexOf(i)<0), t.o.join(','));
 T('  le jour même ne compte pas', t.o.indexOf('auj')<0);
 T('  une date à venir ne compte pas', t.o.indexOf('dem')<0);
 T('  une activité sans date ne compte pas', t.o.indexOf('sd')<0);
 T('  tri du plus récent au plus ancien', t.o.join(',')==='v1,v2,v3', t.o.join(','));
 T('aucune écartée au départ', t.e.length===0);

 /* --- 2. le bloc s'affiche --------------------------------------------- */
 let v=await p.evaluate(()=>{
   const b=[...document.querySelectorAll('.bloc')].find(x=>/Passées sans trace/.test(x.textContent));
   if(!b) return null;
   return {txt:b.textContent, compte:b.querySelector('.compte').textContent,
     bord:getComputedStyle(b).borderLeftWidth,
     noter:b.querySelectorAll('[data-noter]').length,
     rien:b.querySelectorAll('[data-rienst]').length,
     hor:[...b.querySelectorAll('[data-horst]')].map(x=>x.textContent)};
 });
 T('le bloc existe', !!v);
 T('il compte les activités de l’horizon', v.compte==='2 / 3', v.compte);
 T('il n’en liste que deux à 1 mois', v.noter===2 && v.rien===2, v.noter+'/'+v.rien);
 T('il signale les plus anciennes', /1 plus anciennes/.test(v.txt));
 T('les horizons sont proposés', v.hor.join(',')==='1 sem.,2 sem.,1 mois,3 mois,Tout', v.hor.join(','));
 T('un liseré attire l’œil', parseFloat(v.bord)>=3, v.bord);
 T('le bloc dit ce qu’il montre', /aucune\s+note leur soit rattachée/.test(v.txt.replace(/\s+/g,' ')));

 /* --- 3. l'horizon ------------------------------------------------------ */
 await p.evaluate(()=>{horizonSansTrace=7; rendre()}); await p.waitForTimeout(250);
 let c7=await p.evaluate(()=>document.querySelectorAll('[data-rienst]').length);
 T('à 1 semaine, une seule reste', c7===1, ''+c7);
 await p.click('[data-horst="0"]'); await p.waitForTimeout(300);
 let c0=await p.evaluate(()=>({n:document.querySelectorAll('[data-rienst]').length,
   compte:[...document.querySelectorAll('.bloc')].find(x=>/Passées sans trace/.test(x.textContent))
     .querySelector('.compte').textContent}));
 T('« Tout » montre les trois', c0.n===3, ''+c0.n);
 T('  et le compte ne se dédouble plus', c0.compte==='3', c0.compte);

 /* --- 4. écarter, puis remettre ---------------------------------------- */
 await p.click('[data-rienst="v3"]'); await p.waitForTimeout(350);
 let ap=await p.evaluate(()=>({marque:!!(D.chantiers.find(c=>c.id==='v3')||{}).rien_a_noter,
   n:document.querySelectorAll('[data-rienst]').length,
   voir:!!document.querySelector('[data-voirecartesst]'),
   remettre:document.querySelectorAll('[data-reprendst]').length}));
 T('« Rien à noter » marque l’activité', ap.marque===true);
 T('  elle quitte la liste', ap.n===2, ''+ap.n);
 T('  un bouton propose de revoir les écartées', ap.voir===true);
 T('  les écartées restent masquées par défaut', ap.remettre===0, ''+ap.remettre);
 await p.click('[data-voirecartesst]'); await p.waitForTimeout(300);
 T('  on peut les réafficher',
   await p.evaluate(()=>document.querySelectorAll('[data-reprendst]').length===1));
 await p.click('[data-reprendst="v3"]'); await p.waitForTimeout(350);
 ap=await p.evaluate(()=>({marque:(D.chantiers.find(c=>c.id==='v3')||{}).rien_a_noter,
   n:document.querySelectorAll('[data-rienst]').length}));
 T('« Remettre » annule l’écart', !ap.marque);
 T('  l’activité revient', ap.n===3, ''+ap.n);

 /* --- 5. noter fait disparaître l'activité ------------------------------ */
 await p.evaluate(()=>{
   D.notes.push({id:'x3',date:auj(),heure:'11:00',type:'',chantier_id:'v1',rubrique_id:'',
     contenu:'Visite faite finalement',duree:20,suite:null});
   rendre();
 }); await p.waitForTimeout(300);
 T('une note rattachée sort l’activité de la liste',
   await p.evaluate(()=>sansTraceListes().ouvertes.map(c=>c.id).join(','))==='v2,v3');

 /* --- 6. le bloc disparaît quand il n'a plus rien à dire ---------------- */
 await p.evaluate(()=>{
   D.chantiers.forEach(c=>{ if(c.date && c.date<auj()) c.rien_a_noter=false, c.archive=true });
   rendre();
 }); await p.waitForTimeout(300);
 T('plus rien à signaler : le bloc s’efface',
   await p.evaluate(()=>![...document.querySelectorAll('.bloc')]
     .some(x=>/Passées sans trace/.test(x.textContent))));

 /* --- 7. volume : l'index évite le balayage quadratique ----------------- */
 const ms=await p.evaluate(()=>{
   D=vierge(); D.parametres.categories=modeleCategories();
   const d=new Date(); d.setDate(d.getDate()-20); const old=d.toISOString().slice(0,10);
   D.chantiers=[]; D.notes=[];
   for(let i=0;i<1500;i++) D.chantiers.push({id:'c'+i,categorie:'chantier',date:old,
     heure:'09:00',libelle:'Dossier '+i,statut:'',archive:false});
   for(let i=0;i<3000;i++) D.notes.push({id:'n'+i,date:old,heure:'10:00',type:'',
     chantier_id:'c'+(i%700),rubrique_id:'',contenu:'x',duree:0,suite:null});
   const t0=performance.now(); const r=sansTraceListes(); const t1=performance.now();
   return {ms:t1-t0, n:r.ouvertes.length};
 });
 T('1500 activités et 3000 notes : calcul sous 150 ms', ms.ms<150, Math.round(ms.ms)+' ms');
 T('  et le compte est juste', ms.n===800, ''+ms.n);

 /* --- 8. mise en page --------------------------------------------------- */
 await p.evaluate(({d3,d10})=>{
   D=vierge(); D.parametres.categories=modeleCategories();
   D.chantiers=[{id:'v1',categorie:'chantier',date:d3,heure:'09:00',libelle:'Visite de contrôle du poste',
     commune:'SAINT-MARTIN-DU-BOIS',tiers:'Entreprise de travaux',reference:'2026-076',statut:'',archive:false},
    {id:'v2',categorie:'convocation',date:d10,heure:'14:00',libelle:'Convocation entreprise',
     commune:'VILLENEUVE',reference:'2026-081',statut:'',archive:false}];
   D.notes=[]; horizonSansTrace=30; voirEcartesST=false; vueActive='jour'; rendre();
 },{d3:J(-3),d10:J(-10)}); await p.waitForTimeout(400);
 for(const [w,hh] of [[1280,1000],[390,800]]){
   await p.setViewportSize({width:w,height:hh}); await p.waitForTimeout(350);
   const m=await p.evaluate(()=>{
     const b=[...document.querySelectorAll('.bloc')].find(x=>/Passées sans trace/.test(x.textContent));
     const r=b.getBoundingClientRect();
     return {deb:b.scrollWidth>b.clientWidth+1, hors:r.right>innerWidth+1,
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : le bloc ne déborde pas`, !m.deb && !m.hors);
   T(`${w}px : la page ne défile pas latéralement`, !m.page);
   await p.screenshot({path:'/tmp/sanstrace_'+w+'.png',fullPage:w===1280});
 }

 /* --- 9. l'aide --------------------------------------------------------- */
 await p.setViewportSize({width:1280,height:1000});
 const aide=await p.evaluate(()=>{
   ouvrirAide&&ouvrirAide();
   return document.body.textContent;
 });
 await p.waitForTimeout(400);
 T('l’aide décrit le bloc',
   /Passées sans trace/.test(await p.evaluate(()=>document.body.textContent)));

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
