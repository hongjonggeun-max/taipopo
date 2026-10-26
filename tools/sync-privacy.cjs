// Export in-app policy text; preserve separately reviewed website release notes.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const arbDir = path.resolve(
  process.argv[2] || path.join(root, '../workshield/lib/l10n'),
);
const codes = [
  'ar',
  'de',
  'en',
  'es',
  'fr',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'pt',
  'ru',
  'th',
  'tr',
  'vi',
  'zh',
];
const policies = {};
const existingPolicies = require('./privacy-content.json');

for (const code of codes) {
  const source = JSON.parse(
    fs.readFileSync(path.join(arbDir, `app_${code}.arb`), 'utf8'),
  );
  const body = source.privacyPolicyBody;
  const effectiveDate = source.privacyPolicyEffectiveDate;
  const controller = code === 'ko' ? '홍종근' : 'Jonggeun Hong';
  const placeholders = body?.match(/\{effectiveDate\}/g) ?? [];
  if (
    typeof body !== 'string' ||
    effectiveDate !== '2026-08-23' ||
    placeholders.length !== 1 ||
    !body.includes('2026-10-14') ||
    !body.includes(controller) ||
    !body.includes('30') ||
    !body.includes('Google Drive') ||
    !body.includes('Firebase Crashlytics') ||
    !body.includes('taipopo.app@gmail.com')
  ) {
    throw new Error(`Incomplete privacy policy fields: ${code}`);
  }
  policies[code] = { effectiveDate, body };
  if (existingPolicies[code]?.websiteNotice) {
    policies[code].websiteNotice = existingPolicies[code].websiteNotice;
  }
}

fs.writeFileSync(
  path.join(__dirname, 'privacy-content.json'),
  `${JSON.stringify(policies, null, 2)}\n`,
);
console.log(`Exported ${codes.length} localized privacy policies.`);
