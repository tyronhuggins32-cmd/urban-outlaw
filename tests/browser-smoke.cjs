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
  const ui=await page.evaluate(()=>({
    version:document.querySelector('.version')?.innerText,
    character:document.getElementById('game')?.dataset.character,
    height:Number(document.getElementById('game')?.dataset.meshHeight),
    triangles:Number(document.getElementById('game')?.dataset.triangles),
    meshGroups:Number(document.getElementById('game')?.dataset.meshGroups),
    skinnedMeshes:Number(document.getElementById('game')?.dataset.skinnedMeshes),
    modelType:document.getElementById('game')?.dataset.modelType,
    rigFix:document.getElementById('game')?.dataset.rigFix,
    rigJoints:Number(document.getElementById('game')?.dataset.rigJoints),
    clips:document.getElementById('game')?.dataset.animationClips,
    animation:document.getElementById('game')?.dataset.animation,
    warning:document.body.innerText.includes('3D LOAD FAILED'),
    canvas:!!document.querySelector('canvas'),
    touchToggle:document.querySelector('#touchToggle')?.innerText
  }));
  await page.screenshot({path:'urban-3d-test.png'});
  console.log('UI',JSON.stringify(ui));console.log('WARNINGS',JSON.stringify(warnings));console.log('ERRORS',JSON.stringify(errors));
  if(!ui.version.includes('1.2'))throw new Error('Old build loaded');
  if(ui.character!=='reference-rig-v1')throw new Error('Blank body GLB did not load');
  if(ui.animation!=='idle')throw new Error('Idle clip is not playing');
  if(ui.clips!=='Idle,Walk,Run,Jump')throw new Error('Incorrect animation clips: '+ui.clips);
  if(ui.rigJoints<10)throw new Error('Named joints are missing: '+ui.rigJoints);
  if(ui.triangles<35000 || ui.triangles>100000)throw new Error('Unexpected character triangle count: '+ui.triangles);
  if(ui.skinnedMeshes < 1 || ui.rigJoints < 18 || ui.modelType !== 'skinned-high-detail' || ui.rigFix !== 'world-axis-v2')throw new Error('High-detail skinned rig not present: '+JSON.stringify(ui));
  if(Math.abs(ui.height-4.0)>.07)throw new Error('Model not normalized to expected height');
  if(ui.warning)throw new Error('3D load failed; fallback active');
  await page.keyboard.down('w');
  await page.waitForTimeout(350);
  const walk=await page.locator('#game').getAttribute('data-animation');
  if(walk!=='walk')throw new Error('Walk clip not activated: '+walk);
  await page.keyboard.down('Shift');
  await page.waitForTimeout(260);
  const run=await page.locator('#game').getAttribute('data-animation');
  if(run!=='run')throw new Error('Run clip not activated: '+run);
  await page.keyboard.up('Shift');
  await page.keyboard.up('w');
  await page.waitForTimeout(120);
  await page.keyboard.press('Space');
  await page.waitForTimeout(170);
  const jump=await page.locator('#game').getAttribute('data-animation');
  if(jump!=='jump')throw new Error('Jump clip not activated: '+jump);
  await page.screenshot({path:'urban-body-animated-test.png'});
  if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
  if(!ui.canvas)throw new Error('Missing game canvas');
  if(ui.touchToggle!=='TOUCH: ON' && ui.touchToggle!=='TOUCH: OFF')throw new Error('Touch toggle missing');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
