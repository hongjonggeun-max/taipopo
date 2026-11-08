const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const data = require('../guide/manual.json');
const base = (process.env.MANUAL_BASE_URL || 'http://127.0.0.1:4173/taipopo/').replace(/\/?$/u, '/');
const output = process.env.MANUAL_QA_OUTPUT || path.resolve('test-results/manual-images');
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = { base, imageHttpChecks: [], languageChecks: [], representativeViews: [], faults: [], jsErrors: [] };
  async function ready(page, code) {
    await page.waitForFunction(code => document.documentElement.lang === code && document.querySelector('#manual-pages')?.dataset.state === 'ready', code);
    assert.equal(await page.locator('.manual-image').count(), 4);
    assert.equal(await page.locator('.manual-topic, #manual-search').count(), 0);
    assert.equal(await page.locator('#manual-pages').getAttribute('data-loaded'), '4');
    assert.equal(await page.locator('#manual-pages').getAttribute('data-failed'), '0');
  }
  async function inspect(page, code) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const actual = await page.locator('.manual-page').evaluateAll(figures => figures.map(figure => {
      const image = figure.querySelector('img'), frame = figure.querySelector('.manual-original-link');
      const rect = image.getBoundingClientRect();
      return { id: figure.id, src: image.currentSrc, width: rect.width, height: rect.height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, alt: image.alt, transform: getComputedStyle(image).transform, frameTransform: getComputedStyle(frame).transform, direction: getComputedStyle(frame).direction, frameHeight: frame.getBoundingClientRect().height, top: figure.getBoundingClientRect().top + scrollY, marks: [...figure.querySelectorAll('.manual-highlight')].map(mark => ({ id: mark.dataset.target, x: mark.getBoundingClientRect().left - rect.left, y: mark.getBoundingClientRect().top - rect.top, width: mark.getBoundingClientRect().width, height: mark.getBoundingClientRect().height, color: getComputedStyle(mark).stroke, stroke: getComputedStyle(mark).strokeWidth })) };
    }));
    assert.deepEqual(actual.map(i => i.id), data.imageOrder);
    for (const [index, item] of actual.entries()) {
      const expected = data.locales[code].images[index];
      assert.ok(new URL(item.src).pathname.endsWith('/guide/' + expected.src));
      assert.equal(item.naturalWidth, expected.width); assert.equal(item.naturalHeight, expected.height);
      assert.ok(item.width <= item.naturalWidth + 0.1 && item.width > 0);
      assert.ok(Math.abs(item.height / item.width - expected.height / expected.width) < 0.003);
      assert.ok(Math.abs(item.frameHeight - item.height) < 1);
      assert.equal(item.transform, 'none'); assert.equal(item.frameTransform, 'none'); assert.equal(item.direction, 'ltr');
      assert.ok(item.alt.includes(expected.title));
      if (index) assert.ok(item.top > actual[index - 1].top);
      assert.deepEqual(item.marks.map(m => m.id), expected.targets.map(t => t.id));
      for (const [j, mark] of item.marks.entries()) {
        const r = expected.targets[j];
        assert.ok(Math.abs(mark.x - Math.max(0, r.x * item.width) - 0.75) < 1);
        assert.ok(Math.abs(mark.y - Math.max(0, r.y * item.height) - 0.75) < 1);
        assert.equal(mark.color, 'rgb(229, 57, 53)'); assert.equal(mark.stroke, '1.5px');
      }
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${code}`);
    assert.equal(await page.locator('#site-header').count(), 1); assert.equal(await page.locator('#site-footer').count(), 1);
    return actual;
  }
  try {
    const context = await browser.newContext();
    const page = await context.newPage(); page.on('pageerror', e => results.jsErrors.push(e.message));
    await page.goto(base + 'guide/?lang=ko'); await ready(page, 'ko');
    assert.deepEqual(await page.locator('#manual-language option').evaluateAll(options => options.map(o => o.value)), data.localeOrder);
    for (const code of data.localeOrder) {
      await page.locator('#manual-language').selectOption(code); await ready(page, code);
      await page.locator('.manual-image').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      for (const record of data.locales[code].images) {
        const response = await page.request.get(base + 'guide/' + record.src);
        assert.equal(response.status(), 200); assert.match(response.headers()['content-type'], /^image\/webp/u);
        const bytes = await response.body(); assert.equal(digest(bytes), record.sha256);
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
        results.imageHttpChecks.push({ code, id: record.id, status: response.status(), sha256: record.sha256, decoded: true });
      }
      for (const width of [320, 360, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => document.fonts.ready);
        await inspect(page, code);
      }
      await page.locator('.manual-page').last().scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.manual-image').last().evaluate(image => image.complete && image.naturalWidth > 0), true);
      assert.equal(new URL(page.url()).searchParams.get('lang'), code);
      assert.equal(new URL(await page.locator('#nav-guide').getAttribute('href'), page.url()).searchParams.get('lang'), code);
      results.languageChecks.push({ code, images: 4, viewports: [320, 360, 768, 1440], firstToLast: true });
    }
    await page.locator('#manual-language').selectOption('ja'); await ready(page, 'ja');
    await page.locator('#nav-guide').click(); await ready(page, 'ja');
    // The unchanged original is a real image document, not a scaled replacement asset.
    for (const code of ['ko', 'ar']) {
      await page.locator('#manual-language').selectOption(code); await ready(page, code);
      const popupPromise = page.waitForEvent('popup'); await page.locator('.manual-open-original').first().click();
      const popup = await popupPromise; await popup.waitForLoadState('load');
      const image = popup.locator('img'); await image.evaluate(img => img.decode());
      assert.equal(await image.evaluate(img => img.naturalWidth), data.locales[code].images[0].width);
      assert.ok(popup.url().includes(`/images/${code}/guide-main.webp`)); await popup.close();
    }
    await context.close();
    for (const code of ['ko', 'ar']) for (const theme of ['light', 'dark']) for (const width of [360, 1440]) {
      const c = await browser.newContext({ viewport: { width, height: 1000 } });
      await c.addInitScript(value => localStorage.setItem('taipopo-site-theme', value), theme);
      const p = await c.newPage(); p.on('pageerror', e => results.jsErrors.push(e.message));
      await p.goto(`${base}guide/?lang=${code}`); await ready(p, code); await inspect(p, code);
      await p.locator('.manual-image').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      assert.equal(await p.locator('html').getAttribute('dir'), code === 'ar' ? 'rtl' : 'ltr');
      assert.equal(await p.locator('html').getAttribute('data-theme'), theme);
      await p.screenshot({ path: path.join(output, `${code}-${theme}-${width}-top.png`) });
      await p.locator('.manual-page').last().evaluate(element => element.scrollIntoView({ block: 'start' }));
      // Offscreen async image raster needs a paint opportunity after scrolling.
      await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await p.waitForTimeout(250);
      await p.screenshot({ path: path.join(output, `${code}-${theme}-${width}-last.png`) });
      results.representativeViews.push({ code, theme, width }); await c.close();
    }
    const faultContext = await browser.newContext(); const fault = await faultContext.newPage();
    fault.on('pageerror', e => results.jsErrors.push(e.message));
    await fault.route('**/guide/manual.json?*', route => route.fulfill({ status: 503, body: 'Unavailable' }));
    await fault.goto(base + 'guide/?lang=ar'); await fault.waitForFunction(() => document.querySelector('#manual-pages').dataset.state === 'error');
    assert.equal(await fault.locator('.manual-image').count(), 0); assert.equal(await fault.locator('#manual-load-error').isVisible(), true);
    await fault.unroute('**/guide/manual.json?*'); await fault.locator('#manual-retry').click(); await ready(fault, 'ar'); results.faults.push('manifest-503-visible-error-and-retry');
    await fault.route('**/guide/images/ar/guide-gallery.webp?*', route => route.fulfill({ status: 404, body: 'Not found' }));
    await fault.reload(); await fault.waitForFunction(() => document.querySelector('#manual-pages').dataset.state === 'partial-error');
    assert.equal(await fault.locator('#guide-gallery .manual-page-error').isVisible(), true); assert.equal(await fault.locator('.manual-image:visible').count(), 3);
    assert.ok((await fault.locator('.manual-image').evaluateAll(images => images.map(i => i.src))).every(src => src.includes('/images/ar/')));
    await fault.unroute('**/guide/images/ar/guide-gallery.webp?*');
    await fault.route('**/guide/images/ar/guide-gallery.webp?*', async route => { await new Promise(resolve => setTimeout(resolve, 500)); await route.continue(); });
    await fault.locator('#guide-gallery button').click();
    assert.equal(await fault.locator('#manual-pages').getAttribute('data-state'), 'loading');
    assert.equal(await fault.locator('#manual-pages').getAttribute('data-failed'), '0');
    await ready(fault, 'ar'); await fault.unroute('**/guide/images/ar/guide-gallery.webp?*'); results.faults.push('image-404-no-language-fallback-and-retry');
    await fault.route('**/guide/images/ar/guide-gallery.webp?*', route => route.fulfill({ status: 200, contentType: 'image/webp', body: 'corrupt-webp' }));
    await fault.reload(); await fault.waitForFunction(() => document.querySelector('#manual-pages').dataset.state === 'partial-error');
    assert.equal(await fault.locator('#guide-gallery .manual-page-error').isVisible(), true); results.faults.push('corrupt-image-decoding-error');
    await fault.unroute('**/guide/images/ar/guide-gallery.webp?*');
    await fault.route('**/guide/manual.json?*', route => { const partial = structuredClone(data); delete partial.locales.ar; return route.fulfill({ contentType: 'application/json', body: JSON.stringify(partial) }); });
    await fault.reload(); await fault.waitForFunction(() => document.querySelector('#manual-pages').dataset.state === 'error');
    assert.equal(await fault.locator('.manual-image').count(), 0); results.faults.push('missing-locale-no-korean-fallback');
    await fault.unroute('**/guide/manual.json?*');
    await fault.goto(base + 'guide/?lang=unsupported'); await fault.waitForFunction(() => document.querySelector('#manual-pages').dataset.state === 'error');
    assert.equal(await fault.locator('.manual-image').count(), 0); await fault.locator('#manual-language').selectOption('en'); await ready(fault, 'en'); results.faults.push('unsupported-language-explicit-selection');
    await fault.route('**/guide/images/ar/*.webp?*', async route => { await new Promise(resolve => setTimeout(resolve, 250)); await route.continue().catch(() => {}); });
    await fault.locator('#manual-language').selectOption('ar'); await fault.locator('#manual-language').selectOption('ko'); await ready(fault, 'ko');
    await fault.waitForTimeout(350); await inspect(fault, 'ko'); results.faults.push('rapid-language-switch-late-callbacks-ignored'); await faultContext.close();
    const nojs = await browser.newContext({ javaScriptEnabled: false }); const p = await nojs.newPage();
    await p.goto(base + 'guide/?lang=ar');
    assert.equal(await p.locator('.manual-image, .manual-topic').count(), 0);
    assert.equal(await p.locator('.manual-nojs section[lang="ar"] a').count(), 4);
    assert.equal(await p.locator('.manual-nojs section').count(), 16); await nojs.close(); results.faults.push('no-js-explicit-language-original-links');
    assert.equal(results.imageHttpChecks.length, 64); assert.equal(results.jsErrors.length, 0, results.jsErrors.join('\n'));
    results.status = 'PASS';
    fs.writeFileSync(path.join(output, 'browser-result.json'), JSON.stringify(results, null, 2));
    console.log(`PASS: 64 HTTP/hash/WebP/decode checks; 16 languages × 4 widths; 8 KO/AR theme views; original viewing; ${results.faults.length} failure/race/no-JS cases; no text or locale fallback.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
