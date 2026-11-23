'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { locales } = require('./website-disclosures.json');
const { escapeHtml } = require('./privacy-page.cjs');

function homeBackupNotice(code) {
  const text = locales[code]?.currentBackup;
  if (!text) throw Error(`Missing reviewed backup notice: ${code}`);
  return `<p data-current-backup="${code}">${escapeHtml(text)}</p>`;
}

function applyHomepageBackupNotices(root = path.resolve(__dirname, '..')) {
  let count = 0;
  for (const code of Object.keys(locales)) {
    const files = [`${code}/index.html`, ...(code === 'ko' ? ['index.html'] : [])];
    for (const name of files) {
      const file = path.join(root, name);
      let html = fs.readFileSync(file, 'utf8');
      const notice = homeBackupNotice(code);
      const marker = /<p data-current-backup="[a-z]+">[\s\S]*?<\/p>/gu;
      const existing = [...html.matchAll(marker)];
      if (existing.length > 1) throw Error(`Duplicate backup notices: ${name}`);
      if (existing.length) {
        html = html.replace(marker, notice);
      } else {
        // Preserve the established homepage layouts and replace only the old
        // short KO/EN sentence, or add the same notice to a localized intro.
        const short = /<p>(?:백업 ZIP|Create a backup ZIP)[^<]*<\/p>/gu;
        const matches = [...html.matchAll(short)];
        if (matches.length === 1) html = html.replace(short, notice);
        else if (matches.length > 1) throw Error(`Ambiguous homepage backup text: ${name}`);
        else {
          const intro = /(<section class="page-intro">[\s\S]*?)(<a class="button primary")/u;
          if (!intro.test(html)) throw Error(`Missing homepage intro: ${name}`);
          html = html.replace(intro, (_, before, link) => before + notice + link);
        }
      }
      if (!html.includes(notice)) throw Error(`Backup notice missing: ${name}`);
      fs.writeFileSync(file, html);
      count++;
    }
  }
  return count;
}

module.exports = { homeBackupNotice, applyHomepageBackupNotices };
if (require.main === module) console.log(`Updated ${applyHomepageBackupNotices()} homepages from one reviewed 16-language backup notice source; layout and CSS unchanged.`);
