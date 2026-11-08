const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../guide/manual.json');
const base = (process.env.MANUAL_BASE_URL || 'http://127.0.0.1:4173/taipopo/').replace(/\/?$/u, '/');
const output = process.env.HEADER_QA_OUTPUT || path.resolve('test-results/header');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const result = { base, geometry: [], guideTaps: [], themeViews: [], errors: [] };
  const context = await browser.newContext({ hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', error => result.errors.push(error.message));
  async function geometry(route, width) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + route); await page.evaluate(() => document.fonts.ready);
    const boxes = await page.locator('.header').evaluate(header => {
      const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      return { header: box(header), nav: box(header.querySelector('nav')), links: [...header.querySelectorAll('nav a')].map(el => ({ text: el.textContent, ...box(el) })), controls: [header.querySelector('.language-picker summary'), header.querySelector('.theme-button')].filter(Boolean).map(box), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(boxes.overflow, false, `Page overflow ${route} at ${width}`);
    if (width <= 780) {
      assert.ok(boxes.nav.y - Math.max(...boxes.controls.map(c => c.bottom)) >= 15.9, `Language/nav separation ${route}`);
      assert.ok(boxes.header.bottom - Math.max(...boxes.links.map(l => l.bottom)) >= 19.9, `Navigation bottom space ${route}`);
      for (const link of boxes.links) {
        assert.ok(link.height >= 48 && link.width >= 44, `Small touch target ${link.text}`);
        assert.ok(link.x >= 0 && link.right <= width + 1, `Link clipped ${link.text}`);
        for (const control of boxes.controls) assert.ok(link.bottom <= control.y || link.y >= control.bottom || link.right <= control.x || link.x >= control.right, 'Overlapping touch targets');
      }
    }
    result.geometry.push({ route, width, minLinkHeight: Math.min(...boxes.links.map(l => l.height)), controlsGap: boxes.nav.y - Math.max(...boxes.controls.map(c => c.bottom)) });
  }
  try {
    // The shared header ships on all 86 pages; inspect every mobile variant.
    const routes = ['', 'support/', 'privacy/', 'deletion/', 'terms/', ...data.localeOrder.flatMap(code => ['', 'support/', 'privacy/', 'deletion/', 'terms/'].map(route => `${code}/${route}`)), 'guide/?lang=ko'];
    for (const route of routes) await geometry(route, 390);
    for (const code of data.localeOrder) for (const width of [320, 768, 1440]) {
      await geometry(`${code}/`, width); await geometry(`guide/?lang=${code}`, width);
    }
    // Tap the actual upper/centre/lower portions of Guide, not just its text centre.
    for (const code of data.localeOrder) for (const position of ['top', 'middle', 'bottom']) {
      await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base + `${code}/`);
      const link = page.locator('.header nav a[href*="guide/"]'); await link.waitFor();
      const r = await link.boundingBox();
      const y = position === 'top' ? r.y + 4 : position === 'bottom' ? r.y + r.height - 4 : r.y + r.height / 2;
      await page.touchscreen.tap(r.x + r.width / 2, y);
      await page.waitForURL('**/guide/**');
      await page.waitForFunction(code => document.documentElement.lang === code && document.querySelector('#manual-pages')?.dataset.state === 'ready', code);
      assert.equal(await page.locator('.manual-chapter').count(), 6);
      assert.equal(await page.locator('.manual-feature').count(), 113);
      assert.equal(await page.locator('.language-picker').getAttribute('open'), null);
      result.guideTaps.push({ code, position, destination: page.url(), chapterCount: 6, featureCount: 113 });
    }
    for (const code of ['ko', 'ar']) for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 }); await page.goto(base + (code === 'ko' ? '' : 'ar/'));
      await page.evaluate(theme => { localStorage.setItem('taipopo-site-theme', theme); document.documentElement.dataset.theme = theme; }, theme);
      await page.screenshot({ path: path.join(output, `${code}-${theme}-${width}.png`) });
      result.themeViews.push({ code, theme, width });
    }
    // Both top-row controls remain usable after increasing navigation hit areas.
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base);
    const beforeTheme = await page.locator('html').getAttribute('data-theme'); await page.locator('.theme-button').tap();
    const afterTheme = await page.locator('html').getAttribute('data-theme'); assert.notEqual(afterTheme, beforeTheme);
    await page.locator('.language-picker summary').tap(); assert.equal(await page.locator('.language-picker').getAttribute('open'), '');
    await page.locator('.language-picker a[lang="ar"]').tap(); await page.waitForURL('**/ar/');
    assert.equal(await page.locator('html').getAttribute('data-theme'), afterTheme);
    assert.equal(result.errors.length, 0, result.errors.join('\n'));
    result.status = 'PASS'; fs.writeFileSync(path.join(output, 'header-result.json'), JSON.stringify(result, null, 2));
    console.log(`PASS: ${result.geometry.length} header layouts, 48 Guide touch taps across 16 locales, 8 theme views, language/theme controls, no overlap or JS errors.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
