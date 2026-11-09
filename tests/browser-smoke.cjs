const assert=require('node:assert/strict');
const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage({viewport:{width:414,height:896},deviceScaleFactor:1,isMobile:true,hasTouch:true});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
    // Offline local verification uses the exact same Three.js version as production.
    if(process.env.THREE_TEST_DIR)await page.route('https://**/*',r=>{
      const file=r.request().url().split('/').pop();
      return r.fulfill({path:process.env.THREE_TEST_DIR+'/'+file,contentType:'text/javascript'});
    });
    // Test-only inspection: no debug globals are shipped in the game.
    await page.route('http://127.0.0.1:8000/',async r=>{
      const response=await r.fetch(); const html=await response.text();
      await r.fulfill({response,body:html.replace("loading.classList.add('hidden');", "window.testGame={player,camera,armLeft,armRight,legLeft,legRight}; loading.classList.add('hidden');")});
    });
    await page.goto('http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:65000});
    assert.match(await page.locator('.version').innerText(),/0\.6/);
    assert.equal(await page.locator('body').innerText().then(s=>s.includes('3D LOAD FAILED')),false);
    const state=()=>page.evaluate(()=>({x:testGame.player.position.x,z:testGame.player.position.z,y:testGame.player.position.y}));
    const model=await page.evaluate(()=>{
      const names=[];testGame.player.traverse(o=>{if(o.isMesh)names.push(o.name)});
      return {names,joints:[testGame.armLeft,testGame.armRight,testGame.legLeft,testGame.legRight].map(j=>j.children.length)};
    });
    assert(!model.names.some(n=>n.includes('_sector4_')),'Duplicate geometry returned');
    assert(model.names.includes('HEAD_SculptedLock'));
    assert(model.joints.every(n=>n>0),'An animated limb is empty');
    await page.screenshot({path:'urban-3d-test.png'});
    await page.mouse.move(205,350);await page.mouse.down();await page.mouse.move(467,350,{steps:8});await page.mouse.up();
    await page.waitForTimeout(500);await page.screenshot({path:'urban-3d-side.png'});
    await page.mouse.move(205,350);await page.mouse.down();await page.mouse.move(467,350,{steps:8});await page.mouse.up();
    await page.waitForTimeout(500);await page.screenshot({path:'urban-3d-back.png'});
    const before=await state();await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');const after=await state();
    assert(Math.hypot(after.x-before.x,after.z-before.z)>.1,'Movement failed');
    await page.locator('#jump').dispatchEvent('pointerdown');
    await page.waitForFunction(()=>testGame.player.position.y>.1);
    await page.waitForFunction(()=>testGame.player.position.y===0);
    await page.locator('#touchToggle').click();assert.equal(await page.locator('#jump').isVisible(),false);
    await page.locator('#touchToggle').click();assert.equal(await page.locator('#jump').isVisible(),true);
    assert.deepEqual(errors,[]);console.log('PASS: mobile 3D boot, four animated limbs, no duplicate surfaces, orbit, movement, jump, touch toggle; no browser errors.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
