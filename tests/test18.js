const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:900,height:1200}}); const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 await p.goto(''+APP+''); await p.waitForTimeout(1400);
 const out=await p.evaluate(()=>{
  const log=[]; fichierCharge=true;
  D.parametres.categories=modeleCategories();
  const j=n=>{const d=new Date(); d.setDate(d.getDate()-n); return iso(d)};
  D.chantiers=[]; D.notes=[];
  // actifs : derniere action recente
  for(let i=0;i<40;i++) D.chantiers.push({id:'a'+i,categorie:'chantier',libelle:'Actif '+i,date:'',
    date_action:j(i*4+1),statut:'3 - En attente de tiers',commune:'Violay'});
  // dormants : derniere action il y a plus de deux ans, aucune note
  for(let i=0;i<50;i++) D.chantiers.push({id:'z'+i,categorie:'chantier',libelle:'Dormant '+i,date:'',
    date_action:'2023-03-1'+(i%9),statut:'1.1 - Demande MHT',commune:'Roanne'});
  // sans aucune date, mais avec une note recente
  for(let i=0;i<8;i++){ D.chantiers.push({id:'n'+i,categorie:'chantier',libelle:'Par note '+i,date:'',
      date_action:'',statut:'3 - Visite Sécurité après 6 mois',commune:'Lyon'});
    D.notes.push({id:'nt'+i,date:j(i*10+2),heure:'09:00',contenu:'visite',chantier_id:'n'+i,duree:45,type:'suivi'}); }
  for(let i=0;i<6;i++) D.chantiers.push({id:'c'+i,categorie:'convocation',libelle:'Convoc '+i,
    date:j(i*9+2),statut:'termine',commune:'Lyon'});
  for(let i=0;i<4;i++) D.chantiers.push({id:'an'+i,categorie:'animation',libelle:'QHS '+i,
    date:j(i*15+3),statut:'termine',commune:'Tarare'});

  const o=statsPeriode(j(180),iso(new Date()));
  log.push('retenus : '+o.acts.length+' / '+D.chantiers.length+' fiches');
  log.push('   dont par date planifiée='+o.parDate+'  par dernière action='+o.parAction+'  par note='+o.parNote);
  log.push('   dormants écartés : '+(D.chantiers.filter(c=>c.id[0]==='z').length
    -o.acts.filter(c=>c.id[0]==='z').length)+' / 50');
  log.push('   par catégorie : '+o.parCat.map(x=>x[0]+' '+x[1]).join(', '));
  log.push('   Animation présente : '+(o.parCat.some(x=>/Animation/.test(x[0]))?'oui':'NON'));
  log.push('   courbe mensuelle : '+o.mois.map(m=>m.lib+':'+m.n).join(' ')+'  (total '+o.mois.reduce((s,m)=>s+m.n,0)+')');
  const det=rpStatutsDetail(o);
  log.push('   détail par catégorie : '+(det.match(/<tr class="tete"><td><b>([^<]+)/g)||[]).map(x=>x.replace(/.*<b>/,'')).join(', '));
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
