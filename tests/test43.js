/* 3.23.0 — garde-fou sur le pied des fenêtres.
   Aucun bouton ne doit en chevaucher un autre ni sortir du cadre, à toute largeur,
   et même si la police du poste rend les libellés plus larges qu'ici. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const J=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};

/* Les fenêtres à pied chargé : celles qui portent plus de deux boutons. */
const FENETRES=[
 ['Note',                 ()=>editerNote('n1')],
 ['Activité',             ()=>editerChantier('c1')],
 ['Action terminée',      ()=>cloreSuite('n1',false)],
 ['Noter une activité',   ()=>noterActivite('c1')],
 ['Appel',                ()=>{ D.appels.push({id:'a1',date:auj(),heure:'09:00',qui:'Mairie',
                                entreprise:'',tel:'0400000000',motif:'Demande',objet:'Objet',
                                commune:'SAINT-MARTIN',duree:5,suite:null,traite:false});
                                editerAppel('a1') }],
 ['Point de vigilance',   ()=>{ D.vigilances.push({id:'g1',texte:'Consigne du jour',
                                niveau:'attention',date:auj(),clos:false,permanent:false});
                                editerVigilance('g1') }],
 ['À propos',             ()=>ouvrirApropos()],
 ['Journal des versions', ()=>ouvrirApropos('journal')],
 ['Idée',                 ()=>{ D.idees.push({id:'i1',titre:'Une idée à creuser',note:'',
                                statut:'libre',date:auj()}); ouvrirIdee('i1') }],
 ['Pause',                ()=>ouvrirPause&&ouvrirPause()]
];

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const errs=[];
 /* « large » gonfle les libellés de 60 % : la police d'un poste Windows n'a pas les
    métriques de celle d'ici, et c'est là que les pieds cassent. */
 /* 160 % couvre l'affichage agrandi de Windows ; les écrans courts, le poste en
    fenêtre réduite, où la fenêtre doit borner et le corps défiler. */
 for(const large of [false,true]){
  for(const [w,h] of [[1280,900],[1024,1366],[800,620],[760,1000],[700,900],[520,900],[390,844],
                      [320,600],[1280,400],[800,420],[1024,600]]){
   const ctx=await b.newContext({viewport:{width:w,height:h}});
   const p=await ctx.newPage();
   p.on('pageerror',e=>errs.push(''+e));
   p.on('dialog',d=>d.dismiss());
   await p.goto(''+APP+''); await p.waitForTimeout(1200);
   if(large) await p.addStyleTag({content:'.mod-pied button,.mod-pied .puce-lbl{font-size:160% !important;letter-spacing:.12em !important}'});
   await p.evaluate(d=>{
     fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
     D.chantiers=[{id:'c1',categorie:'chantier',date:d,heure:'09:00',libelle:'Visite de contrôle',
       commune:'SAINT-MARTIN-DU-BOIS',reference:'2026-076',statut:'',archive:false}];
     D.notes=[{id:'n1',date:d,heure:'14:32',type:'Administratif',chantier_id:'c1',rubrique_id:'',
       contenu:'LR 2C19732115869 reçu le 28/09/2026.',duree:5,
       suite:{texte:'Ouvrir le dossier pour déraccordement d’autorisation',echeance:d,fait:false}}];
     vueActive='jour'; rendre();
   },J(0));

   for(const [nom,ouvre] of FENETRES){
     const r=await p.evaluate(src=>{
       try{ document.getElementById('modale').close() }catch(x){}
       try{ (new Function('return ('+src+')'))()() }catch(x){ return {err:''+x} }
       const d=document.getElementById('modale');
       if(!d || !d.open) return {absente:true};
       const pd=document.getElementById('modPied');
       const el=[...pd.children].filter(e=>e.getBoundingClientRect().width>0);
       const bo=[];
       el.forEach(e=>{
         const inner=e.matches('button')?[e]:[...e.querySelectorAll('button')];
         inner.forEach(x=>{const r=x.getBoundingClientRect();
           bo.push({t:x.textContent.trim()||'(sans libellé)',
             x:r.left,y:r.top,r:r.right,b:r.bottom})});
       });
       const chev=[];
       for(let i=0;i<bo.length;i++)for(let j=i+1;j<bo.length;j++){
         const a=bo[i],z=bo[j];
         const dx=Math.min(a.r,z.r)-Math.max(a.x,z.x), dy=Math.min(a.b,z.b)-Math.max(a.y,z.y);
         if(dx>0.5 && dy>0.5) chev.push(a.t+' × '+z.t);
       }
       const rp=pd.getBoundingClientRect();
       const hors=bo.filter(x=>x.r>rp.right+1 || x.x<rp.left-1).map(x=>x.t);
       const rm=d.getBoundingClientRect();
       return {n:bo.length, chev:chev, hors:hors,
         debordeH:pd.scrollWidth>pd.clientWidth+1,
         sortEcran:rm.right>innerWidth+1 || rm.left<-1 || rm.bottom>innerHeight+1 || rm.top<-1,
         piedCoupe:bo.length?Math.max(...bo.map(x=>x.b))>rm.bottom+1:false};
     }, ouvre.toString());

     const q=`${large?'police large':'police d’ici'} ${w}px · ${nom}`;
     if(r.err){ T(q+' : s’ouvre', false, r.err); continue }
     if(r.absente){ T(q+' : s’ouvre', false, 'fenêtre non ouverte'); continue }
     T(q+' : aucun chevauchement', r.chev.length===0, r.chev.join(' ; '));
     T(q+' : aucun bouton hors du pied', r.hors.length===0, r.hors.join(' ; '));
     T(q+' : pas de défilement horizontal', !r.debordeH);
     T(q+' : la fenêtre tient en largeur', !r.sortEcran);
     T(q+' : les boutons restent dans la fenêtre', !r.piedCoupe);
     if(r.chev.length||r.hors.length||r.debordeH||r.piedCoupe)
       await p.screenshot({path:'/tmp/pied_ko_'+(large?'L':'N')+'_'+w+'_'+nom.replace(/\W+/g,'')+'.png'});
   }
   await ctx.close();
  }
 }
 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await b.close();
 process.exit(ko.length?1:0);
})();
