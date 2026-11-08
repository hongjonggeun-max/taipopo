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
  const results = { base, imageHttpChecks: [], languageChecks: [], contentChecks: [], representativeViews: [], faults: [], jsErrors: [] };
  async function ready(page, code) {
    await page.waitForFunction(code => document.documentElement.lang === code && document.querySelector('#manual-pages')?.dataset.state === 'ready', code);
    assert.equal(await page.locator('.manual-image').count(), 4);
    assert.equal(await page.locator('.manual-topic, #manual-search').count(), 0);
    assert.equal(await page.locator('#manual-pages').getAttribute('data-loaded'), '4');
    assert.equal(await page.locator('#manual-pages').getAttribute('data-failed'), '0');
    assert.equal(await page.locator('#manual-pages .manual-chapter').count(), 6);
    assert.equal(await page.locator('#manual-pages .manual-feature').count(), 113);
    assert.equal(await page.locator('#manual-chapter option').count(), 7);
  }
  async function inspectIcons(page, code, theme) {
    await page.evaluate(() => document.fonts.ready);
    const actual = await page.locator('#manual-pages .manual-app-icon').evaluateAll(icons => icons.map(icon => { const style = getComputedStyle(icon); return { codePoint: icon.textContent.codePointAt(0), color: style.color, background: style.backgroundColor, transform: style.transform, font: style.fontFamily, size: style.fontSize }; }));
    const rgb = hex => { const value = hex.replace('#', ''); return `rgb(${[0, 2, 4].map(at => parseInt(value.slice(at, at + 2), 16)).join(', ')})`; };
    const icons = data.locales[code].chapters.flatMap(chapter => [chapter.icon, ...chapter.features.map(feature => feature.icon)]).filter(Boolean);
    assert.deepEqual(actual, icons.map(icon => ({ codePoint: icon.codePoint, color: rgb(theme === 'dark' ? icon.colorDark : icon.color), background: icon.background === 'transparent' ? 'rgba(0, 0, 0, 0)' : rgb(icon.background), transform: code === 'ar' && icon.matchTextDirection ? 'matrix(-1, 0, 0, 1, 0, 0)' : 'none', font: 'TAIPOPOManualIcons', size: '22px' })));
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
      const original = data.locales[code].images[index];
      const expected = original.preview || original;
      assert.ok(new URL(item.src).pathname.endsWith('/guide/' + expected.src));
      assert.equal(item.naturalWidth, expected.width); assert.equal(item.naturalHeight, expected.height);
      assert.ok(item.width <= item.naturalWidth + 0.1 && item.width > 0);
      assert.ok(Math.abs(item.height / item.width - expected.height / expected.width) < 0.003);
      assert.ok(Math.abs(item.frameHeight - item.height) < 1);
      assert.equal(item.transform, 'none'); assert.equal(item.frameTransform, 'none'); assert.equal(item.direction, 'ltr');
      assert.ok(item.alt.includes(original.title));
      if (await page.evaluate(() => innerWidth > 780)) {
        assert.ok(item.height <= Math.min(720, await page.evaluate(() => Math.max(120, innerHeight - 200))) + 1, 'Desktop image exceeds viewport-height limit');
      }
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
    const fontResponse = await page.request.get(new URL(data.font.src, base + 'guide/').href);
    assert.equal(fontResponse.status(), 200); assert.equal(digest(await fontResponse.body()), data.font.sha256);
    assert.deepEqual(await page.locator('#manual-language option').evaluateAll(options => options.map(o => o.value)), data.localeOrder);
    for (const code of data.localeOrder) {
      await page.locator('#manual-language').selectOption(code); await ready(page, code);
      await page.locator('.manual-image').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.evaluate(() => document.fonts.ready);
      const content = await page.locator('#manual-pages .manual-chapter').evaluateAll(chapters => chapters.map(chapter => ({ id: chapter.id, title: chapter.querySelector('.manual-chapter-title').lastChild.textContent, features: [...chapter.querySelectorAll('.manual-feature')].map(feature => ({ id: feature.id, title: feature.querySelector('h3').textContent, body: feature.querySelector('.manual-feature-body').textContent, notice: feature.querySelector('.manual-feature-notice')?.textContent || null, icon: feature.querySelector('.manual-app-icon') ? { codePoint: feature.querySelector('.manual-app-icon').textContent.codePointAt(0), font: getComputedStyle(feature.querySelector('.manual-app-icon')).fontFamily } : null })) })));
      assert.deepEqual(content, data.locales[code].chapters.map((chapter, index) => ({ id: chapter.id, title: `${index + 1}. ${chapter.title}`, features: chapter.features.map(feature => ({ id: `manual-feature-${feature.id}`, title: feature.title, body: feature.body, notice: feature.notice, icon: feature.icon ? { codePoint: feature.icon.codePoint, font: 'TAIPOPOManualIcons' } : null })) })));
      for (const chapter of data.locales[code].chapters) {
        await page.locator('#manual-chapter').selectOption(chapter.id);
        await page.waitForFunction(id => { const element = document.getElementById(id); const inset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + parseFloat(getComputedStyle(element).scrollMarginTop); return Math.abs(element.getBoundingClientRect().top - inset) < 2; }, chapter.id);
      }
      results.contentChecks.push({ code, chapters: 6, features: 113, notices: 2, originalTextAndIcons: true, sixContentsDestinations: true });
      for (const record of data.locales[code].images.flatMap(record => record.preview ? [record, { ...record.preview, id: record.id + '-preview' }] : [record])) {
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
      await inspectIcons(p, code, theme);
      await p.screenshot({ path: path.join(output, `${code}-${theme}-${width}-top.png`) });
      await p.locator('.manual-page').last().evaluate(element => element.scrollIntoView({ block: 'start' }));
      // Offscreen async image raster needs a paint opportunity after scrolling.
      await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await p.waitForTimeout(250);
      await p.screenshot({ path: path.join(output, `${code}-${theme}-${width}-last.png`) });
      await p.locator('#manual-feature-registration').evaluate(element => element.scrollIntoView({ block: 'start' }));
      await p.screenshot({ path: path.join(output, `${code}-${theme}-${width}-body.png`) });
      await p.locator('#manual-pages .manual-feature').last().evaluate(element => element.scrollIntoView({ block: 'center' }));
      assert.equal(await p.locator('#manual-pages .manual-feature').last().isVisible(), true);
      await p.screenshot({ path: path.join(output, `${code}-${theme}-${width}-end.png`) });
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
    assert.ok((await fault.locator('.manual-image').evaluateAll(images => images.map(i => i.src))).every(src => /\/(?:images|previews)\/ar\//u.test(src)));
    await fault.unroute('**/guide/images/ar/guide-gallery.webp?*');
    await fault.route('**/guide/images/ar/guide-gallery.webp?*', async route => { await new Promise(resolve => setTimeout(resolve, 500)); await route.continue(); });
    await fault.locator('#guide-gallery button').click();
    assert.equal(await fault.locator('#manual-pages').getAttribute('data-state'), 'loading');
    assert.equal(await fault.locator('#manual-pages').getAttribute('data-failed'), '0');
    await ready(fault, 'ar'); await fault.unroute('**/guide/images/ar/guide-gallery.webp?*'); results.faults.push('image-404-no-language-fallback-and-retry');
    await fault.route('**/guide/previews/ar/guide-report.webp?*', route => route.fulfill({ status: 404, body: 'Not found' }));
    await fault.reload(); await fault.waitForFunction(() => document.querySelector('#manual-pages').dataset.state === 'partial-error');
    assert.equal(await fault.locator('#guide-report .manual-page-error').isVisible(), true);
    assert.ok((await fault.locator('#guide-report .manual-image').evaluate(image => image.src)).includes('/previews/ar/'));
    await fault.unroute('**/guide/previews/ar/guide-report.webp?*');
    await fault.locator('#guide-report button').click(); await ready(fault, 'ar'); results.faults.push('preview-404-explicit-error-no-silent-original-fallback');
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
    assert.equal(await p.locator('.manual-nojs details[lang="ar"] .manual-nojs-original').count(), 4);
    assert.equal(await p.locator('.manual-nojs details').count(), 16);
    assert.equal(await p.locator('.manual-nojs details[lang="ar"] .manual-feature-body').count(), 113);
    await p.locator('.manual-nojs details[lang="ar"] > summary').click();
    assert.equal(await p.locator('.manual-nojs details[lang="ar"] .manual-feature-body').first().isVisible(), true);
    await nojs.close(); results.faults.push('no-js-complete-localized-guide-and-original-links');
    assert.equal(results.imageHttpChecks.length, 96); assert.equal(results.jsErrors.length, 0, results.jsErrors.join('\n'));
    results.status = 'PASS';
    fs.writeFileSync(path.join(output, 'browser-result.json'), JSON.stringify(results, null, 2));
    console.log(`PASS: 16 languages × 6 chapters / 113 complete feature bodies / 2 notices / six contents destinations; 96 HTTP/hash/WebP checks and all displayed images decoded; 4 widths; viewport-height limits; 8 KO/AR theme views; original icons/viewing; ${results.faults.length} failure/race/no-JS cases.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
