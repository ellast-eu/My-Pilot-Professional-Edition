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
  D.parametres.titre_compteur='Traitement en série';
  const j=n=>{const d=new Date(); d.setDate(d.getDate()-n); return iso(d)};
  D.chantiers=[]; D.notes=[]; D.appels=[]; D.compteur=[];
  for(let i=0;i<60;i++) D.chantiers.push({id:'d'+i,categorie:'chantier',libelle:'D'+i,date:'',
    date_action:j(i%25+1),statut:'3 - En attente de tiers',type:'Visite de chantier'});
  for(let i=0;i<11;i++) D.compteur.push({id:'s'+i,date:j(i*2+1),debut:'08:00',fin:'09:12',
    sessions:[{debut:'08:00',fin:'09:12'}],traites:44});
  for(let i=0;i<28;i++) D.appels.push({id:'a'+i,date:j(i%20+1),heure:'10:00',qui:'X'+i,
    tel:'06000'+i,objet:'appel',duree:12,motif:'Rappel 1'});
  const a=j(30), z=iso(new Date());
  const o=statsPeriode(a,z);
  log.push('compteur : '+o.dt.traites+' dossiers · '+dureeLisible(o.dt.temps)+' · '+o.dt.jours+' j');
  log.push('permanence : '+o.perm.appels+' appels · '+dureeLisible(o.perm.temps)+' · '+o.perm.jours+' j');
  const h=construireRapportPDF(a,z);
  log.push('titre : '+(/Nature des affaires/.test(h)?'« Nature des affaires »':'ANCIEN')
    +' | ancien libellé restant : '+/Nature des activités/.test(h));
  log.push('bloc flux : '+(/Flux traités/.test(h)?'présent':'ABSENT')
    +' | titre personnalisé repris : '+/Traitement en série<\/td>/.test(h));
  const bloc=t=>{const i=t.indexOf('class="rp-flux"'); if(i<0) return '';
    const j=t.indexOf('</table>',i); return t.slice(i,j)};
  log.push('lignes du bloc : '+(bloc(h).match(/<tr><td>/g)||[]).length);
  D.parametres.mod_compteur=false;
  const h2=construireRapportPDF(a,z); const b2=bloc(h2);
  log.push('compteur coupé → lignes='+(b2.match(/<tr><td>/g)||[]).length
    +' contient compteur='+/Traitement en série/.test(b2)+' contient permanence='+/Assistance/.test(b2));
  D.parametres.mod_permanence=false;
  const h3=construireRapportPDF(a,z);
  log.push('les deux coupés → bloc présent : '+/rp-flux/.test(h3));
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
