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
  D.parametres.categories=modeleCategories();
  log.push('nature du tiers par categorie : '+categories().map(K=>K.lib+'='+K.tiers_type).join('  '));
  const today=auj();
  D.contacts=[]; D.organisations=[]; D.notes=[];
  D.chantiers=[
    {id:'c1',categorie:'convocation',libelle:'Convocation TP',date:today,commune:'Violay',
     tiers:'SARL Exemple TP',contact_nom:'Paul Exemple',contact_tel:'0612345678'},
    {id:'c2',categorie:'convocation',libelle:'Relance TP',date:today,commune:'Violay',
     tiers:'EXEMPLE TP',contact_nom:'Paul Exemple',contact_tel:'0612345678'},
    {id:'c3',categorie:'animation',libelle:'QHS rentrée',date:today,commune:'Lyon',
     tiers:'Eiffage Énergie',contact_nom:'Marie Ott',contact_tel:'0478990011'},
    {id:'c4',categorie:'chantier',libelle:'Dossier rue X',date:today,commune:'Lyon',
     tiers:'Mme Durand',contact_nom:'',contact_tel:''}];
  D.appels=[{id:'a1',date:today,heure:'09:00',qui:'Paul Exemple',tel:'0612345678',
             entreprise:'Exemple TP',objet:'point sécurité',commune:'Violay'},
            {id:'a2',date:today,heure:'10:00',qui:'Luc Meyer',tel:'0478112233',
             entreprise:'SAS Sogea',objet:'dossier',commune:'Lyon'},
            {id:'a3',date:today,heure:'11:00',qui:'x',tel:'',entreprise:'IGNORE',nature:'verif'}];

  let co=candidatsOrgs();
  log.push('organisations detectees : '+co.map(x=>`${x.nom} ×${x.n} [${Object.keys(x.sources).join('+')}]${x.commune?' @'+x.commune:''}`).join('  |  '));
  log.push('« Mme Durand » (categorie mixte) proposee ? '+(co.some(x=>/durand/i.test(x.nom))?'OUI':'non'));
  log.push('« IGNORE » (appel de verif) proposee ? '+(co.some(x=>/ignore/i.test(x.nom))?'OUI':'non'));

  detecterOrgs();
  [...document.querySelectorAll('#modCorps input.corg')].forEach(x=>x.checked=true);
  validerCandidatsOrg(true);
  log.push('creees : '+D.organisations.map(o=>o.nom+(o.commune?' ('+o.commune+')':'')).join(', '));

  // puis les contacts : ils doivent heriter de leur organisation
  detecterContacts();
  [...document.querySelectorAll('#modCorps input.cand')].forEach(x=>x.checked=true);
  validerCandidats(true);
  log.push('contacts : '+D.contacts.map(c=>nomComplet(c)+' → '+(nomOrg(c.org_id)||'(sans org)')).join('  |  '));
  log.push('candidats orgs restants : '+candidatsOrgs().length+' | contacts restants : '+candidatsContacts().length);

  // categorie declaree « personne » : son tiers ne doit plus remonter
  D.organisations=[]; D.parametres.orgs_ecartees=[];
  catParCle('convocation').tiers_type='personne';
  log.push('convocation passee en « personne » : '+candidatsOrgs().map(x=>x.nom).join(', '));
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
