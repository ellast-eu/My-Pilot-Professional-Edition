/* v1.1 — réagencer les champs d'une catégorie.
   Deux pièges, tous deux dans lireChamps() : elle écarte les lignes sans libellé, et
   elle récupère la clé interne PAR POSITION. Un déplacement mal fait ferait donc soit
   disparaître un champ en cours de saisie, soit donner à chaque champ déplacé la clé
   de son voisin — et des données rattachées au mauvais champ. */
const path=require('path');
const RACINE=path.resolve(__dirname,'..');
const APP='file://'+path.join(RACINE,'MyPilot_Pro.html');
const {chromium}=require('playwright');
const ok=[],ko=[]; const T=(n,c,d='')=>{(c?ok:ko).push(n+(d?' — '+d:''))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1280,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 p.on('dialog',d=>d.accept());
 await p.goto(APP); await p.waitForTimeout(1500);

 const ouvrir=()=>p.evaluate(()=>{
   fichierCharge=true; D=vierge(); D.parametres.categories=modeleCategories();
   const K=D.parametres.categories.find(c=>c.cle==='chantier');
   K.champs=[{cle:'a',lib:'Alpha',type:'texte',liste:'',groupe:'',col:1},
             {cle:'b',lib:'Bravo',type:'texte',liste:'',groupe:'',col:2},
             {cle:'c',lib:'Charlie',type:'texte',liste:'',groupe:'',col:3},
             {cle:'d',lib:'Delta',type:'texte',liste:'',groupe:'',col:4}];
   D=normaliser(D); vueActive='donnees'; rendre(); editerCat('chantier');
 });
 const libs=()=>p.evaluate(()=>[...document.querySelectorAll('#listeChamps [data-k="lib"]')]
   .map(e=>e.value).join(','));
 const cles=()=>p.evaluate(()=>catParCle(catEdit).champs.map(f=>f.cle+':'+f.lib).join(','));

 await ouvrir(); await p.waitForTimeout(500);
 T('la fenêtre liste les champs dans l’ordre', await libs()==='Alpha,Bravo,Charlie,Delta');
 T('chaque ligne a une poignée',
   await p.evaluate(()=>document.querySelectorAll('#listeChamps [data-chdrag]').length)===4);
 T('  et deux flèches',
   await p.evaluate(()=>document.querySelectorAll('#listeChamps [data-chmv][data-sens="-1"]').length)===4
   && await p.evaluate(()=>document.querySelectorAll('#listeChamps [data-chmv][data-sens="1"]').length)===4);
 T('la première ne peut pas monter',
   await p.evaluate(()=>document.querySelector('[data-chmv="0"][data-sens="-1"]').disabled)===true);
 T('  la dernière ne peut pas descendre',
   await p.evaluate(()=>document.querySelector('[data-chmv="3"][data-sens="1"]').disabled)===true);

 /* --- les flèches ------------------------------------------------------- */
 await p.click('[data-chmv="0"][data-sens="1"]'); await p.waitForTimeout(250);
 T('descendre Alpha d’un cran', await libs()==='Bravo,Alpha,Charlie,Delta', await libs());
 await p.click('[data-chmv="3"][data-sens="-1"]'); await p.waitForTimeout(250);
 T('monter Delta d’un cran', await libs()==='Bravo,Alpha,Delta,Charlie', await libs());

 /* LE point : la clé suit son champ, elle ne reste pas sur la position */
 T('les clés internes suivent leur champ',
   await cles()==='b:Bravo,a:Alpha,d:Delta,c:Charlie', await cles());

 /* --- une saisie en cours n'est pas perdue -------------------------------- */
 await p.fill('#listeChamps [data-ch="0"][data-k="lib"]','Bravo modifié');
 await p.click('[data-chmv="0"][data-sens="1"]'); await p.waitForTimeout(250);
 T('une saisie en cours survit au déplacement',
   (await libs()).indexOf('Bravo modifié')>=0, await libs());
 T('  et elle a bien bougé', (await libs()).split(',')[1]==='Bravo modifié', await libs());

 /* --- une ligne ajoutée et pas encore nommée ------------------------------ */
 await ouvrir(); await p.waitForTimeout(400);
 await p.click('[data-act="champ-new"]'); await p.waitForTimeout(300);
 const n5=await p.evaluate(()=>document.querySelectorAll('#listeChamps .item').length);
 T('un champ ajouté apparaît', n5===5, ''+n5);
 /* On vide son libellé : c'est le cas que lireChamps() écarterait. */
 await p.fill('#listeChamps [data-ch="4"][data-k="lib"]','');
 await p.click('[data-chmv="4"][data-sens="-1"]'); await p.waitForTimeout(250);
 const apres=await p.evaluate(()=>document.querySelectorAll('#listeChamps .item').length);
 T('une ligne SANS libellé ne disparaît pas en la déplaçant', apres===5, ''+apres);
 T('  et elle a bien changé de place',
   (await libs())==='Alpha,Bravo,Charlie,,Delta', await libs());

 /* --- le glisser-déposer -------------------------------------------------- */
 await ouvrir(); await p.waitForTimeout(400);
 /* On glisse comme un humain : on saisit la poignée, on descend (ou on monte) jusqu'au
    bord du cadre, on laisse le défilement automatique amener la cible dans la vue, puis
    on relâche dessus. C'est ce parcours-là qu'il faut éprouver : avec vingt-deux champs,
    la cible est presque toujours hors du cadre au départ. */
 const cadre=()=>p.evaluate(()=>{const z=document.getElementById('modCorps');
   const b=z.getBoundingClientRect();
   return {haut:b.top,bas:b.bottom,scroll:z.scrollTop,max:z.scrollHeight-z.clientHeight}});
 const glisser=async(de,vers)=>{
   await p.evaluate(i=>document.querySelector('[data-chdrag="'+i+'"]')
     .scrollIntoView({block:'center'}),de);
   await p.waitForTimeout(150);
   const s0=await p.locator(`[data-chdrag="${de}"]`).boundingBox();
   const x=s0.x+s0.width/2;
   await p.mouse.move(x,s0.y+s0.height/2);
   await p.mouse.down();
   const z=await cadre();
   let c=await p.locator(`[data-chrow="${vers}"]`).boundingBox();
   const versLeBas = c.y > s0.y;
   const bord = versLeBas ? z.bas-14 : z.haut+14;
   for(let y=s0.y+s0.height/2; versLeBas ? y<bord : y>bord; y += versLeBas?18:-18){
     await p.mouse.move(x,y);
   }
   await p.mouse.move(x,bord);
   await p.waitForTimeout(700);           /* le défilement fait son travail */
   c=await p.locator(`[data-chrow="${vers}"]`).boundingBox();
   const z2=await cadre();
   const cible=Math.max(z2.haut+20,Math.min(c.y+c.height/2,z2.bas-20));
   await p.mouse.move(x,cible);
   await p.waitForTimeout(120);
   await p.mouse.up();
   await p.waitForTimeout(300);
 };
 const scrollMax=(await cadre()).max;

 await glisser(0,3);
 T('glisser Alpha tout en bas', await libs()==='Bravo,Charlie,Delta,Alpha', await libs());
 T('  les clés suivent là aussi',
   await cles()==='b:Bravo,c:Charlie,d:Delta,a:Alpha', await cles());
 await glisser(3,0);
 T('  et le ramener en tête', await libs()==='Alpha,Bravo,Charlie,Delta', await libs());
 T('  la cible était bien hors du cadre : le défilement a fait le travail',
   scrollMax>0, 'défilement disponible : '+Math.round(scrollMax)+'px');

 /* --- l'ordre choisi est celui qui est enregistré, puis celui de la fiche --- */
 await ouvrir(); await p.waitForTimeout(400);
 await p.click('[data-chmv="0"][data-sens="1"]'); await p.waitForTimeout(250);
 await p.click('[data-act="champ-new"]'); await p.waitForTimeout(200);
 await p.evaluate(()=>{
   const r=document.querySelectorAll('#listeChamps .item');
   r[r.length-1].querySelector('[data-k="lib"]').value='Echo';
 });
 await p.evaluate(()=>enregistrerCat()); await p.waitForTimeout(400);
 const enr=await p.evaluate(()=>{
   const K=D.parametres.categories.find(c=>c.cle==='chantier');
   return K.champs.map(f=>f.cle+':'+f.lib).join(',');
 });
 T('l’ordre choisi est celui qui est enregistré',
   /^b:Bravo,a:Alpha,c:Charlie,d:Delta,/.test(enr), enr);
 T('  et le champ ajouté garde sa place', /,echo:Echo$/.test(enr), enr);

 const fiche=await p.evaluate(()=>{
   D.chantiers=[{id:'x',categorie:'chantier',libelle:'Essai',statut:'',archive:false}];
   D=normaliser(D); vueActive='chantiers'; rendre(); editerChantier('x');
   const l=[...document.querySelectorAll('#modCorps .champ')]
     .map(e=>e.textContent.trim().split(/\s/)[0]);
   return l.filter(x=>/Alpha|Bravo|Charlie|Delta|Echo/.test(x)).join(',');
 });
 T('la fiche suit ce même ordre', fiche==='Bravo,Alpha,Charlie,Delta,Echo', fiche);

 /* --- mise en page -------------------------------------------------------- */
 for(const [w,hh] of [[1280,1000],[390,900]]){
   await p.setViewportSize({width:w,height:hh});
   await ouvrir(); await p.waitForTimeout(400);
   const m=await p.evaluate(()=>{
     const r=document.querySelector('#listeChamps .item');
     const z=document.getElementById('modCorps');
     return {dedans:r.getBoundingClientRect().right<=z.getBoundingClientRect().right+1,
       poignee:!!r.querySelector('[data-chdrag]'),
       page:document.documentElement.scrollWidth>innerWidth+1};
   });
   T(`${w}px : la ligne tient dans la fenêtre`, m.dedans===true);
   T(`  ${w}px : la poignée est là`, m.poignee===true);
   T(`  ${w}px : pas de défilement latéral`, m.page===false);
   await p.screenshot({path:'/tmp/champs_'+w+'.png'});
 }

 T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | '));

 console.log(ok.map(s=>'  ✓ '+s).join('\n'));
 if(ko.length) console.log(ko.map(s=>'  ✗ '+s).join('\n'));
 console.log('RÉUSSIS '+ok.length+'  ÉCHECS  '+ko.length);
 await ctx.close(); await b.close();
 process.exit(ko.length?1:0);
})();
