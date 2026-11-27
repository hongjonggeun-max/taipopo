const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const arbDir = path.resolve(process.argv[2] || path.join(root, '../workshield/lib/l10n'));
const policies = require('./privacy-content.json');
const { reviewDate } = require('./website-disclosures.json');
const { renderTerms, renderDeletion, renderSupportProcessing } = require('./privacy-page.cjs');
const { copy } = require('./public-copy.cjs');
function section(body, number) {
  return body.match(new RegExp(`(?:^|\\n\\n)${number}\\. [\\s\\S]*?(?=\\n\\n${number + 1}\\. |$)`, 'u'))?.[0].trim();
}
let checked = 0;
for (const [code, policy] of Object.entries(policies)) {
  const app = JSON.parse(fs.readFileSync(path.join(arbDir, `app_${code}.arb`), 'utf8'));
  if (policy.noticeVersion !== reviewDate || policy.noticeVersion !== app.privacyPolicyNoticeVersion || policy.processingNotice !== app.privacyPolicyProcessingNotice ||
      !policy.terms.body?.trim() || policy.terms.effectiveDate !== app.policyEffectiveDate ||
      policy.terms.reviewNotice !== app.termsOfUseReviewNotice || policy.effectiveDate !== '2026-08-23') {
    throw new Error(`App/web legal body, date or review version drift: ${code}`);
  }
  for (const number of [1, 2, 3, 6, 7, 8, 9, 10, 11]) {
    if (!section(policy.terms.body, number) || section(policy.terms.body, number) !== section(app.termsOfUseBody, number)) throw Error(`Terms clause ${number} differs from approved app source: ${code}`);
  }
  if (section(policy.terms.body, 4) !== `${section(app.termsOfUseBody, 4)}\n\n${copy[code].backupDuty}` || section(policy.terms.body, 5) !== `${section(app.termsOfUseBody, 5)}\n\n${copy[code].manualStart}\n\n${copy[code].externalReset}` || /Google Drive|appDataFolder/u.test(policy.terms.body)) throw Error(`Stale backup terms or missing verified backup conditions: ${code}`);
  const preamble = body => body.split(/\n\n1\. /u)[0];
  if (preamble(policy.terms.body) !== preamble(app.termsOfUseBody)) throw Error(`Candidate terms provider or assent introduction differs from app source: ${code}`);
  if (policy.deletion.body !== app.dataDeleteGuideBody || policy.deletion.notice !== app.dataDeletePrivacyNotice || policy.deletion.effectiveDate !== app.policyEffectiveDate) throw new Error(`App/web deletion mismatch: ${code}`);
  const deletion = fs.readFileSync(path.join(root, code, 'deletion/index.html'), 'utf8');
  if (!deletion.includes(renderDeletion(policy).html) || deletion.includes('{effectiveDate}')) throw new Error(`Deletion draft mismatch: ${code}`);
  for (const other of Object.keys(policies)) {
    if (!deletion.includes(`href="../../${other}/deletion/"`)) throw new Error(`Deletion language route missing: ${code} -> ${other}`);
  }
  const support = fs.readFileSync(path.join(root, code, 'support/index.html'), 'utf8');
  if (!support.includes(renderSupportProcessing(policy))) throw new Error(`Received-email notice missing: ${code}`);
  const terms = fs.readFileSync(path.join(root, code, 'terms/index.html'), 'utf8');
  if (!terms.includes(renderTerms(policy).html) || terms.includes('{effectiveDate}') ||
      !terms.includes(`lang="${code}" dir="${code === 'ar' ? 'rtl' : 'ltr'}"`)) {
    throw new Error(`Incomplete terms draft: ${code}`);
  }
  for (const other of Object.keys(policies)) {
    if (!terms.includes(`href="../../${other}/terms/"`)) throw new Error(`Terms language route missing: ${code} -> ${other}`);
  }
  const privacy = fs.readFileSync(path.join(root, code, 'privacy/index.html'), 'utf8');
  for (const marker of ['GitHub Pages', 'taipopo-site-theme', 'Gmail', policy.zipBackup.privacy, `data-notice-version="${policy.noticeVersion}"`]) {
    if (!privacy.includes(marker)) throw new Error(`Missing shared disclosure ${marker}: ${code}`);
  }
  for (const relative of ['index.html', 'support/index.html', 'privacy/index.html', 'terms/index.html', 'deletion/index.html']) {
    const file = path.join(root, code, relative);
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('class="legal-links"')) throw new Error(`Missing legal navigation: ${code}/${relative}`);
    for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/gu)) {
      if (/^(?:https?:|mailto:|#|data:)/u.test(raw)) continue;
      const decoded = decodeURIComponent(raw.split(/[?#]/u, 1)[0]);
      let target = decoded.startsWith('/')
        ? path.join(root, decoded.slice(1))
        : path.resolve(path.dirname(file), decoded || '.');
      if (!path.extname(target)) target = path.join(target, 'index.html');
      if (!fs.existsSync(target)) throw new Error(`Broken local link ${raw}: ${code}/${relative}`);
    }
    checked++;
  }
}
for (const relative of ['index.html', 'support/index.html', 'privacy/index.html', 'terms/index.html', 'deletion/index.html']) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!html.includes('class="legal-links"')) throw new Error(`Root legal navigation missing: ${relative}`);
}
console.log(`PASS: ${checked} localized legal/support/home pages; common notices, unchanged effective dates, draft versions and all local links.`);
