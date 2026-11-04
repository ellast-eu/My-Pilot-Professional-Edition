const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 for(const [f,lbl,out] of [[path.join(RACINE,'MyPilot_Pro.html'),'charge lourde','lourd.pdf'],
                           [path.join(RACINE,'MyPilot_Pro.html'),'3.11.1 (corrigée)','ap.pdf']]){
  const ctx=await b.newContext({viewport:{width:900,height:1200}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
  await p.goto('file://'+f); await p.waitForTimeout(1400);
  await p.evaluate(()=>{
   fichierCharge=true;
   D.parametres.categories=modeleCategories();
   ['alpha','beta'].forEach((k,i)=>{ const m=normaliserCat({cle:k,lib:'Catégorie '+k,
     plur:'Catégories '+k,statuts:'statuts_simples',clos:'realise'}); D.parametres.categories.push(m) });
   D.parametres.id_nom='Testeuse Exemple'; D.parametres.id_fonction='Prévention';
   D.parametres.id_entite='Service régional'; D.parametres.titre_compteur='Compteur de traitement';
   const j=n=>{const d=new Date(); d.setDate(d.getDate()-n); return iso(d)};
   D.chantiers=[]; D.notes=[]; D.appels=[]; D.compteur=[];
   // dix rubriques, comme chez Stella
   const rub=['Traitement en série','Activités du planning','Permanence téléphonique'];
   for(let k=0;k<17;k++) rub.push('Rubrique de travail supplémentaire numéro '+(k+1));
   D.parametres.rubriques=rub.map((n,i)=>({id:'r'+i,nom:n,famille:'support',
     auto:i===0?'compteur':(i===2?'appels':'')}));
   const ea=['1 - À instruire','2 - Instruction en cours','1.1 - Demande MHT',
             '3 - En attente de tiers','3 - Visite Sécurité après 6 mois','7.1 - Déraccordement DRI'];
   for(let i=0;i<340;i++) D.chantiers.push({id:'d'+i,categorie:'chantier',libelle:'Dossier '+i,
     date:'',date_action:j((i*0.9|0)+1),statut:ea[i%ea.length],type:'Visite de chantier',commune:'Violay'});
   for(let i=0;i<60;i++) D.chantiers.push({id:'c'+i,categorie:'convocation',libelle:'Convocation '+i,
     date:j(i*5+2),statut:['termine','a_preparer','pret','annule'][i%4],tiers:'Ent '+(i%6)});
   for(let i=0;i<3;i++) D.chantiers.push({id:'an'+i,categorie:'animation',libelle:'QHS '+i,
     date:j(i*20+3),statut:'pret',tiers:'Grand Lyon',participants:15});
   for(let i=0;i<5;i++) D.chantiers.push({id:'t'+i,categorie:'transverse',libelle:'Transverse '+i,
     date:j(i*12+2),statut:'realise'});
   ['alpha','beta'].forEach(k=>{ for(let i=0;i<9;i++) D.chantiers.push({id:k+i,categorie:k,
     libelle:'Fiche '+k+' '+i,date:j(i*9+2),statut:['realise','planifie','en_cours','reporte'][i%4]}) });
   for(let i=0;i<21;i++) D.compteur.push({id:'s'+i,date:j(i*4+1),
     sessions:[{debut:'08:00',fin:'09:15'}],traites:43});
   for(let i=0;i<220;i++) D.appels.push({id:'ap'+i,date:j((i*2)%110+1),heure:'10:00',qui:'X'+i,
     tel:'06000'+i,entreprise:'Ent '+(i%9),motif:['Rappel 1','Rappel 2','Renseignement','Plainte'][i%4],
     objet:'appel',duree:11,commune:'Lyon'});
   for(let i=0;i<600;i++) D.notes.push({id:'n'+i,date:j((i)%118+1),heure:'09:00',contenu:'note '+i,
     rubrique_id:'r'+(3+i%8),duree:12,type:'suivi'});
   perDeb=j(120); perFin=iso(new Date());
   document.getElementById('impression').innerHTML=construireRapportPDF(perDeb,perFin);
   document.getElementById('impression').style.display='block';
   document.getElementById('impression').style.width='174mm';
  });
  await p.waitForTimeout(500);
  const hh=await p.evaluate(()=>{const px=v=>Math.round(v/(96/25.4));
    return [...document.querySelectorAll('#impression .rp-page')].map((e,i)=>px(e.getBoundingClientRect().height))});
  console.log('   hauteurs logiques (mm, max 267) :', hh.join(' / '));
  await p.pdf({path:out,format:'A4',printBackground:true,
    margin:{top:'16mm',bottom:'14mm',left:'18mm',right:'18mm'}});
  const n=fs.readFileSync(out).toString('latin1');
  const pages=(n.match(/\/Type\s*\/Page[^s]/g)||[]).length;
  console.log(`${lbl.padEnd(18)} → ${pages} page(s) PDF`);
  console.log('   erreurs JS :', errs.length);
  await ctx.close();
 }
 await b.close();
})();
