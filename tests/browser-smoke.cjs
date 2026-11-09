const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--disable-dev-shm-usage']});
  const page = await browser.newPage({viewport:{width:414,height:896},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];const warnings=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());else if(msg.type()==='warning')warnings.push(msg.text())});
  await page.goto('http://127.0.0.1:8000/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#loading')?.classList.contains('hidden'),{timeout:65000});
  const ui=await page.evaluate(()=>({version:document.querySelector('.version')?.innerText,warning:document.body.innerText.includes('3D LOAD FAILED'),canvas:!!document.querySelector('canvas'),toggle:document.querySelector('#touchToggle')?.innerText}));
  await page.screenshot({path:'urban-3d-test.png'});
  console.log('UI',JSON.stringify(ui));console.log('WARNINGS',JSON.stringify(warnings));console.log('ERRORS',JSON.stringify(errors));
  if(!ui.version.includes('0.5'))throw new Error('Old build loaded');
  if(ui.warning)throw new Error('Real 3D model failed to load: fallback active');
  if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
  if(!ui.canvas)throw new Error('Missing game canvas');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
