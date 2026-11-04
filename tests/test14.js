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
  D.organisations=[normaliserOrg({id:'o1',nom:'SARL Exemple TP'}),
                   normaliserOrg({id:'o2',nom:'Agence Loire',interne:true})];
  D.contacts=[normaliserContact({id:'k0',prenom:'M PERONNET AISSAOUI',nom:'MEHDI'}),
              normaliserContact({id:'k1',prenom:'Paul',nom:'Exemple',org_id:'o1',fonction:'Conducteur'}),
              normaliserContact({id:'k2',prenom:'Marie',nom:'Ott'})];
  // ancien format : lien sans « cible », doit rester un contact
  D.contacts[0].liens=[{vers:'k1',type:'Interlocuteur privilégié de'}];
  D.contacts=D.contacts.map(normaliserContact);
  log.push('lien hérité sans cible → '+D.contacts[0].liens[0].cible+' ('+nomCible(D.contacts[0].liens[0])+')');

  // ajout d'un lien vers une organisation
  D.contacts[0].liens.push({vers:'o1',cible:'org',type:'Partenaire de'});
  D.contacts[0].liens.push({vers:'o2',cible:'org',type:'Rattaché à'});
  const r=reseauDe('k0');
  log.push('réseau de k0 : '+r.map(x=>(x.org?'[ORG] ':'')+ (x.org?x.contact.nom:nomComplet(x.contact))+' — '+x.type).join('  |  '));

  // le selecteur propose les deux familles
  const fl=fragLiens(D.contacts[0]);
  log.push('sélecteur : optgroups='+(fl.match(/<optgroup/g)||[]).length
    +' | option org sélectionnée='+(/value="o:o1" selected/.test(fl)?'OK':'NON')
    +' | bouton ouvrir org='+((fl.match(/data-org-go/g)||[]).length));

  // graphe : formes distinctes
  grapheNiv=1;
  const g=fragGraphe('k0');
  log.push('graphe : ronds='+(g.match(/<circle class="grf-n/g)||[]).length
    +' carrés='+(g.match(/<rect class="grf-n org/g)||[]).length
    +' | légende='+(g.indexOf('personne')>=0&&g.indexOf('organisation')>=0?'présente':'absente'));

  // cote organisation
  log.push('liesAOrg(o1) : '+liesAOrg('o1').map(x=>nomComplet(x.c)+' ('+x.type+')').join(', '));

  // relecture du formulaire : bascule contact -> organisation
  editerContact('k0');
  const sel=document.querySelectorAll('#listeLiens select[data-k="ref"]')[0];
  sel.value='o:o2';
  lireLiens(contactPar('k0'));
  const l0=contactPar('k0').liens[0];
  log.push('après bascule du 1er lien : cible='+l0.cible+' vers='+l0.vers+' → '+nomCible(l0));
  fermerModale();

  // suppression d'une organisation : les liens qui la visent disparaissent
  window.confirm=()=>true;
  editerOrg('o2');
  [...document.querySelectorAll('#modPied button')].find(b=>b.textContent.trim()==='Supprimer').click();
  fermerModale();
  log.push('après suppression de o2 : liens restants='
    +contactPar('k0').liens.map(x=>x.cible+':'+nomCible(x)).join(', '));
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
