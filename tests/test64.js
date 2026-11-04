/* test64 — la rangée d'onglets tient sur un écran en portrait, et l'on voit où l'on est.
 *
 * Trois défauts tenaient ensemble, et deux d'entre eux étaient invisibles au code :
 *
 *  1. la rangée demandait 1188 px. Sur un écran en portrait (1080 de large, courant
 *     sur un poste de travail) le dernier onglet était coupé ;
 *  2. le liseré de l'onglet actif était rouge, posé sur le liseré rouge du bandeau,
 *     et de surcroît poussé hors de la boîte par « margin-bottom:-3px » — que
 *     « overflow-x:auto » découpe. Deux raisons cumulées de ne rien voir ;
 *  3. deux réglages de largeur étaient écrits AVANT la règle de base « nav button » :
 *     à spécificité égale la dernière l'emporte, ils ne s'appliquaient jamais.
 *
 * Ce banc mesure, il ne lit pas le code : ce qui compte est ce qui se voit.
 */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const {chromium}=require('playwright'); const fs=require('fs');

let ok=0, ko=0;
function T(nom,cond,det){ if(cond){ok++;console.log('  ok   '+nom)}
  else{ko++;console.log('  ECHEC '+nom+(det!==undefined?'  ['+det+']':''))} }

/* Deux couleurs CSS sont-elles distinguables ? On compare le contraste WCAG : en
   dessous de 1.3 l'oeil ne separe pas deux aplats adjacents. */
function lum(c){
  const m=c.match(/\d+(\.\d+)?/g).slice(0,3).map(Number).map(v=>{
    v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  });
  return 0.2126*m[0]+0.7152*m[1]+0.0722*m[2];
}
function contraste(a,b){ const x=lum(a),y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05) }

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 async function ouvrir(w){
   const ctx=await b.newContext({viewport:{width:w,height:800}});
   const p=await ctx.newPage();
   await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d),
     fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
   await p.goto(APP); await p.waitForTimeout(1500);
   await p.evaluate(()=>{ fichierCharge=true; vueActive='calendrier'; rendre() });
   await p.waitForTimeout(300);
   return {p,ctx};
 }

 /* --- 1. la rangée tient sur un écran en portrait -------------------------- */
 console.log('\n— la rangée tient —');
 for(const w of [1080,1024]){
   const {p,ctx}=await ouvrir(w);
   const m=await p.evaluate(()=>{
     const n=document.getElementById('nav');
     return {s:n.scrollWidth,c:n.clientWidth,
       dernier:[...n.querySelectorAll('button')].pop().textContent.trim()};
   });
   T('à '+w+' px la rangée ne déborde pas', m.s<=m.c, m.s+' / '+m.c);
   T('  le dernier onglet est Rapport, et il est entier',
     m.dernier==='Rapport' && m.s<=m.c, m.dernier);
   await ctx.close();
 }

 /* --- 2. Options a quitté la rangée pour le bandeau ------------------------ */
 console.log('\n— Options est dans le bandeau —');
 {
   const {p,ctx}=await ouvrir(1280);
   const r=await p.evaluate(()=>{
     const b=document.getElementById('btnOptions');
     const freres=[...b.parentNode.children].map(x=>x.id);
     return {present:!!b, vue:b.dataset.vue, texte:b.textContent.trim(), freres:freres.join(',')};
   });
   T('le bouton Options existe dans le bandeau', r.present && r.texte==='Options', r.texte);
   T('  il mène à la même vue qu’avant', r.vue==='donnees', r.vue);
   T('  il est entre Aide et Accompagnement',
     /btnAide,btnOptions,btnAccomp/.test(r.freres), r.freres);
   T('  il n’est plus dans la rangée',
     await p.evaluate(()=>![...document.querySelectorAll('#nav button')]
       .some(x=>x.dataset.vue==='donnees')));

   /* Un clic, pas un appel de fonction : c'est le cablage qu'on verifie. */
   await p.click('#btnOptions'); await p.waitForTimeout(400);
   T('  un clic y mène vraiment', await p.evaluate(()=>vueActive==='donnees'));
   T('  et le bouton dit qu’on y est',
     await p.evaluate(()=>document.getElementById('btnOptions').getAttribute('aria-current')==='true'));
   await p.evaluate(()=>{ vueActive='jour'; rendre() }); await p.waitForTimeout(300);
   T('  puis qu’on n’y est plus',
     await p.evaluate(()=>document.getElementById('btnOptions').getAttribute('aria-current')==='false'));
   await ctx.close();
 }

 /* --- 3. Options reste joignable sans fichier lié -------------------------- */
 /* C'etait la raison d'etre de l'exception « sauf donnees » dans le blocage de la
    rangee. Options ayant demenage, l'exception a disparu : il faut donc prouver que
    la porte est restee ouverte, sans quoi un poste sans fichier serait sans issue. */
 console.log('\n— sans fichier lié, la porte reste ouverte —');
 {
   const ctx=await b.newContext({viewport:{width:1280,height:800}});
   const p=await ctx.newPage();
   await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d),
     fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
   await p.goto(APP); await p.waitForTimeout(1500);
   const r=await p.evaluate(()=>({
     charge:fichierCharge,
     optionsBloque:document.getElementById('btnOptions').disabled,
     navBloquee:[...document.querySelectorAll('#nav button')].every(x=>x.disabled)
   }));
   T('aucun fichier n’est lié au démarrage', r.charge===false, r.charge);
   T('  la rangée entière est fermée', r.navBloquee);
   T('  mais Options reste cliquable', r.optionsBloque===false);
   await ctx.close();
 }

 /* --- 4. on voit où l'on est ----------------------------------------------- */
 console.log('\n— le liseré de l’onglet actif —');
 {
   const {p,ctx}=await ouvrir(1280);
   const r=await p.evaluate(()=>{
     const n=document.getElementById('nav'), a=n.querySelector('[aria-current="true"]');
     const c=getComputedStyle(a), h=getComputedStyle(document.querySelector('header'));
     return {
       actif:a.textContent.trim(),
       couleur:c.borderBottomColor, epaisseur:parseFloat(c.borderBottomWidth),
       liserHeader:h.borderBottomColor,
       basBouton:a.getBoundingClientRect().bottom,
       basNav:n.getBoundingClientRect().bottom,
       decoupe:getComputedStyle(n).overflowY
     };
   });
   T('l’onglet actif est bien celui de la vue', r.actif==='Calendrier', r.actif);
   T('  son liseré fait 3 px', r.epaisseur===3, r.epaisseur);
   /* Le defaut exact : meme couleur que le trait du bandeau, donc rien a voir. */
   T('  il se distingue du trait rouge du bandeau',
     contraste(r.couleur,r.liserHeader)>=1.3,
     r.couleur+' vs '+r.liserHeader+' = '+contraste(r.couleur,r.liserHeader).toFixed(2));
   /* L'autre defaut : la boite du nav est decoupee, un liseré qui en sort est perdu. */
   T('  il ne sort pas de la boîte que le navigateur découpe',
     r.basBouton<=r.basNav+0.5, 'bouton '+r.basBouton.toFixed(1)+' / nav '+r.basNav.toFixed(1)
       +' (overflow-y '+r.decoupe+')');
   await ctx.close();
 }

 /* --- 5. les réglages de largeur s'appliquent enfin ------------------------ */
 /* Ecrits avant la regle qu'ils devaient corriger, ils etaient lettre morte. On ne
    relit pas la feuille de style : on mesure un bouton a trois largeurs. */
 console.log('\n— la rangée se resserre vraiment —');
 {
   const larg=[];
   for(const w of [1440,1080,600]){
     const {p,ctx}=await ouvrir(w);
     larg.push(await p.evaluate(()=>{
       const b=document.querySelector('#nav button'), c=getComputedStyle(b);
       return {pad:parseFloat(c.paddingLeft), police:parseFloat(c.fontSize),
         total:document.getElementById('nav').scrollWidth};
     }));
     await ctx.close();
   }
   T('sous 1180 px les onglets se resserrent',
     larg[1].pad<larg[0].pad, larg[0].pad+' → '+larg[1].pad);
   T('  et la rangée y gagne de la place',
     larg[1].total<larg[0].total, larg[0].total+' → '+larg[1].total);
   T('sous 640 px la police diminue aussi',
     larg[2].police<larg[0].police, larg[0].police+' → '+larg[2].police);
 }

 await b.close();
 console.log('RÉUSSIS '+ok+'  ÉCHECS  '+ko);
 process.exit(ko?1:0);
})();
