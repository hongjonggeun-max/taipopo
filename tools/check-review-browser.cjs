// Isolated public-site QA only; never use a user browser profile or authenticated Console.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const codes = Object.keys(require('./privacy-content.json'));
const base = 'http://127.0.0.1:4173/taipopo/';
const output = process.env.TAIPOPO_QA_OUTPUT || path.resolve('test-results');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  let views = 0;
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext();
      await context.addInitScript(value => localStorage.setItem('taipopo-site-theme', value), theme);
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      const locales = theme === 'light' ? codes : ['ko', 'ar'];
      for (const code of locales) for (const width of (['ko', 'ar'].includes(code) ? [320, 1440] : [320])) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of ['', 'privacy/', 'support/', 'deletion/']) {
          await page.goto(`${base}${code}/${route}`);
          await page.evaluate(() => document.fonts.ready);
          assert.equal(await page.locator('html').getAttribute('dir'), code === 'ar' ? 'rtl' : 'ltr');
          assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${code}/${route} ${width} ${theme}`);
          assert.equal(await page.locator('img').evaluateAll(imgs => imgs.some(i => !i.complete || !i.naturalWidth)), false);
          if (route) {
            const review = page.locator('[data-web-review]');
            assert.equal(await review.count(), 1);
            await review.scrollIntoViewIfNeeded();
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            const bounds = await review.boundingBox();
            assert.ok(bounds.width <= width && bounds.x >= -1, `Review clipped: ${code}/${route}`);
            assert.equal(await page.locator('a[href="mailto:taipopo.app@gmail.com"]').count() > 0, true, `Contact link missing: ${code}/${route}`);
            if (['ko', 'ar'].includes(code) && route === 'privacy/') {
              await page.screenshot({ path: path.join(output, `review-${code}-${width}-${theme}.png`) });
            }
          }
          views++;
        }
      }
      await context.close();
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`PASS: ${views} isolated locale/route/viewport/theme views; KO/AR mobile/desktop, RTL, scroll, images, public notices and no JS errors.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
