const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:4173/taipopo/';
for(const width of [1440,768,360,320]){
 await page.setViewportSize({width,height:900});
 for(const lang of ['','en/'])for(const route of ['','support/','privacy/']){
  await page.goto(base+lang+route);await page.evaluate(()=>document.fonts.ready);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow '+lang+route+' '+width);
  if(await page.locator('img').evaluateAll(imgs=>imgs.some(i=>!i.complete||!i.naturalWidth)))throw Error('Broken image');
  const link=page.locator('.language-link');await link.click();
  await page.waitForURL(base+(lang?'':'en/')+route);
  if(await page.locator('html').getAttribute('lang')!==(lang?'ko':'en'))throw Error('Language navigation');
 }
}
await page.goto(base+'en/support/');
for(const link of await page.locator('[data-mail]').all()){
 const url=new URL(await link.getAttribute('href'));const body=url.searchParams.get('body');
 if(url.pathname!=='taipopo.app@gmail.com'||(body.match(/\d\. /g)||[]).length!==4||/[가-힣]/.test(body))throw Error('English mail');
}
await page.locator('.support-card[href="../../guide/?lang=en"]').click();
await page.waitForURL('**/guide/?lang=en');
await page.waitForFunction(()=>document.documentElement.lang==='en');
if(await page.locator('.manual-topic').count()!==13)throw Error('Manual');
await page.goto(base+'en/');
for(const tab of await page.getByRole('tab').all()){await tab.click();if(await tab.getAttribute('aria-selected')!=='true')throw Error('Tabs');}
await page.locator('.theme-button').click();await page.reload();
if(await page.locator('html').getAttribute('data-theme')!=='dark')throw Error('Theme');
await page.screenshot({path:'test-results/english-mobile.png',fullPage:true});
await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/english-desktop.png',fullPage:true});
const nojs=await browser.newContext({javaScriptEnabled:false});const staticPage=await nojs.newPage();
await staticPage.goto(base+'en/support/');if(!(await staticPage.locator('h1').innerText()).includes('Support'))throw Error('Static English');
await browser.close();if(errors.length)throw Error(errors.join('\n'));
console.log('PASS: 6 pages × 4 widths; language navigation, images, English email questions, manual link, tabs, theme, static English and JS errors');
})().catch(e=>{console.error(e);process.exit(1)});
