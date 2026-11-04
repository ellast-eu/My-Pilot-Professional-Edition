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
 await p.goto(''+APP+''); await p.waitForTimeout(1500);
 const out=await p.evaluate(()=>{
  const log=[]; fichierCharge=true;
  const cas=['M PERONNET AISSAOUI','M. Dupont','Mr Martin','Monsieur Leroy','MME Girard','Mme. Rey',
             'Mlle Petit','Mx Kessler','Marc','Maxime','Max','M','M.','Mathilde','  mme   Ott  '];
  log.push('extraction :');
  cas.forEach(v=>{ const r=extraireCivilite(v);
    log.push(`   "${v}"`.padEnd(30)+` → civ="${r.civ}" reste="${r.reste}"`); });

  // creation par detection
  D.contacts=[]; D.organisations=[]; D.chantiers=[]; D.notes=[];
  const today=auj();
  D.appels=[{id:'a1',date:today,heure:'09:00',qui:'M PERONNET AISSAOUI MEHDI',tel:'0612000001',objet:'x'},
            {id:'a2',date:today,heure:'09:10',qui:'Mme Marie Ott',tel:'0612000002',objet:'y'}];
  detecterContacts();
  [...document.querySelectorAll('#modCorps input.cand')].forEach(x=>x.checked=true);
  validerCandidats(true);
  log.push('détection → '+D.contacts.map(c=>`[${c.civilite||'-'}] prénom="${c.prenom}" nom="${c.nom}"`).join('  |  '));
  log.push('affichage liste : '+D.contacts.map(nomAffiche).join(' / '));
  log.push('rapprochement inchangé : nomComplet="'+nomComplet(D.contacts[0])+'" (sans civilité)');
  log.push('historique retrouvé : '+historiqueDe(D.contacts[0]).length+' évènement(s)');

  // reprise de l'existant
  D.contacts.push(normaliserContact({id:'v1',prenom:'M.',nom:'Durand'}));
  D.contacts.push(normaliserContact({id:'v2',prenom:'Mme Sophie',nom:'Rey'}));
  D.contacts.push(normaliserContact({id:'v3',prenom:'Marc',nom:'Simon'}));
  const av=civilitesAExtraire();
  log.push('à extraire : '+av.map(x=>`${x.champ} "${x.avant}" → ${x.civ} + "${x.apres}"`).join('  |  '));
  extraireCivilites();
  [...document.querySelectorAll('#modPied button')].find(b=>/Appliquer/.test(b.textContent)).click();
  log.push('après reprise : '+D.contacts.map(c=>`[${c.civilite||'-'}]${c.prenom} ${c.nom}`).join(' / '));
  log.push('« M. Durand » (civilité seule en prénom) préservé ? '+
    (contactPar('v1').prenom==='M.'?'oui, intact':'NON — '+contactPar('v1').prenom));

  // CSV
  const csv=COLS_CT.map(x=>x[0]).join(';');
  log.push('colonnes CSV : '+csv.slice(0,60)+'…');
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
