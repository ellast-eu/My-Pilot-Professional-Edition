const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 for(const [f,lbl] of [['/mnt/user-data/outputs/PST_Pilot_v3.7.1.html','3.7.1 (avant)'],
                       [path.join(RACINE,'MyPilot_Pro.html'),'3.7.2 (corrigee)']]){
  const ctx=await b.newContext({viewport:{width:900,height:1200}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
  await p.goto('file://'+f); await p.waitForTimeout(1400);
  const r=await p.evaluate(()=>{
    fichierCharge=true;
    D.parametres.categories=modeleCategories();
    const j=n=>{const d=new Date(); d.setDate(d.getDate()-n); return iso(d)};
    D.chantiers=[];
    const add=(cat,st,n)=>{for(let i=0;i<n;i++) D.chantiers.push(
      {id:cat+st+i,categorie:cat,libelle:cat+' '+i,date:j(i+1),statut:st,commune:'Violay'})};
    add('chantier','7.1 - Déraccordement DRI',1); add('chantier','3 - Visite Sécurité après 6 mois',1);
    add('chantier','1.1 - Demande MHT',1);
    add('convocation','termine',2); add('convocation','prepa_cr',1); add('convocation','annule',1);
    add('transverse','realise',2); add('transverse','planifie',1);
    add('animation','termine',3);                 // un seul statut : c'est le cas de Stella
    const o=statsPeriode(j(60),iso(new Date()));
    const h=rpStatutsDetail(o);
    return {v:APP_VERSION,
      avanc:o.avanc.map(x=>x.lib+'('+x.n+', '+x.st.length+' statut'+(x.st.length>1?'s':'')+')'),
      animDansDetail:/Animations/.test(h),
      cats:(h.match(/<tr class="tete"><td><b>([^<]+)/g)||[]).map(x=>x.replace(/.*<b>/,''))};
  });
  console.log(`--- ${lbl} v${r.v}`);
  console.log('    avancement :', r.avanc.join('  '));
  console.log('    détaillées :', r.cats.join(', ')||'(aucune)');
  console.log('    Animation présente :', r.animDansDetail, '| erreurs', errs.length);
  await ctx.close();
 }
 await b.close();
})();
