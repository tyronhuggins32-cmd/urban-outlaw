/**
 * Real 3D-browser playtest of the unreleased full-rig V5 character candidate.
 * No pass here constitutes visual approval. Fail on fallback mannequin,
 * missing original shirt, rig incompatibility or broken combat animations.
 */
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
    '--enable-webgl','--disable-dev-shm-usage'
  ]});
  const page=await browser.newPage({
    viewport:{width:900,height:1080},deviceScaleFactor:1,isMobile:false
  });
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
  await page.goto('http://127.0.0.1:8000/?review=1&prototype=v5',{
    waitUntil:'domcontentloaded',timeout:30000
  });
  try{
    await page.waitForFunction(()=>document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:100000});
  }catch(e){
    console.error('V5 MODEL BOOT FAILED',JSON.stringify(await page.evaluate(()=>({
      loading:document.querySelector('#loading')?.innerText,
      character:document.getElementById('game')?.dataset.character,
      warning:document.body.innerText.includes('3D LOAD FAILED')
    }))),errors);
    throw e;
  }
  const data=await page.locator('#game').evaluate(el=>({...el.dataset}));
  if(data.character!=='v5-sculpted-fighter-prototype')
    throw Error('V5 candidate did not load into game: '+JSON.stringify(data));
  if(data.prototypeState!=='V5_SOURCED_SCULPT_NOT_APPROVED' ||
     data.prototypeMode!=='FULL_CHARACTER_RIG' ||
     Number(data.prototypeShirtMeshes)!==5 ||
     Number(data.prototypeTriangles)<10000)
    throw Error('New whole-rig model or original sewn shirt not visible: '+JSON.stringify(data));
  if(data.uniformStyle!=='v5-sewn-blender-sculpt-NOT-APPROVED')
    throw Error('Legacy shirt displayed in V5 prototype');
  if(!await page.locator('#candidateWarning').isVisible())
    throw Error('Unapproved-model warning is absent');
  console.log('V5 CANDIDATE LOADED',JSON.stringify({
    character:data.character,geometry:data.prototypeTriangles,
    rig:data.rigJoints,shirtMeshes:data.prototypeShirtMeshes,
    bindDeviation:data.prototypeBindDeviation,mode:data.prototypeMode
  }));
  for(const view of ['front','side','back','hero']){
    await page.locator('[data-review-angle="'+view+'"]').click();
    await page.waitForTimeout(250);
    if(await page.locator('#game').getAttribute('data-review-view')!==view)
      throw Error('V5 model camera angle did not change: '+view);
    await page.screenshot({path:'v5-game-'+view+'.png'});
  }
  for(const pose of ['Idle','Ready','Guard','Light','Cross','Kick','Dodge','Run']){
    await page.locator('[data-review-pose="'+pose+'"]').click();
    await page.waitForTimeout(pose==='Run'?500:180);
    const current=await page.locator('#game').getAttribute('data-review-pose');
    if(current!==pose.toLowerCase())throw Error('V5 game did not select '+pose+' pose: '+current);
    if(['Guard','Light','Kick','Run'].includes(pose))
      await page.screenshot({path:'v5-game-pose-'+pose.toLowerCase()+'.png'});
  }
  // The same candidate must remain a *playable* combatant, not just a
  // scene overlay or static fashion dummy.
  await page.goto('http://127.0.0.1:8000/?prototype=v5',{
    waitUntil:'domcontentloaded',timeout:30000
  });
  await page.waitForFunction(()=>document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:100000});
  if(await page.locator('#game').getAttribute('data-character')!=='v5-sculpted-fighter-prototype')
    throw Error('V5 fighter fell back to mannequin when entering game');
  await page.locator('#startGame').click();
  await page.waitForFunction(()=>document.querySelector('#game')?.dataset.screen==='game',{timeout:10000});
  await page.keyboard.down('w');await page.keyboard.down('Shift');
  await page.waitForFunction(()=>document.querySelector('#game')?.dataset.animation==='run',{timeout:6000});
  await page.waitForTimeout(400);
  await page.screenshot({path:'v5-game-playable-ninja-run.png'});
  await page.keyboard.up('w');await page.keyboard.up('Shift');
  await page.keyboard.press('j');
  await page.waitForFunction(()=>Number(document.querySelector('#game')?.dataset.combatAttacksStarted)>=1,{timeout:6000});
  await page.waitForTimeout(120);
  await page.screenshot({path:'v5-game-playable-punch.png'});
  if(errors.length)throw Error('V5 browser exceptions: '+errors.join('; '));
  console.log('V5 FULL-RIG PLAYTEST VERIFIED (NOT VISUAL APPROVAL)');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
