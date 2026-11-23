// Refresh only header branding, compact home cards and the existing notice text.
// Do not regenerate policies or replace unrelated unpublished content.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { brandImages } = require('./site-brand.cjs');
const notices = require('./record-tool-notices.json');
const root = path.resolve(__dirname, '..');
const cssVersions = Object.fromEntries(['styles.css', 'language.css'].map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name), 'utf8').replaceAll('\r\n', '\n')).digest('hex').slice(0, 12)]));
function versionStyles(html) {
  return html.replace(/(href="[^"]*?)(styles\.css|language\.css)(?:\?[^"\s]*)?"/gu, (_, prefix, name) => `${prefix}${name}?v=${cssVersions[name]}"`);
}
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
let updated = 0;
for (const prefix of ['', ...Object.keys(notices).map(code => `${code}/`)]) {
  for (const route of ['', 'support/', 'privacy/', 'deletion/', 'terms/']) {
    const file = path.join(root, prefix, route, 'index.html');
    const before = fs.readFileSync(file, 'utf8');
    const up = path.relative(path.dirname(file), root).replaceAll('\\', '/');
    const assets = up ? `${up}/` : '';
    let html = before.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gu, header => header.replace(/(<a\b[^>]*class="brand"[^>]*>)[\s\S]*?(<\/a>)/u, (_, open, close) => open + brandImages(assets) + close));
    if (!route) {
      html = html.replace(/(<section id="features" class="feature-grid">)([\s\S]*?)(<\/section>)/u, (_, open, body, close) => open + body.replaceAll('<article class="glass">', '<article class="glass compact-card">') + close);
      html = html.replace(/<section class="glass">(?=<h2>)/u, '<section class="glass compact-card compact-support">');
      const code = prefix ? prefix.slice(0, -1) : 'ko';
      const notice = notices[code];
      html = html.replace(/(<section\b[^>]*id="record-tool-notice"[^>]*>)[\s\S]*?(<\/section>)/u, (_, open, close) => `${open}<h2>${escapeHtml(notice.title)}</h2>${notice.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}${close}`);
    }
    html = versionStyles(html);
    if (html !== before) { fs.writeFileSync(file, html); updated++; }
  }
}
// The guide keeps its existing header/content; only refresh its shared CSS URLs.
const guideFile = path.join(root, 'guide/index.html');
const guideBefore = fs.readFileSync(guideFile, 'utf8');
const guideAfter = versionStyles(guideBefore);
if (guideAfter !== guideBefore) { fs.writeFileSync(guideFile, guideAfter); updated++; }
console.log(`Updated shared brand/cards/notices on ${updated} pages; other content retained.`);
