// Render published manual data without re-importing unreleased app changes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function renderManual(root, input, ui) {
const data = structuredClone(input); delete data.contentVersion; data.schemaVersion = 4;
const languages = data.localeOrder.map(code => ({ code, name: data.locales[code].name }));
const locales = data.locales;
const previewFile = path.join(root, 'guide/previews.json');
const previews = fs.existsSync(previewFile) ? JSON.parse(fs.readFileSync(previewFile, 'utf8')).previews : {};
for (const { code } of languages) for (const image of locales[code].images) {
  delete image.preview;
  const preview = previews[code]?.[image.id];
  if (!preview) continue;
  if (preview.sourceSha256 !== image.sha256 || preview.width !== image.width || preview.height >= image.height || preview.src !== `previews/${code}/${image.id}.webp` || digest(fs.readFileSync(path.join(root, 'guide', preview.src))) !== preview.sha256) throw Error(`Stale or invalid manual preview: ${code}/${image.id}`);
  image.preview = preview;
}
const version = digest(JSON.stringify({ data, ui, view: ['tools/manual-template.html', 'guide/manual.js', 'guide/manual.css', 'language.css'].map(relative => fs.readFileSync(path.join(root, relative), 'utf8').replaceAll('\r\n', '\n')) })).slice(0, 16);
data.contentVersion = version;
const options = languages.map(l => `<option value="${l.code}">${esc(l.name)}</option>`).join('');
const picker = languages.map(l => `<a href="./?lang=${l.code}" lang="${l.code}">${esc(l.name)}</a>`).join('');
const originals = languages.map(l => `<details class="manual-nojs-locale" lang="${l.code}" dir="${l.code === 'ar' ? 'rtl' : 'ltr'}"><summary>${esc(l.name)}</summary>${locales[l.code].chapters.map((chapter, index) => { const image = locales[l.code].images.find(i => i.id === chapter.screen); return `<section><h2>${index + 1}. ${esc(chapter.title)}</h2>${image ? `<p><a class="manual-nojs-original" href="${image.src}?v=${image.sha256.slice(0, 12)}" target="_blank" rel="noopener">${esc(ui[l.code].original)}: ${esc(image.title)}</a></p>` : ''}${chapter.features.map(feature => `<article class="manual-feature"><div class="manual-feature-copy"><h3>${esc(feature.title)}</h3><p class="manual-feature-body">${esc(feature.body)}</p>${feature.notice ? `<p class="manual-feature-notice">${esc(feature.notice)}</p>` : ''}</div></article>`).join('')}</section>`; }).join('')}</details>`).join('');
let html = fs.readFileSync(path.join(root, 'tools/manual-template.html'), 'utf8')
  .replaceAll('__MANUAL_VERSION__', version)
  .replaceAll('__HEADER_VERSION__', digest(fs.readFileSync(path.join(root, 'language.css'), 'utf8').replaceAll('\r\n', '\n')).slice(0, 12))
  .replace('<!--LANGUAGES-->', options)
  .replace('<!--PICKER-->', picker)
  .replace('<!--MANUAL_UI-->', JSON.stringify(ui).replaceAll('<', '\\u003c'))
  .replace('<!--ORIGINALS-->', originals);
if (/<!--(?:LANGUAGES|PICKER|MANUAL_UI|ORIGINALS)-->/u.test(html)) throw Error('Unresolved manual template');
return { data, html };
}
function writeManual(root, rendered) {
  fs.writeFileSync(path.join(root, 'guide/index.html'), rendered.html);
  fs.writeFileSync(path.join(root, 'guide/manual.json'), `${JSON.stringify(rendered.data, null, 2)}\n`);
}
module.exports = { renderManual, writeManual };
