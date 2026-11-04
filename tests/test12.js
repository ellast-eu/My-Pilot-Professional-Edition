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
  const j=n=>{const d=new Date(); d.setDate(d.getDate()+n); return iso(d)};
  D.chantiers=[]; D.contacts=[]; D.organisations=[];
  const mk=(id,ech,txt)=>({id:id,date:j(-3),heure:'09:00',contenu:txt,chantier_id:'',
    suite:{texte:txt,echeance:ech,fait:false}});
  D.notes=[mk('n1',j(-5),'relance en retard'), mk('n2',j(-1),'hier'), mk('n3',j(0),'aujourd hui'),
           mk('n4',j(1),'demain'), mk('n5',j(6),'dans 6 j'), mk('n6',j(20),'dans 20 j'),
           mk('n7','','sans echeance'), mk('n8','','sans echeance 2')];
  log.push('total ouvert : '+suitesOuvertes().length+' (dont 2 sans échéance)');
  log.push('compteur du jour : '+suitesDuJour().length+'  (retard + hier + aujourd’hui)');
  [[-1,"Aujourd’hui"],[7,"1 sem."],[30,"1 mois"],[0,"Tout"]].forEach(([h,lbl])=>{
    horizonAttente=h;
    const l=suitesHorizon();
    log.push(`  ${lbl.padEnd(12)} → ${String(l.length).padStart(2)} : ${l.map(n=>n.suite.texte).join(', ')}`);
  });
  horizonAttente=-1;
  const f=fragAttente();
  log.push('bouton avec compteur : '+(/Aujourd’hui <b>3<\/b>/.test(f)?'OK':'ABSENT'));
  D.notes=D.notes.filter(n=>!n.suite.echeance);
  log.push('aucune échéance du jour : '+(fragAttente().indexOf('Rien à échéance aujourd’hui')>=0?'message dédié OK':'PROBLEME'));
  horizonAttente=7;
  return log;
 });
 out.forEach(l=>console.log(l));
 console.log('erreurs JS :', errs.length, errs.slice(0,2));
 await ctx.close(); await b.close();
})();
