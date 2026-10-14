const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const data=require('../guide/manual.json');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync('test-results',{recursive:true});
 for(const width of [1440,768,360,320]){
  await page.setViewportSize({width,height:800});
  for(const code of Object.keys(data)){
   await page.goto(`http://127.0.0.1:4173/taipopo/guide/?lang=${code}`);
   await page.waitForFunction(code=>document.documentElement.lang===code&&!document.querySelector('#manual-language').disabled,code);
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('.manual-topic').count(),13);
   assert.equal(await page.locator('html').getAttribute('dir'),code==='ar'?'rtl':'ltr');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow ${code} ${width}`);
   await page.locator('#manual-search').fill(data[code].sections[0].title);
   assert.equal(await page.locator('.manual-topic:visible').count(),1);
   assert.equal(await page.locator('.manual-topic:visible').evaluate(e=>e.open),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Expanded overflow ${code} ${width}`);
   await page.locator('#manual-search').fill('zzzz-nonexistent-987');
   assert.equal(await page.locator('#manual-empty').isVisible(),true);
   await page.locator('#manual-search').fill('');
   assert.equal(await page.locator('.manual-topic:visible').count(),13);
  }
 }
 await page.goto('http://127.0.0.1:4173/taipopo/guide/?lang=ko#sync');
 await page.waitForFunction(()=>document.querySelector('#sync').open);
 assert.match(await page.locator('#sync').innerText(),/금액 수정과 삭제/);
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/manual-desktop.png',fullPage:true});
 await page.setViewportSize({width:360,height:800});await page.locator('#manual-language').selectOption('ar');
 assert.equal(await page.locator('html').getAttribute('dir'),'rtl');await page.locator('.theme-button').click();await page.screenshot({path:'test-results/manual-arabic.png',fullPage:true});
 await page.locator('#manual-language').selectOption('ko');await page.locator('#manual-search').fill(data.ko.sections[10].title);await page.screenshot({path:'test-results/manual-mobile-backup.png',fullPage:true});
 assert.equal(errors.length,0,errors.join('\n'));
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto('http://127.0.0.1:4173/taipopo/guide/');assert.equal(await nojs.locator('.manual-topic').count(),13);await nojs.locator('summary').first().click();assert.equal(await nojs.locator('details').first().evaluate(e=>e.open),true);
 console.log('PASS: 16 languages × 4 widths, 13 topics, search/empty/clear, RTL, theme, language switch, deep link, no-JS Korean, no JS errors.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
