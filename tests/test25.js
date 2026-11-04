const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 for(const [f,lbl] of [['/mnt/user-data/outputs/PST_Pilot_v3.11.4.html','3.11.4 (avant)'],
                       [path.join(RACINE,'MyPilot_Pro.html'),'3.12.0 (corrigée)']]){
  const ctx=await b.newContext({viewport:{width:1280,height:1100}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
  await p.goto('file://'+f); await p.waitForTimeout(1400);
  const r=await p.evaluate(()=>{
   fichierCharge=true;
   D.parametres.categories=modeleCategories();
   D.chantiers=[]; D.notes=[];
   // 159 activités : au-delà du plafond de 150 du sélecteur
   for(let i=0;i<158;i++) D.chantiers.push({id:'d'+String(i).padStart(3,'0'),categorie:'chantier',
     libelle:'Dossier '+i,reference:'REF-'+i,date:'2026-09-'+String(i%28+1).padStart(2,'0'),
     statut:'3 - En attente de tiers'});
   // le dossier vise est le plus ancien : il tombe au-dela du 150e au tri
   D.chantiers.push({id:'vieux',categorie:'chantier',libelle:'Dossier ancien',reference:'REF-VIEUX',
     date:'2019-01-04',statut:'3 - En attente de tiers'});
   // la note vise un dossier volontairement place en fin de tri
   D.notes=[{id:'n1',date:'2026-10-06',heure:'11:00',contenu:'Réunion convocation',
     chantier_id:'vieux',duree:60,type:'Réunion',suite:{texte:'Faire CR',echeance:'2026-10-09',fait:false}}];
   filtreLienQ=''; filtreLienCat='';
   const opts=optionsLien(lienDe(D.notes[0]));
   const present=opts.indexOf('value="c:vieux"')>=0;
   const rang=D.chantiers.length;
   // simuler l'ouverture puis l'enregistrement sans toucher au champ
   editerNote('n1');
   const sel=document.querySelector('#modCorps [name="lien"]');
   const valeurRetenue=sel?sel.value:'(pas de champ)';
   lireNote(D.notes[0]);
   return {v:APP_VERSION, total:rang, optionPresente:present, valeurRetenue,
     apresEnregistrement:D.notes[0].chantier_id||'(vide)',
     trace:D.notes[0].chantier_ref||'(aucune)'};
  });
  console.log(`--- ${lbl} v${r.v}`);
  console.log('    activités au total              :', r.total);
  console.log('    option du dossier dans la liste :', r.optionPresente);
  console.log('    valeur retenue par le champ     :', r.valeurRetenue);
  console.log('    rattachement après save         :', r.apresEnregistrement);
  console.log('    trace conservée                 :', r.trace, '| erreurs', errs.length);
  await ctx.close();
 }
 await b.close();
})();
