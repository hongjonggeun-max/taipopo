// Intentionally update GPS fields only; keep the latest published guide and policy.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const guidance = require('./gps-guidance.json');
const scope = require('./gps-guidance-scope.json');
const { renderManual, writeManual } = require('./render-manual.cjs');
const data = JSON.parse(fs.readFileSync(path.join(root, 'guide/manual.json'), 'utf8'));
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
for (const code of data.localeOrder) {
  for (const chapter of data.locales[code].chapters) for (const feature of chapter.features) {
    const candidate = guidance[code][feature.id];
    if (!candidate) continue;
    Object.assign(feature, candidate);
    if (['workplace-gps-address', 'camera-gps-record', 'camera-coordinates', 'camera-address'].includes(feature.id)) {
      feature.notice = scope[code] + (candidate.notice ? '\n\n' + candidate.notice : '');
    }
  }
  // Keep the published policy body/legacy processing disclosures unchanged.
  // This separately dated, scoped paragraph describes the new GPS candidate.
  const gps = guidance[code];
  const paragraphs = [scope[code], gps['camera-gps-record'].body, gps['workplace-gps-address'].body, gps['camera-address'].body, gps['camera-gps-record'].notice];
  const notice = `<section class="glass compact-card" data-gps-version-notice="2026-11-23"><h2>${escapeHtml(gps['camera-gps-record'].title)} · 2026-11-23</h2>${paragraphs.map(p => `<p>${escapeHtml(p).replaceAll('\n', '<br>')}</p>`).join('')}</section>`;
  for (const prefix of code === 'ko' ? ['', 'ko/'] : [`${code}/`]) {
    const file = path.join(root, prefix, 'privacy/index.html');
    let html = fs.readFileSync(file, 'utf8').replace(/<section\b[^>]*data-gps-version-notice="[^"]*"[^>]*>[\s\S]*?<\/section>/gu, '');
    if (!html.includes('<footer')) throw Error(`Missing policy footer: ${prefix}`);
    html = html.replace('<footer', notice + '<footer');
    fs.writeFileSync(file, html);
  }
}
// Reuse public per-language UI labels, names and links, not candidate metadata.
const currentHtml = fs.readFileSync(path.join(root, 'guide/index.html'), 'utf8');
const currentUi = currentHtml.match(/<script type="application\/json" id="manual-ui">([\s\S]*?)<\/script>/u);
if (!currentUi) throw Error('Missing existing public manual UI');
const seo = currentHtml.match(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/u)?.[0];
if (!seo) throw Error('Preserve the existing public guide SEO block before rendering');
const rendered = renderManual(root, data, JSON.parse(currentUi[1]));
rendered.html = rendered.html.includes('<!-- SEO:START -->')
  ? rendered.html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/u, seo)
  : rendered.html.replace('</head>', seo + '\n</head>');
writeManual(root, rendered);
console.log('Updated three GPS guide entries per locale, retained all other published features and guide SEO, and added scoped candidate notices on privacy pages.');
