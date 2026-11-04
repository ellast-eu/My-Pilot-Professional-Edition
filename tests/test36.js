const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
/* 3.17.0 — la permanence close dit ce qu'elle a été, pas « non enclenchée » */
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
 await p.evaluate(()=>{fichierCharge=true; D.appels=[]; perm().actif=false;
   perm().seances=[]; vueActive='jour'; rendre()});
 await p.waitForTimeout(300);

 const bloc=()=>p.evaluate(()=>{
   const e=document.querySelector('.perm-off');
   const bt=[...document.querySelectorAll('.bloc-tete')].find(x=>/Assistance/i.test(x.textContent));
   return {txt:e?e.querySelector('span').textContent:null,
     bouton:e?e.querySelector('button').textContent:null,
     badge:bt?bt.querySelector('.compte').textContent:''};
 });

 /* 1. jamais prise : le message d'origine */
 const A=await bloc();
 T('jamais prise : le message d’origine', A.txt==="Permanence non enclenchée aujourd'hui.", A.txt);
 T('le bouton invite à la prendre', A.bouton==='Prendre la permanence', A.bouton);
 T('le bandeau dit hors permanence', A.badge==='hors permanence', A.badge);

 /* 2. prise puis close dans la journée */
 await p.evaluate(()=>{
   /* on simule une journée : prise à 08:30, close à 17:12, 7 appels */
   perm().seances=[{jour:auj(),debut:'08:30',fin:'17:12'}];
   perm().actif=false;
   D.appels=[];
   for(let k=0;k<7;k++) D.appels.push({id:'a'+k,date:auj(),heure:'09:0'+k,qui:'Appelant '+k,
     objet:'',motif:'',entreprise:'',tel:'',commune:'',duree:0,suite:'',suite_faite:false});
   D.appels.push({id:'v1',date:auj(),heure:'10:00',nature:'verif',qui:'',objet:'',motif:'Rappel 1',
     entreprise:'',tel:'',commune:'',duree:0,suite:'',suite_faite:false});
   rendre();
 });
 await p.waitForTimeout(250);
 const B=await bloc();
 T('close : le message dit la plage tenue', /Permanence tenue de 08:30 à 17:12/.test(B.txt||''), B.txt);
 T('il donne la durée', /8 h 42/.test(B.txt||''), B.txt);
 T('il compte les appels', /7 appels/.test(B.txt||''), B.txt);
 T('les vérifications ne comptent pas comme appels', !/8 appels/.test(B.txt||''), B.txt);
 T('le bouton propose de reprendre', B.bouton==='Reprendre la permanence', B.bouton);
 T('le bandeau dit permanence close', B.badge==='permanence close', B.badge);
 T('le mot « non enclenchée » a disparu', !/non enclenchée/.test(B.txt||''), B.txt);

 /* 3. un seul appel : le singulier */
 await p.evaluate(()=>{D.appels=D.appels.slice(0,1); rendre()});
 await p.waitForTimeout(200);
 T('un seul appel se dit au singulier', /· 1 appel$/.test((await bloc()).txt||''), (await bloc()).txt);
 await p.evaluate(()=>{D.appels=[]; rendre()});
 await p.waitForTimeout(200);
 T('aucun appel se dit aussi', /aucun appel/.test((await bloc()).txt||''), (await bloc()).txt);

 /* 4. deux séances dans la journée */
 await p.evaluate(()=>{
   perm().seances=[{jour:auj(),debut:'08:30',fin:'12:00'},{jour:auj(),debut:'14:00',fin:'17:12'}];
   rendre();
 });
 await p.waitForTimeout(200);
 const C=await bloc();
 T('deux séances : la plage va du début à la fin', /de 08:30 à 17:12/.test(C.txt||''), C.txt);
 T('la durée exclut la coupure', /6 h 42/.test(C.txt||''), C.txt);
 T('le nombre de fois est dit', /en 2 fois/.test(C.txt||''), C.txt);

 /* 5. une séance d'hier ne compte pas aujourd'hui */
 await p.evaluate(()=>{
   const h=new Date(); h.setDate(h.getDate()-1);
   perm().seances=[{jour:iso(h),debut:'08:30',fin:'17:00'}];
   rendre();
 });
 await p.waitForTimeout(200);
 const D1=await bloc();
 T('une séance d’hier ne parle pas d’aujourd’hui',
   D1.txt==="Permanence non enclenchée aujourd'hui.", D1.txt);

 /* 6. des appels sans permanence : on le dit sans mentir */
 await p.evaluate(()=>{
   perm().seances=[];
   D.appels=[{id:'x1',date:auj(),heure:'11:00',qui:'Direct',objet:'',motif:'',entreprise:'',
     tel:'',commune:'',duree:0,suite:'',suite_faite:false}];
   rendre();
 });
 await p.waitForTimeout(200);
 const E=await bloc();
 T('appels hors permanence : le message le dit',
   /1 appel noté aujourd'hui, hors permanence\./.test(E.txt||''), E.txt);
 T('et propose de prendre la permanence', E.bouton==='Prendre la permanence', E.bouton);

 /* 7. le parcours réel : prendre puis clore */
 await p.evaluate(()=>{perm().seances=[]; perm().actif=false; D.appels=[]; rendre()});
 await p.waitForTimeout(200);
 await p.evaluate(()=>{document.querySelector('[data-act="perm-on"]').click()});
 await p.waitForTimeout(300);
 const prise=await p.evaluate(()=>({actif:perm().actif,n:seancesDu(auj()).length,
   ouverte:!!seanceOuverte(auj()),debut:(seancesDu(auj())[0]||{}).debut}));
 T('prendre la permanence ouvre une séance',
   prise.actif===true && prise.n===1 && prise.ouverte===true, JSON.stringify(prise));
 T('la séance porte son heure de début', /^\d\d:\d\d$/.test(prise.debut||''), prise.debut);
 /* on recule le début pour que la clôture ne soit pas dans la même minute */
 await p.evaluate(()=>{seancesDu(auj())[0].debut=hhmm(minutes(hNow())-95)});
 await p.evaluate(()=>{document.querySelector('[data-act="perm-off"]').click()});
 await p.waitForTimeout(350);
 const close=await p.evaluate(()=>({actif:perm().actif,n:seancesDu(auj()).length,
   ouverte:!!seanceOuverte(auj()),
   toast:(()=>{const l=document.querySelectorAll('.toast');return l.length?l[l.length-1].textContent:''})()}));
 T('clore ferme la séance', close.actif===false && close.n===1 && close.ouverte===false,
   JSON.stringify(close));
 T('le message de clôture donne la durée tenue', /1 h 35 tenue/.test(close.toast), close.toast);
 const F=await bloc();
 T('et l’écran raconte la journée', /Permanence tenue de /.test(F.txt||''), F.txt);

 /* 8. prise et close dans la même minute : fausse manœuvre, pas de séance */
 await p.evaluate(()=>{perm().seances=[]; perm().actif=false; rendre()});
 await p.waitForTimeout(200);
 await p.evaluate(()=>{document.querySelector('[data-act="perm-on"]').click()});
 await p.waitForTimeout(250);
 await p.evaluate(()=>{document.querySelector('[data-act="perm-off"]').click()});
 await p.waitForTimeout(300);
 const faux=await bloc();
 T('une fausse manœuvre ne laisse pas de trace',
   (await p.evaluate(()=>seancesDu(auj()).length))===0,
   ''+(await p.evaluate(()=>seancesDu(auj()).length)));
 T('et le message redevient celui d’origine',
   faux.txt==="Permanence non enclenchée aujourd'hui.", faux.txt);

 /* 9. reprendre après clôture rouvre une seconde séance */
 await p.evaluate(()=>{
   perm().seances=[{jour:auj(),debut:'08:30',fin:'12:00'}]; perm().actif=false; rendre();
 });
 await p.waitForTimeout(200);
 await p.evaluate(()=>{document.querySelector('[data-act="perm-on"]').click()});
 await p.waitForTimeout(300);
 T('reprendre ouvre une seconde séance',
   (await p.evaluate(()=>seancesDu(auj()).length))===2);
 T('la première reste fermée',
   (await p.evaluate(()=>seancesDu(auj())[0].fin))==='12:00');

 /* 10. persistance et compatibilité */
 const cycle=await p.evaluate(()=>{
   const o=JSON.parse(serialise('json'));
   const v=normaliser(o);
   return {n:(v.permanence.seances||[]).length, forme:v.permanence.seances[0]};
 });
 T('les séances survivent au cycle fichier', cycle.n===2, ''+cycle.n);
 T('leur forme est bien normalisée',
   cycle.forme && cycle.forme.jour && cycle.forme.debut!==undefined, JSON.stringify(cycle.forme));
 const vieux=await p.evaluate(()=>{
   const o=JSON.parse(serialise('json'));
   delete o.permanence.seances;
   return (normaliser(o).permanence.seances||[]).length;
 });
 T('un fichier antérieur se charge sans séances', vieux===0, ''+vieux);
 const sale=await p.evaluate(()=>{
   const o=JSON.parse(serialise('json'));
   o.permanence.seances=[{jour:'pas une date',debut:'08:00'},{jour:auj()},
     {jour:auj(),debut:'09:00',fin:'10:00'},'nimporte quoi'];
   const v=normaliser(o);
   return v.permanence.seances.length;
 });
 T('des séances abîmées sont écartées', sale===1, ''+sale);

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));
 console.log('\nRÉUSSIS '+ok.length);
 if(ko.length){ console.log('ÉCHECS  '+ko.length); ko.forEach(x=>console.log('  ✗ '+x)) }
 else console.log('ÉCHECS  0');
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
