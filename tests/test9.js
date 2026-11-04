const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1500);
 const out=await p.evaluate(()=>{
  const log=[]; fichierCharge=true;
  let mod=null; modeleCategories().forEach(x=>{ if(x.cle==='chantier') mod=x });
  D.parametres.categories[0]=mod;
  const today=auj();
  D.contacts=[]; D.organisations=[];
  D.chantiers=[
    {id:'c1',categorie:'chantier',libelle:'Poste Exemple',date:today,commune:'Violay',
     contact_nom:'Paul Exemple',contact_tel:'06 12 34 56 78'},
    {id:'c2',categorie:'chantier',libelle:'Branchement école',date:today,commune:'Violay',
     contact_nom:'Paul Exemple',contact_tel:'0612345678'},
    {id:'c3',categorie:'chantier',libelle:'Visite chantier',date:today,commune:'Lyon',
     contact_nom:'Marie Ott',contact_tel:''}];
  D.appels=[{id:'a1',date:today,heure:'09:00',qui:'EXEMPLE Paul',tel:'0612345678',objet:'point sécurité'},
            {id:'a2',date:today,heure:'10:00',qui:'Luc Meyer',tel:'0478112233',objet:'dossier'},
            {id:'a3',date:today,heure:'11:00',qui:'',tel:'',objet:'anonyme',nature:'verif'}];
  D.notes=[];

  let cand=candidatsContacts();
  log.push('candidats : '+cand.map(x=>`${x.nom||'?'}/${x.tel||'-'} ×${x.n}`).join('  |  '));
  detecterContacts();
  [...document.querySelectorAll('#modCorps input.cand')].forEach(x=>x.checked=true);
  validerCandidats(true);
  log.push('crees : '+D.contacts.map(c=>nomComplet(c)+' ['+(c.tel||'-')+']').join(', '));
  log.push('candidats restants apres creation : '+candidatsContacts().length);
  log.push('historique auto du 1er : '+historiqueDe(D.contacts[0]).length+' evenement(s)');

  // relations pour le graphe
  const [A,B,C]=D.contacts;
  A.liens=[{vers:B.id,type:'Responsable de'},{vers:C.id,type:'Partenaire de'}];
  const svg1=fragGraphe(A.id);
  log.push('graphe niv1 : noeuds='+(svg1.match(/class="grf-n/g)||[]).length
    +' aretes='+(svg1.match(/class="grf-a/g)||[]).length
    +' libelles de lien='+(svg1.match(/class="grf-t"/g)||[]).length);
  grapheNiv=2;
  C.liens=[{vers:B.id,type:'Collègue de'}];
  const svg2=fragGraphe(A.id);
  log.push('graphe niv2 : noeuds='+(svg2.match(/class="grf-n/g)||[]).length);
  grapheNiv=1;
  log.push('sans lien : '+(fragGraphe(B.id).indexOf('Aucun lien saisi')>=0?'message explicite':'??'));
  // ecarter
  D.contacts=[]; D.parametres.contacts_ecartes=[];
  detecterContacts();
  document.querySelectorAll('#modCorps input.cand')[0].checked=true;
  validerCandidats(false);
  log.push('apres ecartement : restants='+candidatsContacts().length+' ecartes='+D.parametres.contacts_ecartes.length);
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
