const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const FIX=path.join(__dirname,'fixtures');
const CFG=path.join(RACINE,'mypilot-pro-config.json');
/* 3.16.3 — lecture tolérante de la réponse de cristallisation */
const {chromium}=require('playwright'); const fs=require('fs');
const ok=[],ko=[];
const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};
const STELLA=fs.readFileSync(FIX+'/reponse-collee.txt','utf8').trim();

const DROIT={titre:"Un titre net",synthese:"Première phrase. Deuxième phrase. Troisième phrase.",
  objectifs:["Objectif un","Objectif deux"],premieres_etapes:["Étape une","Étape deux"],
  points_de_vigilance:["Prudence"],categorie:"Animation"};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.addInitScript(d=>localStorage.setItem('pst-pilot-v1',d), fs.readFileSync(FIX+'/jeu-essai.json','utf8'));
 p.on('dialog',d=>d.accept());
 await p.goto(''+APP+'');
 await p.waitForTimeout(1500);
 await p.evaluate(()=>{
   fichierCharge=true;
   /* le jeu t3.json n'a que 3 catégories : on ajoute Animation, comme dans sa vraie config */
   if(!categories().some(k=>k.lib==='Animation'))
     D.parametres.categories.push(normaliserCat({cle:'animation',lib:'Animation',
       plur:'Animations',genre:'f',sym:'~',couleur:'#4A6B2A',champ:'Thème',
       tiers:'Public',statuts:'statuts_simples',clos:'realise',champs:[]}));
   rendre();
 });

 const lire=t=>p.evaluate(x=>{
   const o=jsonDeReponse(x);
   return o?{titre:o.titre,cat:o.categorie,
     n:[(o.objectifs||[]).length,(o.premieres_etapes||[]).length,(o.points_de_vigilance||[]).length],
     syn:(o.synthese||'').length}:null;
 },t);

 /* 1. le cas réel de Stella : guillemets courbes partout */
 const r=await lire(STELLA);
 T('la réponse aux guillemets courbes est lue', !!r, r?'':'refusée');
 if(r){
   T('le titre est intact', r.titre==='Animation cyber : politique et attaque de mots de passe', r.titre);
   T('les listes sont complètes', r.n.join(',')==='3,4,3', r.n.join(','));
   T('la catégorie est lue', r.cat==='Animation', r.cat);
   T('la synthèse est entière', r.syn>300, ''+r.syn);
 }
 /* les apostrophes françaises doivent survivre telles quelles */
 const apo=await p.evaluate(x=>{
   const o=jsonDeReponse(x);
   return {syn:o.synthese, drt:(o.synthese.match(/'/g)||[]).length,
     crb:(o.synthese.match(/’/g)||[]).length};
 },STELLA);
 T('les apostrophes courbes ne sont pas transformées', apo.crb===3 && apo.drt===0,
   `${apo.crb} courbes, ${apo.drt} droites`);
 T('le texte français est intact', /L’animation présenterait/.test(apo.syn));

 /* 2. une réponse propre n'est jamais retouchée */
 const net=await lire(JSON.stringify(DROIT));
 T('une réponse droite passe', net && net.titre==='Un titre net');
 const guil=await p.evaluate(()=>{
   const o=jsonDeReponse(JSON.stringify({titre:'Il a dit "bonjour" puis il est parti',
     synthese:'x',objectifs:[],premieres_etapes:[],points_de_vigilance:[]}));
   return o?o.titre:null;
 });
 T('des guillemets droits échappés dans le texte sont préservés',
   guil==='Il a dit "bonjour" puis il est parti', guil);

 /* 3. collage de la demande ET de la réponse : c'est la réponse qui gagne */
 const invite='Réponds UNIQUEMENT avec un objet JSON valide, à ce format :\n'
   +'{"titre":"titre court, 8 mots maximum","synthese":"3 à 5 phrases","objectifs":["..."],'
   +'"premieres_etapes":["action concrète et petite"],"points_de_vigilance":["..."],'
   +'"categorie":"une valeur parmi : Dossier, Convocation, Animation, Transverse"}\n'
   +'Maximum 4 éléments par liste.\n';
 const deux=await lire(invite+STELLA);
 T('la demande collée avant la réponse n’embrouille pas',
   deux && deux.titre==='Animation cyber : politique et attaque de mots de passe',
   deux?deux.titre:'refusée');
 const deuxDroit=await lire(invite+JSON.stringify(DROIT));
 T('idem avec une réponse droite', deuxDroit && deuxDroit.titre==='Un titre net',
   deuxDroit?deuxDroit.titre:'refusée');

 /* 4. les autres salissures d'un copier-coller */
 const cas=[
   ['balises Markdown','```json\n'+JSON.stringify(DROIT)+'\n```'],
   ['phrase avant et après','Bien sûr, voici :\n'+JSON.stringify(DROIT)+'\nDis-moi si tu veux ajuster.'],
   ['virgule en trop', JSON.stringify(DROIT).replace(/\}$/,',}')],
   ['espaces insécables', JSON.stringify(DROIT).replace(/: /g,': ')],
   ['guillemets courbes + balises','```json\n'+STELLA+'\n```'],
   ['guillemets courbes + virgule en trop', STELLA.replace(/\}$/,',}')],
   ['sauts de ligne partout', JSON.stringify(DROIT,null,2)],
 ];
 for(const [nom,txt] of cas){
   const o=await lire(txt);
   T('cas lu : '+nom, !!o, 'refusé');
 }

 /* 5. ce qui doit rester refusé, avec un motif utile */
 const refus=[
   ['du texte sans JSON','je ne sais pas trop quoi répondre'],
   ['un objet tronqué','{"titre":"coupé en plein mi'],
   ['un tableau au lieu d’un objet','[1,2,3]'],
 ];
 for(const [nom,txt] of refus){
   const o=await lire(txt);
   const m=await p.evaluate(()=>dernierSoucisJson);
   T('refusé comme il faut : '+nom, o===null, 'accepté à tort');
   T('  avec un motif : '+nom, !!m && m.length>5, m||'(vide)');
 }

 /* 5 bis. la catégorie est reconnue même écrite autrement */
 await p.evaluate(()=>{ var K=normaliserCat({cle:'essai_accent',lib:'Réunion',plur:'Réunions',genre:'f',sym:'·',couleur:'#555'});
   if(!categories().some(function(c){return c.cle==='essai_accent'})) D.parametres.categories.push(K); });
 for(const [nom,val,attendu] of [
   ['exactement','Animation','animation'],
   ['au pluriel','Animations','animation'],
   ['sans majuscule','animation','animation'],
   ['avec une espace','  Animation ','animation'],
   ['sans accent','Reunion','essai_accent'],
   ['inconnue','Marketing','']]){
   const c=await p.evaluate(x=>{
     const o=jsonDeReponse(JSON.stringify({titre:'t',synthese:'s',objectifs:[],
       premieres_etapes:[],points_de_vigilance:[],categorie:x}));
     const vise=sansAccent(String(o.categorie||'')).toLowerCase().trim();
     let cat='';
     const cmp=v=>sansAccent(String(v||'')).toLowerCase().trim();
     categories().forEach(K=>{ if(!cat && (cmp(K.lib)===vise||cmp(K.plur)===vise||cmp(K.cle)===vise)) cat=K.cle });
     if(!cat) categories().forEach(K=>{const a=cmp(K.lib);
       if(!cat && a && (a.indexOf(vise)===0||vise.indexOf(a)===0)) cat=K.cle});
     return cat;
   }, val);
   T('catégorie reconnue '+nom, c===attendu, `« ${val} » → « ${c} » (attendu « ${attendu} »)`);
 }

 /* 6. le parcours complet dans l'écran, avec le texte de Stella */
 await p.evaluate(()=>{
   D.idees=[];
   [['Voir pour animation cyber sur politique de mots de passe',''],
    ['Montrer une attaque de mots de passe','']].forEach(x=>
     D.idees.push(normaliserIdee({titre:x[0],note:x[1]})));
   selIdees={}; D.idees.forEach(i=>selIdees[i.id]=true);
   vueActive='idees'; rendre();
 });
 await p.waitForTimeout(500);
 await p.click('[data-act="id-crist"]');
 await p.waitForTimeout(300);
 await p.fill('#crReponse', STELLA);
 await p.evaluate(()=>{const l=Array.from(document.querySelectorAll('#modPied button'));
   l.find(b=>/Intégrer/.test(b.textContent)).click()});
 await p.waitForTimeout(500);
 const fin=await p.evaluate(()=>{
   const u=D.idees_unifiees[0]||{};
   return {n:D.idees_unifiees.length,titre:u.titre,cat:u.cat,
     obj:(u.objectifs||[]).length,et:(u.etapes||[]).length,vig:(u.vigilance||[]).length,
     abs:D.idees.filter(i=>i.statut==='absorbee').length,
     modale:document.getElementById('modale').open,
     catLib:u.cat?catIdee(u.cat).lib:''};
 });
 T('la cristallisation aboutit', fin.n===1, ''+fin.n);
 T('le titre est repris', /Animation cyber/.test(fin.titre||''), fin.titre);
 T('la catégorie Animation est rattachée', fin.catLib==='Animation', fin.catLib);
 T('les 4 étapes sont reprises', fin.et===4, ''+fin.et);
 T('les 3 objectifs et 3 vigilances aussi', fin.obj===3 && fin.vig===3, fin.obj+'/'+fin.vig);
 T('les deux idées sont absorbées', fin.abs===2, ''+fin.abs);
 T('la fiche s’ouvre', fin.modale===true);
 const texte=await p.evaluate(()=>document.getElementById('modCorps').textContent);
 T('le texte affiché garde ses apostrophes', /L’animation/.test(texte));
 T('aucun caractère d’échappement ne traîne', !/\\u|&quot;|&#39;/.test(texte));
 await p.evaluate(()=>fermerModale());

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));
 console.log('\nRÉUSSIS '+ok.length);
 if(ko.length){ console.log('ÉCHECS  '+ko.length); ko.forEach(x=>console.log('  ✗ '+x)) }
 else console.log('ÉCHECS  0');
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
