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
    warning:document.body.innerText.includes('3D LOAD FAILED'),
    canvas:!!document.querySelector('canvas'),
    touchToggle:document.querySelector('#touchToggle')?.innerText
  }));
  await page.screenshot({path:'urban-3d-test.png'});
  console.log('UI',JSON.stringify(ui));console.log('WARNINGS',JSON.stringify(warnings));console.log('ERRORS',JSON.stringify(errors));
  if(!ui.version.includes('0.7'))throw new Error('Old build loaded');
  if(ui.character!=='refined-v7')throw new Error('Refined v7 3D mesh is not active');
  if(ui.triangles<120000 || ui.triangles>145000)throw new Error('Unexpected character triangle count: '+ui.triangles);
  if(ui.meshGroups<38 || ui.meshGroups>60)throw new Error('Unexpected character mesh groups: '+ui.meshGroups);
  if(Math.abs(ui.height-4.35)>.07)throw new Error('Model not normalized to expected height');
  if(ui.warning)throw new Error('3D load failed; fallback active');
  if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
  if(!ui.canvas)throw new Error('Missing game canvas');
  if(ui.touchToggle!=='TOUCH: ON' && ui.touchToggle!=='TOUCH: OFF')throw new Error('Touch toggle missing');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
