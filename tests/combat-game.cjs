/* Actual browser test: outfitted 3D ninja, playable AI fight and input. */
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:414,height:896},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8000/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.getElementById('loading')?.classList.contains('hidden'),null,{timeout:80000});
 const atBoot=await page.evaluate(()=>{
  const g=document.getElementById('game').dataset;
  return {model:g.character,uniform:g.uniformStyle,clothMeshes:+g.uniformClothMeshes,shirt:+g.uniformShirtTriangles,
    accessories:+g.uniformAccessories,shorts:+g.uniformShortsTriangles,drape:+g.uniformDrape,pockets:+g.uniformPockets,crest:g.uniformCrest,clips:g.combatClips,engine:g.combatEngine,
    hairFlow:g.hairFlow,hairLocks:+g.hairFlowLocks,enemyModel:g.enemyModel};
 });
 console.log('COMBAT MODEL',JSON.stringify(atBoot));
 if(atBoot.model!=='clean-head-v5')throw Error('Original skinned ninja failed to load');
 if(atBoot.uniform!=='v5-seamless-tailoring-v3'||atBoot.clothMeshes<5||atBoot.shirt<200||atBoot.shorts<300||atBoot.drape<100||atBoot.pockets!==2||atBoot.crest!=='UchihaFanBackCrest'||atBoot.accessories<25)
   throw Error('3D outfit missing/failed to skin: '+JSON.stringify(atBoot));
 if(atBoot.hairFlow!=='source-sculpt-swept-v2'||atBoot.hairLocks!==1||atBoot.enemyModel!=='skinned-rival-44')throw Error('Hair refinement did not attach to head bone: '+JSON.stringify(atBoot));
 if(atBoot.clips!=='Ready,Light,Cross,Heavy,Kick,Sweep,Guard,Dodge,Slip,Parry,Hit'||atBoot.engine!=='arena-v1')
   throw Error('Combat clips or game engine missing');
 await page.locator('#startGame').click();
 await page.waitForFunction(()=>document.querySelector('#combatHUD')?.hidden===false);
 const start=await page.evaluate(()=>({
  health:Number(document.getElementById('game').dataset.combatHealth),
  enemy:Number(document.getElementById('game').dataset.combatEnemyHealth),
  round:document.getElementById('game').dataset.combatRound
 }));
 console.log('FIGHT START',JSON.stringify(start));
 if(start.health!==100||start.enemy!==85||start.round!=='1')throw Error('Match state did not start correctly');
 await page.screenshot({path:'urban-combat-outfit-mobile.png'});
 // Approach opponent in facing direction; check real timed hit/damage.
 await page.keyboard.down('w');
 await page.waitForFunction(()=>Number(document.getElementById('game')?.dataset.combatEnemyDistance)<3.4,null,{timeout:7500});
 await page.keyboard.up('w');
 console.log('FIGHT APPROACH',JSON.stringify(await page.locator('#game').evaluate(el=>({...el.dataset}))));
 for(let attempt=0;attempt<5;attempt++){
  await page.locator('#attackLight').dispatchEvent('pointerdown',{pointerType:'touch'});
  await page.waitForTimeout(980);
  const hp=Number(await page.locator('#game').getAttribute('data-combat-enemy-health'));
  console.log('ATTACK RESULT',attempt,hp,JSON.stringify(await page.locator('#game').evaluate(el=>({action:el.dataset.combatLastAction,started:el.dataset.combatAttacksStarted,hits:el.dataset.combatHits,dist:el.dataset.combatEnemyDistance,player:el.dataset.combatPlayerPosition,enemy:el.dataset.combatEnemyPosition,message:el.dataset.combatMessage,anim:el.dataset.animation}))));
  if(hp<start.enemy)break;
  if(attempt<4 && Number(await page.locator('#game').getAttribute('data-combat-enemy-distance'))>3.8){await page.keyboard.down('w');await page.waitForTimeout(140);await page.keyboard.up('w');}
 }
 const enemyHP=Number(await page.locator('#game').getAttribute('data-combat-enemy-health'));
 if(!(enemyHP<start.enemy))throw Error('Attack input did not deal any real damage to opponent');
 await page.screenshot({path:'urban-combat-hit.png'});
 // Rapid repeated strikes must QUEUE fluid follow-ups, not disappear mid-swing.
 const beforeChains=Number(await page.locator('#game').getAttribute('data-combat-attacks-started'));
 await page.locator('#attackLight').dispatchEvent('pointerdown',{pointerType:'touch'});
 await page.waitForTimeout(85);
 await page.locator('#attackLight').dispatchEvent('pointerdown',{pointerType:'touch'});
 await page.waitForFunction(before=>Number(document.getElementById('game')?.dataset.combatAttacksStarted)>=before+2,
   beforeChains,{timeout:8000});
 const chainHistory=await page.locator('#game').getAttribute('data-combat-chain-history');
 if(!chainHistory.includes('Cross'))
   throw new Error('Rapid jab-to-cross did not alternate attack animation: '+chainHistory);
 console.log('FLUID COMBO VERIFIED',chainHistory);
 await page.screenshot({path:'urban-combat-combo.png'});
 // Block must play a combat animation, then release cleanly.
 await page.locator('#attackGuard').dispatchEvent('pointerdown',{pointerType:'touch'});
 await page.waitForFunction(()=>document.getElementById('game')?.dataset.animation==='guard',null,{timeout:3500});
 await page.locator('#attackGuard').dispatchEvent('pointerup',{pointerType:'touch'});
 // Dodge must start its own state and consume stamina.
 await page.locator('#attackDodge').dispatchEvent('pointerdown',{pointerType:'touch'});
 await page.waitForTimeout(100);
 const playerHP=Number(await page.locator('#game').getAttribute('data-combat-health'));
 if(!Number.isFinite(playerHP)||playerHP<0||playerHP>100)throw Error('Invalid health after combat');
 if(errors.length)throw Error('Combat browser errors: '+errors.join('; '));
 console.log('FIGHT TEST VERIFIED',JSON.stringify({enemyHP,playerHP,outfit:atBoot.uniform}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
