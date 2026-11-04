const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1100}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1400);
 const out=await p.evaluate(()=>{
  const log=[]; fichierCharge=true;
  D.parametres.categories=modeleCategories();
  D.chantiers=[
   {id:'c1',categorie:'convocation',libelle:'2026-067',reference:'2026-067',date:auj(),heure:'10:00',
    duree:60,statut:'pret',type:'Constat de mise en danger',tiers:'DPM ECHAFAUDAGES',commune:'VILLIE MORGON'},
   {id:'c2',categorie:'animation',libelle:'QHS rentrée',date:auj(),heure:'14:00',duree:90,
    statut:'pret',type:'',tiers:'Grand Lyon'}];
  D.notes=[]; vueActive='jour'; rendre();

  const btn=document.querySelector('[data-noter="c1"]');
  log.push('bouton : '+(btn?('"'+btn.textContent.trim()+'"'):'ABSENT')
    +' | ancien « Clore » : '+(document.querySelector('[data-clore]')?'encore là':'retiré'));
  btn.click();
  const ta=document.getElementById('naTxt');
  log.push('pré-remplissage : "'+ta.value+'"  curseur en '+ta.selectionStart+'/'+ta.value.length);
  log.push('temps pré-rempli : '+document.getElementById('naDuree').value+' min'
    +' | puce 60 active : '+!!document.querySelector('.puce[data-dna="60"].on'));
  const st=document.getElementById('naStatut');
  log.push('statut proposé : "'+st.value+'" (= statut actuel)');

  // refus si rien n'est écrit au-delà du motif
  [...document.querySelectorAll('#modPied button')].find(x=>x.textContent.trim()==='Enregistrer').click();
  log.push('garde-fou motif seul : '+(document.getElementById('modale').open?'refusé, fenêtre maintenue':'ACCEPTÉ'));

  ta.value='Constat de mise en danger : échafaudage sous HTA, mise hors tension demandée';
  document.getElementById('naDuree').value='75';
  st.value='prepa_cr';
  [...document.querySelectorAll('#modPied button')].find(x=>x.textContent.trim()==='Enregistrer').click();
  const n=D.notes[0];
  log.push('note : "'+n.contenu.slice(0,42)+'…" · '+n.duree+' min · rattachée à '+n.chantier_id
    +' · trace '+(n.chantier_ref||'(aucune)'));
  log.push('statut de l\'activité : '+chantierPar('c1').statut
    +' | miroir etat_affaire : '+(chantierPar('c1').etat_affaire||'(aucun)'));

  // activité sans type : le motif retombe sur la catégorie
  noterActivite('c2');
  log.push('sans type : "'+document.getElementById('naTxt').value+'" · temps '
    +document.getElementById('naDuree').value);
  fermerModale();
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
