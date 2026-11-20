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
const { zipBackupVersion } = require('./website-disclosures.json');

for (const code of codes) {
  const source = JSON.parse(
    fs.readFileSync(path.join(arbDir, `app_${code}.arb`), 'utf8'),
  );
  const body = source.privacyPolicyBody;
  const effectiveDate = source.privacyPolicyEffectiveDate;
  const revisionDate = body?.split('\n').slice(0, 8).join('\n').match(/\d{4}-\d{2}-\d{2}/u)?.[0];
  const controller = code === 'ko' ? '홍종근' : 'Jonggeun Hong';
  const placeholders = body?.match(/\{effectiveDate\}/g) ?? [];
  if (
    typeof body !== 'string' ||
    effectiveDate !== '2026-08-23' ||
    placeholders.length !== 1 ||
    !revisionDate ||
    source.privacyPolicyNoticeVersion !== '2026-11-07' ||
    !source.privacyPolicyProcessingNotice?.includes('taipopo-site-theme') ||
    !source.termsOfUseReviewNotice?.includes('2026-11-07') ||
    !body.includes(controller) ||
    !body.includes('30') ||
    !body.includes(source.backupZipPrivacy) ||
    !body.includes('Firebase Crashlytics') ||
    !body.includes('taipopo.app@gmail.com')
  ) {
    throw new Error(`Incomplete privacy policy fields: ${code}`);
  }
  policies[code] = {
    locale: code,
    effectiveDate,
    revisionDate,
    body,
    noticeVersion: source.privacyPolicyNoticeVersion,
    processingNotice: source.privacyPolicyProcessingNotice,
    zipBackup: {
      version: zipBackupVersion,
      heading: source.dataManagement,
      device: source.backupFileSaveSubtitle,
      share: source.backupFileShareSubtitle,
      restore: source.externalBackupRestoreActionSubtitle,
      privacy: source.backupZipPrivacy,
    },
    deletion: {
      body: source.dataDeleteGuideBody,
      effectiveDate: source.policyEffectiveDate,
      notice: source.dataDeletePrivacyNotice,
    },
    // This publication updates privacy/deletion guidance, not the deployed terms.
    terms: existingPolicies[code].terms,
  };
  if (Object.values(policies[code].zipBackup).some((value) => !value?.trim())) {
    throw new Error(`Incomplete ZIP backup guidance: ${code}`);
  }
  const [heading, ads, purchases, localStorage, risk] =
    source.privacyPolicyAdditionalNotice.split('\n\n');
  const websiteSales = existingPolicies[code].websiteNotice.paragraphs.at(-3);
  const paragraphs = [ads, purchases, websiteSales, localStorage, risk];
  if (!heading?.trim() || paragraphs.some((value) => !value?.trim())) {
    throw new Error(`Incomplete website notice: ${code}`);
  }
  policies[code].websiteNotice = { heading, paragraphs };
}

fs.writeFileSync(
  path.join(__dirname, 'privacy-content.json'),
  `${JSON.stringify(policies, null, 2)}\n`,
);
console.log(`Exported ${codes.length} localized privacy policies.`);
