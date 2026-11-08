const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const app = path.resolve(process.argv[2] || path.join(root, '../app-current'));
const data = require('../guide/manual.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const languageSource = fs.readFileSync(path.join(app, 'lib/settings/app_language_options.dart'), 'utf8');
const codes = [...languageSource.matchAll(/AppLanguageOption\(code: '([a-z]+)',/gu)].map(m => m[1]);
assert.deepEqual(data.localeOrder, codes); assert.equal(codes.length, 16);
const catalog = fs.readFileSync(path.join(app, 'lib/screens/settings/pages/manual/manual_overview_catalog.dart'), 'utf8');
const rows = [...catalog.matchAll(/ManualOverview\('([^']+)',\s*\(l\)\s*=>\s*l\.(\w+),\s*const\s*\[([\s\S]*?)\]\)/gu)];
assert.deepEqual(data.imageOrder, rows.map(r => r[1])); assert.equal(rows.length, 4);
const html = fs.readFileSync(path.join(root, 'guide/index.html'), 'utf8');
const ui = JSON.parse(html.match(/<script type="application\/json" id="manual-ui">([\s\S]*?)<\/script>/u)[1]);
assert.equal(data.schemaVersion, 2); assert.ok(html.includes(data.contentVersion));
assert.ok(!html.includes('manual-topic') && !html.includes('manual-search'));
assert.ok(!/오프라인|offline|hors ligne|sin conexión|オフライン|离线|ऑफलाइन|ออฟไลน์|офлайн|çevrimdışı/iu.test(JSON.stringify(ui)));
let checked = 0, bytes = 0, excluded = 0;
for (const code of codes) {
  const locale = data.locales[code];
  const manifestBytes = fs.readFileSync(path.join(app, locale.sourceManifest));
  assert.equal(sha(manifestBytes), locale.sourceManifestSha256);
  const manifest = JSON.parse(manifestBytes);
  excluded += Object.keys(manifest).length - 4;
  const arb = JSON.parse(fs.readFileSync(path.join(app, `lib/l10n/app_${code}.arb`), 'utf8'));
  assert.equal(ui[code].title, arb.userGuideTitle); assert.equal(ui[code].intro, arb.manualIntro);
  assert.equal(ui[code].error, arb.manualImageError); assert.equal(ui[code].retry, arb.retry);
  assert.equal(locale.images.length, 4);
  assert.deepEqual(fs.readdirSync(path.join(root, 'guide/images', code)).sort(), data.imageOrder.map(id => `${id}.webp`).sort());
  for (const [index, image] of locale.images.entries()) {
    const original = manifest[rows[index][1]];
    assert.equal(image.id, rows[index][1]); assert.equal(image.title, arb[rows[index][2]]);
    assert.equal(image.order, index + 1); assert.equal(image.src, `images/${code}/${image.id}.webp`);
    assert.equal(image.width, original.width); assert.equal(image.height, original.height);
    const source = fs.readFileSync(path.join(app, original.asset));
    const web = fs.readFileSync(path.join(root, 'guide', image.src));
    assert.ok(web.equals(source), `Changed original image: ${code}/${image.id}`);
    assert.equal(sha(web), original.assetSha256); assert.equal(sha(web), image.sha256);
    assert.equal(web.toString('ascii', 0, 4), 'RIFF'); assert.equal(web.toString('ascii', 8, 12), 'WEBP');
    const targetIds = [...rows[index][3].matchAll(/ManualOverviewCue\('([^']+)'\)/gu)].map(m => m[1]);
    assert.deepEqual(image.targets, targetIds.map(id => ({ id, ...original.targets[id] })));
    bytes += web.length; checked++;
  }
}
assert.equal(checked, 64); assert.equal(excluded, 1968);
console.log(`PASS: ${checked} byte-identical app WebPs (${bytes} bytes), exact 16 locales/order/manifest hashes/geometry; ${excluded} archive entries excluded; no old text or offline promise.`);
