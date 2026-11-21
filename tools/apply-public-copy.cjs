'use strict';
// Website-only wording changes. App/ARB inputs are strictly read-only.
const fs = require('node:fs');
const path = require('node:path');
const { copy } = require('./public-copy.cjs');
const { escapeHtml } = require('./privacy-page.cjs');
const root = path.resolve(__dirname, '..');
const app = path.resolve(process.argv[2]);
if (!process.argv[2] || !fs.existsSync(path.join(app, 'pubspec.yaml'))) throw Error('Pass the approved +17 app checkout explicitly.');
const policyPath = path.join(root, 'tools/privacy-content.json');
const policies = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const disclosurePath = path.join(root, 'tools/website-disclosures.json');
const originalDisclosures = fs.readFileSync(disclosurePath, 'utf8');
const disclosures = JSON.parse(originalDisclosures);
function section(body, number) {
  const match = body.match(new RegExp(`(?:^|\\n\\n)${number}\\. [\\s\\S]*?(?=\\n\\n${number + 1}\\. |$)`, 'u'));
  if (!match) throw Error(`Missing section ${number}`);
  return match[0].trim();
}
for (const [code, policy] of Object.entries(policies)) {
  const a = JSON.parse(fs.readFileSync(path.join(app, `lib/l10n/app_${code}.arb`), 'utf8'));
  const text = copy[code];
  // Use the current reviewed app candidate. Published Play behavior is named
  // separately in termsImplementationStatus; do not restore the old preamble.
  if (!a.termsOfUseBody?.trim() || !text.supportMailPolicy?.trim()) {
    throw Error(`Missing approved operational copy: ${code}`);
  }
  policy.terms.body = a.termsOfUseBody;
  policy.terms.title = a.termsOfUse;
  policy.terms.effectiveDate = a.policyEffectiveDate;
  // Preserve sections 1-3 and 6-11, including the existing liability provisions.
  policy.terms.body = policy.terms.body.replace(section(policy.terms.body, 4), `${section(a.termsOfUseBody, 4)}\n\n${text.backupDuty}`);
  policy.terms.body = policy.terms.body.replace(section(policy.terms.body, 5), `${section(a.termsOfUseBody, 5)}\n\n${text.manualStart}\n\n${text.externalReset}`);
  policy.terms.reviewNotice = a.termsOfUseReviewNotice;
  const previousConfig = disclosures.locales[code].localConfig;
  const currentConfig = `TAIPOPO 1.0.0(17): ${policy.websiteNotice.paragraphs[0]}`;
  disclosures.locales[code].localConfig = currentConfig;
  // Edit existing text nodes only; preserve the current page structures and all assets.
  const prefixes = code === 'ko' ? ['', 'ko/'] : [`${code}/`];
  for (const prefix of prefixes) {
    const file = path.join(root, prefix, 'index.html');
    let html = fs.readFileSync(file, 'utf8').replaceAll(escapeHtml(previousConfig), escapeHtml(currentConfig));
    if (code === 'ko') {
      const replacements = {
        '현장 사진': '근무 중 남긴 사진',
        '작업 사진': '근무 중 남긴 사진',
        '오늘의 현장': '오늘의 근무지',
        '현장 기록도, 놓치지 않게.': '하루의 기록도, 놓치지 않게.',
        '현장에서 남긴 기록을': '일하며 남긴 기록을',
        '작업 사진과 메모를 함께 보관하고,': '근무 중 남긴 사진과 메모를 함께 보관하고,',
        '검토 중인 앱 후보는 광고와 신규 PRO 구매가 꺼진 설정입니다. 판매 조건·가격·실제 배포 상태는 확정 후 안내합니다.': currentConfig,
      };
      for (const [before, after] of Object.entries(replacements)) html = html.replaceAll(before, escapeHtml(after));
    }
    if (code === 'en') html = html.replaceAll('Work hours, site photos and money you\'re owed.', 'Work hours, photos from your workday and money you\'re owed.')
      .replaceAll('The app candidate under review has ads and new PRO purchases disabled. Sales terms, prices and distribution details will be announced once confirmed.', escapeHtml(currentConfig));
    fs.writeFileSync(file, html);
  }
}
fs.writeFileSync(policyPath, JSON.stringify(policies, null, 2) + '\n');
if (JSON.stringify(disclosures) !== JSON.stringify(JSON.parse(originalDisclosures))) {
  fs.writeFileSync(disclosurePath, JSON.stringify(disclosures, null, 2) + '\n');
}
console.log('Updated 16 website terms and public notices; app/ARBs read only.');
