// Preserve existing routes and layouts; add crawl metadata after content generation.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const codes = Object.keys(require('./privacy-content.json'));
const base = 'https://taipopo.app';
const reviewed = require('./website-disclosures.json').reviewDate;
const routes = ['', 'support/', 'privacy/', 'deletion/', 'terms/'];
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const canonical = (code, route) => code === 'ko'
  ? `${base}/${route === 'privacy/' ? 'ko/privacy/' : route}`
  : `${base}/${code}/${route}`;
const site = {
  '@context': 'https://schema.org', '@type': 'WebSite',
  name: 'TAIPOPO(타이포포)', alternateName: ['TAIPOPO', '타이포포'],
  url: `${base}/`, inLanguage: codes,
};
const sitemapUrls = new Set();

function update(file, code, route) {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/\n?<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->\n?/gu, '\n');
  html = html.replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/gu, '');
  html = html.replace(/<meta\b[^>]*(?:property="og:(?:url|site_name|locale)"|name="robots")[^>]*>/gu, '');
  const url = route === 'guide/' ? `${base}/guide/` : canonical(code, route);
  if (code === 'ko' && !route) {
    html = html.replace(/<title>[^<]*<\/title>/u,
      '<title>TAIPOPO(타이포포) · 근무 기록·사진·정산·리포트</title>');
    html = html.replace(/<meta property="og:title" content="[^"]*">/u,
      '<meta property="og:title" content="TAIPOPO(타이포포) · 일하는 하루를 정리하다">');
    html = html.replaceAll('aria-label="TAIPOPO 홈"', 'aria-label="TAIPOPO(타이포포) 홈"');
  }
  const tags = [
    `<!-- SEO:START -->`, `<link rel="canonical" href="${url}">`,
    `<meta property="og:url" content="${url}">`,
    '<meta property="og:site_name" content="TAIPOPO">',
    `<meta name="taipopo-web-review" content="${reviewed}">`,
  ];
  if (route === 'terms/') tags.push('<meta name="robots" content="noindex,follow">');
  if (route !== 'guide/' && route !== 'terms/') {
    for (const other of codes) tags.push(`<link rel="alternate" hreflang="${other}" href="${canonical(other, route)}">`);
    tags.push(`<link rel="alternate" hreflang="x-default" href="${canonical('ko', route)}">`);
  }
  if (code === 'ko' && !route) tags.push(`<script type="application/ld+json">${JSON.stringify(site)}</script>`);
  tags.push('<!-- SEO:END -->');
  html = html.replace(/\s*<\/head>/u, `\n${tags.join('\n')}\n</head>`);
  if (route !== 'terms/') sitemapUrls.add(url);
  if (html !== fs.readFileSync(file, 'utf8')) fs.writeFileSync(file, html);
}
for (const code of codes) for (const route of routes) update(path.join(root, code, route, 'index.html'), code, route);
for (const route of routes) update(path.join(root, route, 'index.html'), 'ko', route);
update(path.join(root, 'guide/index.html'), 'ko', 'guide/');
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [...sitemapUrls].sort().map(url => `  <url><loc>${esc(url)}</loc><lastmod>${reviewed}</lastmod></url>`).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
console.log(`Updated SEO for 86 existing pages; sitemap has ${sitemapUrls.size} canonical URLs. Terms drafts remain noindex.`);
