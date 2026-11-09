const { chromium }=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:414,height:896},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8000/?review=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.getElementById('loading').classList.contains('hidden'),null,{timeout:75000});
 const state=await page.locator('#game').getAttribute('data-character');
 if(state!=='reference-rig-v1')throw new Error('Model review did not load actual GLB: '+state);
 for(const view of ['front','side','back','hero']){
   await page.locator('[data-review-angle="'+view+'"]').click();
   await page.waitForTimeout(300);
   const current=await page.locator('#game').getAttribute('data-review-view');
   if(current!==view)throw new Error('Incorrect review camera: '+current);
   const ref=await page.locator('#reviewReference').getAttribute('src');
   if(!ref.endsWith('/'+view+'.jpg'))throw new Error('Incorrect reference artwork: '+ref);
   const loaded=await page.locator('#reviewReference').evaluate(img=>img.complete&&img.naturalWidth>20);
   if(!loaded)throw new Error('Reference image failed to load: '+view);
   await page.screenshot({path:'urban-review-'+view+'.png'});
   console.log('verified',view,ref);
 }
 if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
