// Export ONLY the four images selected by the current app's overview catalog.
// Input is read-only; never re-encode/crop/capture images or export archived captures.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const input = path.resolve(process.argv[2] || path.join(root, '../app-current'));
const app = fs.existsSync(path.join(input, 'pubspec.yaml')) ? input : path.resolve(input, '../..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const read = relative => fs.readFileSync(path.join(app, relative), 'utf8');
const catalog = read('lib/screens/settings/pages/manual/manual_overview_catalog.dart');
const overviews = [...catalog.matchAll(/ManualOverview\('([^']+)',\s*\(l\)\s*=>\s*l\.(\w+),\s*const\s*\[([\s\S]*?)\]\)/gu)]
  .map(m => ({ id: m[1], titleKey: m[2], targets: [...m[3].matchAll(/ManualOverviewCue\('([^']+)'\)/gu)].map(c => c[1]) }));
const order = overviews.map(o => o.id);
if (JSON.stringify(order) !== JSON.stringify(['guide-main', 'guide-gallery', 'guide-settlement', 'guide-report'])) throw Error('App overview selection changed; review the export allowlist.');
const languages = [...read('lib/settings/app_language_options.dart').matchAll(/AppLanguageOption\(code: '([a-z]+)', label: '([^']+)'\)/gu)]
  .map(m => ({ code: m[1], name: m[2] }));
if (languages.length !== 16 || new Set(languages.map(l => l.code)).size !== 16) throw Error('Unexpected app language list');
const pubspec = read('pubspec.yaml');
const webText = require('./manual-web-text.json');
const locales = {};
const ui = {};
const copies = [];
for (const { code, name } of languages) {
  const manifestPath = `assets/manual/${code}/manifest.json`;
  const rawManifest = read(manifestPath);
  const manifest = JSON.parse(rawManifest);
  const a = JSON.parse(read(`lib/l10n/app_${code}.arb`));
  if (!webText[code] || !a.retry || !a.manualImageError || !a.manualIntro) throw Error(`Missing localized controls: ${code}`);
  ui[code] = { ...webText[code], name, title: a.userGuideTitle, intro: a.manualIntro, retry: a.retry, error: a.manualImageError };
  const images = overviews.map((overview, index) => {
    const record = manifest[overview.id];
    const asset = `assets/manual/${code}/${overview.id}.webp`;
    if (!record || record.asset !== asset || !pubspec.includes(`- ${asset}`) || !record.demoDataOnly || record.displayRotation !== 0 || record.focusCrop !== null) throw Error(`Unexpected active image: ${code}/${overview.id}`);
    const bytes = fs.readFileSync(path.join(app, asset));
    const sha256 = digest(bytes);
    if (sha256 !== record.assetSha256 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw Error(`Image integrity/format mismatch: ${asset}`);
    const targets = overview.targets.map(id => {
      const rect = record.targets[id];
      if (!rect || !['x', 'y', 'width', 'height'].every(k => Number.isFinite(rect[k])) || rect.width <= 0 || rect.height <= 0) throw Error(`Missing target geometry: ${asset}/${id}`);
      return { id, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const publicPath = `images/${code}/${overview.id}.webp`;
    copies.push({ source: path.join(app, asset), target: path.join(root, 'guide', publicPath), sha256 });
    return { id: overview.id, title: a[overview.titleKey], order: index + 1, src: publicPath, width: record.width, height: record.height, sha256, targets };
  });
  if (images.some(i => !i.title || !Number.isInteger(i.width) || !Number.isInteger(i.height))) throw Error(`Missing image labels/dimensions: ${code}`);
  locales[code] = { name, direction: code === 'ar' ? 'rtl' : 'ltr', sourceManifest: manifestPath, sourceManifestSha256: digest(rawManifest), images };
}
const data = { schemaVersion: 2, localeOrder: languages.map(l => l.code), imageOrder: order, overlay: { color: '#E53935', strokeWidth: 1.5, maxRadius: 12, radiusFactor: 0.20 }, locales };
const version = digest(JSON.stringify({ data, ui, view: ['tools/manual-template.html', 'guide/manual.js', 'guide/manual.css'].map(relative => fs.readFileSync(path.join(root, relative), 'utf8').replaceAll('\r\n', '\n')) })).slice(0, 16);
data.contentVersion = version;
// All inputs are validated before any public output is written.
for (const copy of copies) {
  fs.mkdirSync(path.dirname(copy.target), { recursive: true });
  fs.copyFileSync(copy.source, copy.target);
  if (digest(fs.readFileSync(copy.target)) !== copy.sha256) throw Error('Copied image bytes changed');
}
const options = languages.map(l => `<option value="${l.code}">${esc(l.name)}</option>`).join('');
const picker = languages.map(l => `<a href="./?lang=${l.code}" lang="${l.code}">${esc(l.name)}</a>`).join('');
const originals = languages.map(l => `<section lang="${l.code}" dir="${l.code === 'ar' ? 'rtl' : 'ltr'}"><h2>${esc(l.name)}</h2><ul>${locales[l.code].images.map(i => `<li><a href="${i.src}?v=${i.sha256.slice(0, 12)}" target="_blank" rel="noopener">${i.order}. ${esc(i.title)}</a></li>`).join('')}</ul></section>`).join('');
let html = fs.readFileSync(path.join(root, 'tools/manual-template.html'), 'utf8')
  .replaceAll('__MANUAL_VERSION__', version)
  .replace('<!--LANGUAGES-->', options)
  .replace('<!--PICKER-->', picker)
  .replace('<!--MANUAL_UI-->', JSON.stringify(ui).replaceAll('<', '\\u003c'))
  .replace('<!--ORIGINALS-->', originals);
if (/<!--(?:LANGUAGES|PICKER|MANUAL_UI|ORIGINALS)-->/u.test(html)) throw Error('Unresolved manual template');
fs.writeFileSync(path.join(root, 'guide/index.html'), html);
fs.writeFileSync(path.join(root, 'guide/manual.json'), `${JSON.stringify(data, null, 2)}\n`);
console.log(`Exported ${languages.length} languages × ${overviews.length} current app images (${copies.length} byte-identical WebPs), with existing target rectangles. No archived captures or app changes.`);
