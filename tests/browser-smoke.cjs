const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--disable-dev-shm-usage']});
  const page = await browser.newPage({viewport:{width:414,height:896},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];const warnings=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());else if(msg.type()==='warning')warnings.push(msg.text())});
  await page.goto('http://127.0.0.1:8000/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:75000});
  await page.waitForTimeout(700);
  const initialMenu=await page.evaluate(()=>({
    title:document.getElementById('brawlerTitle')?.textContent.replace(/\s+/g,' ').trim(),
    screen:document.getElementById('game')?.dataset.screen,
    selected:document.getElementById('game')?.dataset.selectedBrawler,
    startEnabled:!document.getElementById('startGame')?.disabled,
    ninja:document.getElementById('ninjaBrawler')?.getAttribute('aria-pressed'),
    lockedSlots:document.querySelectorAll('.brawler-card.locked').length
  }));
  console.log('MAIN MENU',JSON.stringify(initialMenu));
  if(!/PICK UR\s*BRAWLER/i.test(initialMenu.title || ''))throw new Error('Main menu heading missing');
  if(initialMenu.screen!=='menu' || initialMenu.selected!=='ninja' || !initialMenu.startEnabled || initialMenu.ninja!=='true' || initialMenu.lockedSlots!==2)
    throw new Error('Brawler selection not ready: '+JSON.stringify(initialMenu));
  await page.screenshot({path:'urban-main-menu.png'});
  await page.locator('#startGame').click();
  await page.waitForFunction(()=>document.getElementById('game')?.dataset.screen==='game');
  if(await page.locator('#mainMenu').isVisible())throw new Error('Main menu did not close after starting');
  const ui=await page.evaluate(()=>({
    version:document.querySelector('.version')?.innerText,
    character:document.getElementById('game')?.dataset.character,
    height:Number(document.getElementById('game')?.dataset.meshHeight),
    triangles:Number(document.getElementById('game')?.dataset.triangles),
    meshGroups:Number(document.getElementById('game')?.dataset.meshGroups),
    skinnedMeshes:Number(document.getElementById('game')?.dataset.skinnedMeshes),
    modelType:document.getElementById('game')?.dataset.modelType,
    rigFix:document.getElementById('game')?.dataset.rigFix,
    meshSeparation:document.getElementById('game')?.dataset.meshSeparation,
    clothSeamPatches:Number(document.getElementById('game')?.dataset.clothSeamPatches),
    rigJoints:Number(document.getElementById('game')?.dataset.rigJoints),
    hairLocks:Number(document.getElementById('game')?.dataset.hairLocks),
    hairDrawGroups:Number(document.getElementById('game')?.dataset.hairDrawGroups),
    oldHairRemoved:Number(document.getElementById('game')?.dataset.oldHairRemoved),
    detachableHair:document.getElementById('game')?.dataset.detachableHair,
    detachableHairParts:Number(document.getElementById('game')?.dataset.detachableHairParts),
    detachableHairTriangles:Number(document.getElementById('game')?.dataset.detachableHairTriangles),
    detachableHairBone:document.getElementById('game')?.dataset.detachableHairBone,
    oldHairHidden:Number(document.getElementById('game')?.dataset.oldHairHidden),
    legacyHairShader:document.getElementById('game')?.dataset.legacyHairShader,
    legacyHairShaderMaterials:Number(document.getElementById('game')?.dataset.legacyHairShaderMaterials),
    compactedCrown:Number(document.getElementById('game')?.dataset.compactedCrown),
    compactedNape:Number(document.getElementById('game')?.dataset.compactedNape),
    faceDetails:Number(document.getElementById('game')?.dataset.faceDetails),
    helperBones:Number(document.getElementById('game')?.dataset.helperBones),
    animatedBones:Number(document.getElementById('game')?.dataset.animatedBones),
    clips:document.getElementById('game')?.dataset.animationClips,
    animation:document.getElementById('game')?.dataset.animation,
    walkGait:document.getElementById('game')?.dataset.walkGait,
    warning:document.body.innerText.includes('3D LOAD FAILED'),
    canvas:!!document.querySelector('canvas'),
    touchToggle:document.querySelector('#touchToggle')?.innerText
  }));
  await page.screenshot({path:'urban-3d-test.png'});
  console.log('UI',JSON.stringify(ui));console.log('WARNINGS',JSON.stringify(warnings));console.log('ERRORS',JSON.stringify(errors));
  if(!/BUILD [0-9]+\.[0-9]+/.test(ui.version))throw new Error('Old build loaded');
  if(ui.character!=='clean-head-v5')throw new Error('Blank body GLB did not load');
  if(ui.hairLocks!==0 || ui.hairDrawGroups!==0 || ui.oldHairRemoved<1000 || ui.compactedCrown<100 || ui.compactedNape<100 || ui.faceDetails!==0)
    throw new Error('Old overlapping hair or torn head geometry remains: '+JSON.stringify(ui));
  if(ui.detachableHair!=='source-sculpt-v8' || ui.detachableHairParts!==3 || ui.detachableHairTriangles<10000 || ui.detachableHairTriangles>40000 || !ui.detachableHairBone?.toLowerCase().endsWith('head'))
    throw new Error('Approved separate hairstyle not attached to head: '+JSON.stringify(ui));
  if(ui.legacyHairShader!=='texture-classified-topology-v1' || ui.legacyHairShaderMaterials!==0)throw new Error('Old hair fragment mask inactive: '+JSON.stringify(ui));
  if(ui.animation!=='idle')throw new Error('Idle clip is not playing');
  if(ui.walkGait!=='phased-contact-v3')throw new Error('Live game did not enable the natural walk');
  if(ui.clips!=='Idle,Walk,Run,Jump,Land')throw new Error('Incorrect animation clips: '+ui.clips);
  if(ui.rigJoints!==44)throw new Error('Named joints are missing: '+ui.rigJoints);
  if(ui.triangles<95000 || ui.triangles>170000)throw new Error('Unexpected character triangle count: '+ui.triangles);
  if(ui.skinnedMeshes < 1 || ui.rigJoints < 18 || ui.modelType !== 'skinned-fluid-44' || ui.rigFix !== 'world-axis-v3' || ui.meshSeparation !== 'hand-thigh-seam-v2' || ui.clothSeamPatches!==2 || ui.helperBones!==10 || ui.animatedBones<40)throw new Error('High-detail skinned rig not present: '+JSON.stringify(ui));
  if(Math.abs(ui.height-4.0)>.07)throw new Error('Model not normalized to expected height');
  if(ui.warning)throw new Error('3D load failed; fallback active');
  await page.keyboard.down('w');
  await page.waitForFunction(()=>document.getElementById('game')?.dataset.animation==='walk',null,{timeout:6000});
  const walk=await page.locator('#game').getAttribute('data-animation');
  if(walk!=='walk')throw new Error('Walk clip not activated: '+walk);
  await page.screenshot({path:'urban-animation-walk.png'});
  await page.waitForTimeout(180);
  await page.screenshot({path:'urban-animation-walk-second-step.png'});
  await page.keyboard.down('Shift');
  await page.waitForFunction(()=>document.getElementById('game')?.dataset.animation==='run',null,{timeout:6000});
  const run=await page.locator('#game').getAttribute('data-animation');
  if(run!=='run')throw new Error('Run clip not activated: '+run);
  await page.screenshot({path:'urban-animation-run.png'});
  await page.keyboard.up('Shift');
  await page.keyboard.up('w');
  await page.waitForTimeout(120);
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>document.getElementById('game')?.dataset.animation==='jump',null,{timeout:2000});
  const jump=await page.locator('#game').getAttribute('data-animation');
  await page.keyboard.up('Space');
  if(jump!=='jump')throw new Error('Jump clip not activated: '+jump);
  await page.screenshot({path:'urban-body-animated-test.png'});
  await page.waitForFunction(()=>document.getElementById('game')?.dataset.animation==='land',null,{timeout:4000});
  await page.screenshot({path:'urban-animation-landing.png'});
  await page.waitForFunction(()=>document.getElementById('game')?.dataset.animation==='idle',null,{timeout:4000});
  if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
  if(!ui.canvas)throw new Error('Missing game canvas');
  if(ui.touchToggle!=='TOUCH: ON' && ui.touchToggle!=='TOUCH: OFF')throw new Error('Touch toggle missing');
  await page.locator('#openMenu').click();
  await page.waitForFunction(()=>document.getElementById('game')?.dataset.screen==='menu');
  if(!(await page.locator('#mainMenu').isVisible()))throw new Error('Menu button did not reopen selection');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.getElementById('game')?.dataset.screen==='game');
  if(await page.locator('#mainMenu').isVisible())throw new Error('Keyboard Enter did not resume with the selected brawler');
  await page.screenshot({path:'urban-brawler-resume.png'});
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
