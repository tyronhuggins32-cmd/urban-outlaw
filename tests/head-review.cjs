const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:540,height:880},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8000/?review=1&head=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.getElementById('loading')?.classList.contains('hidden'),null,{timeout:70000});
 const stats=await page.evaluate(()=>{
   const d=document.getElementById('game').dataset;
   return {character:d.character,headReview:d.headReview,hairLocks:Number(d.hairLocks),
       hairDrawGroups:Number(d.hairDrawGroups),oldHairRemoved:Number(d.oldHairRemoved),
       compactedCrown:Number(d.compactedCrown),detachableHair:d.detachableHair};
 });
 if(stats.character!=='clean-head-v5'||stats.headReview!=='active'||stats.hairLocks!==0||stats.hairDrawGroups!==0||stats.compactedCrown<100||stats.detachableHair!=='source-sculpt-v8'){
   throw new Error('3D facial hair sculpt missing: '+JSON.stringify(stats));
 }
 console.log('HEAD REVIEW',JSON.stringify(stats));
 for(const a of ['front','hero','side','back']){
   await page.locator('[data-review-angle="'+a+'"]').click();
   await page.waitForTimeout(420);
   const view=await page.locator('#game').getAttribute('data-review-view');
   if(view!==a)throw new Error('Head camera mismatched '+a+' '+view);
   await page.screenshot({path:'urban-head-'+a+'.png'});
   console.log('CAPTURED 3D HEAD',a);
 }
 if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
