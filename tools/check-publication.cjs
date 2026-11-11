const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const data = require('./privacy-content.json');
const review = require('./website-disclosures.json');
const { renderPolicy, renderDeletion, renderSupportProcessing } = require('./privacy-page.cjs');
assert.deepEqual(Object.keys(review.locales).sort(), Object.keys(data).sort());
let count = 0;
for (const [code, policy] of Object.entries(data)) {
  assert.equal(policy.locale, code);
  const text = review.locales[code];
  for (const key of ['heading', 'scope', 'qrLegacy', 'qrCandidate', 'international', 'otherInternational', 'deletion', 'authScope', 'accountScope', 'localConfig']) assert.ok(text[key]?.trim(), `${code}: ${key}`);
  assert.ok(!text.scope.includes('1.0.0+21') && !text.qrCandidate.includes('1.0.0+21'), code);
  assert.ok(text.qrLegacy.includes('ML Kit') && text.qrCandidate.includes('ZXing'), code);
  assert.ok(policy.body.includes(policy.revisionDate), code);
  const resume = policy.body.split('\n\n').find((paragraph, index, paragraphs) => paragraphs[index - 2]?.startsWith('5.'));
  assert.ok(resume?.includes('Google Drive') && policy.deletion.body.includes(resume) && policy.terms.body.includes(resume), code);
  const resetRoute = policy.deletion.body.split('\n').find((line) => line.split(' > ').length === 3);
  assert.ok(resetRoute, code);
  assert.ok(!policy.deletion.body.split('\n').some((line) => line.split(' > ').length > 3), code);
  const privacy = fs.readFileSync(path.join(root, code, 'privacy/index.html'), 'utf8');
  assert.ok(privacy.includes(renderPolicy(policy).html), `Reviewed policy missing: ${code}`);
  const visibleText = privacy.replace(/<[^>]*>/gu, '');
  for (const value of [text.scope, text.qrLegacy, text.qrCandidate, text.international, text.otherInternational, text.deletion, text.authScope, text.localConfig]) {
    const escaped = value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    assert.ok(visibleText.includes(escaped), `Published fact missing: ${code}`);
  }
  const support = fs.readFileSync(path.join(root, code, 'support/index.html'), 'utf8');
  assert.ok(support.includes(renderSupportProcessing(policy)), `Mail/deletion notice missing: ${code}`);
  assert.equal((support.match(/data-web-review=/gu) || []).length, 1, `Repeated support notice: ${code}`);
  assert.ok(fs.readFileSync(path.join(root, code, 'deletion/index.html'), 'utf8').includes(renderDeletion(policy).html));
  for (const route of ['', 'support/', 'privacy/', 'deletion/', 'terms/']) {
    const html = fs.readFileSync(path.join(root, code, route, 'index.html'), 'utf8');
    assert.equal((html.match(/rel="canonical"/gu) || []).length, 1, `${code}/${route}: canonical`);
    assert.ok(html.includes(`content="${review.reviewDate}"`), `${code}/${route}: version`);
    if (route === 'terms/') assert.ok(html.includes('content="noindex,follow"'));
    else {
      assert.equal((html.match(/hreflang=/gu) || []).length, 17, `${code}/${route}: alternates`);
      assert.ok(!html.includes('content="noindex'), `${code}/${route}: crawlable`);
    }
    count++;
  }
}
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(home.includes('<title>TAIPOPO(타이포포)'));
const schema = JSON.parse(home.match(/<script type="application\/ld\+json">([^<]+)<\/script>/u)[1]);
assert.equal(schema['@type'], 'WebSite'); assert.equal(schema.name, 'TAIPOPO(타이포포)');
assert.ok(schema.alternateName.includes('타이포포')); assert.equal(schema.url, 'https://taipopo.app/');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(m => m[1]);
assert.equal(urls.length, 65); assert.equal(new Set(urls).size, 65);
for (const url of urls) {
  assert.ok(url.startsWith('https://taipopo.app/')); assert.ok(!url.includes('/terms/'));
  const file = path.join(root, new URL(url).pathname, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(html.includes(`rel="canonical" href="${url}"`), `Noncanonical sitemap URL: ${url}`);
}
assert.ok(fs.readFileSync(path.join(root, 'robots.txt'), 'utf8').includes('Sitemap: https://taipopo.app/sitemap.xml'));
console.log(`PASS: ${count} locale pages, version-qualified processing, deletion/mail notices, canonical/hreflang, Korean brand schema and 65 sitemap URLs.`);
