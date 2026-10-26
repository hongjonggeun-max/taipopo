const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const arbDir = path.resolve(
  process.argv[2] || path.join(root, '../workshield/lib/l10n'),
);
const policies = require('./privacy-content.json');
const { renderPolicy } = require('./privacy-page.cjs');
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

if (JSON.stringify(Object.keys(policies).sort()) !== JSON.stringify([...codes].sort())) {
  throw new Error('Privacy source locale set does not match the 16 supported locales.');
}

for (const code of codes) {
  const arb = JSON.parse(
    fs.readFileSync(path.join(arbDir, `app_${code}.arb`), 'utf8'),
  );
  const source = policies[code];
  if (
    source.effectiveDate !== arb.privacyPolicyEffectiveDate ||
    source.body !== arb.privacyPolicyBody
  ) {
    throw new Error(`Website privacy source differs from app ARB: ${code}`);
  }

  const file = path.join(root, code, 'privacy', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const expectedDirection = code === 'ar' ? 'rtl' : 'ltr';
  const resolved = source.body.replaceAll(
    '{effectiveDate}',
    source.effectiveDate,
  );
  const policyTitle = resolved.split('\n')[0]
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  const controller = code === 'ko' ? '홍종근' : 'Jonggeun Hong';
  const renderedPolicy = renderPolicy(source);

  if (!html.includes(renderedPolicy.html)) {
    throw new Error(`Rendered privacy body differs from app source: ${code}`);
  }

  for (const required of [
    `<html lang="${code}" dir="${expectedDirection}">`,
    `<title>${policyTitle} · TAIPOPO</title>`,
    '2026-08-23',
    '2026-10-14',
    controller,
    'Google Drive',
    'Google Sign-In',
    'appDataFolder',
    'Firebase Crashlytics',
    'ML Kit',
    'Downloads',
    'ZIP/PDF',
    'taipopo.app@gmail.com',
    '<div class="policy-content">',
  ]) {
    if (!html.includes(required)) {
      throw new Error(`Missing ${JSON.stringify(required)} in ${code} privacy page.`);
    }
  }
  if (html.includes('{effectiveDate}')) {
    throw new Error(`Unresolved effective-date placeholder: ${code}`);
  }
  if ((html.match(/<h2>/g) ?? []).length < 8) {
    throw new Error(`Privacy policy sections are incomplete: ${code}`);
  }
  for (const target of codes) {
    if (!html.includes(`href="../../${target}/privacy/"`)) {
      throw new Error(`Privacy language link ${code} -> ${target} is missing.`);
    }
  }
}

const englishPrivacy = fs.readFileSync(
  path.join(root, 'en/privacy/index.html'),
  'utf8',
);
if (
  /currently available in Korean|Read the privacy policy \(Korean\)|original Korean policy/i.test(
    englishPrivacy,
  )
) {
  throw new Error('English privacy page still says the policy is Korean-only.');
}

const rootPrivacy = fs.readFileSync(path.join(root, 'privacy/index.html'), 'utf8');
if (!rootPrivacy.includes(renderPolicy(policies.ko).html)) {
  throw new Error('The root privacy URL must contain the full Korean policy.');
}
for (const code of codes) {
  const notice = policies[code].websiteNotice;
  if (
    !notice?.heading ||
    notice.paragraphs?.length !== 4 ||
    !notice.paragraphs[2].includes('Google Sign-In')
  ) {
    throw new Error(`Missing website release/account disclosure: ${code}`);
  }
}
if (
  !rootPrivacy.includes(
    'https://hongjonggeun-max.github.io/taipopo-privacy/privacy/',
  )
) {
  throw new Error('The existing public Korean policy URL was removed.');
}
for (const target of codes) {
  if (!rootPrivacy.includes(`href="../${target}/privacy/"`)) {
    throw new Error(`Root privacy language link to ${target} is missing.`);
  }
}

const manualScript = fs.readFileSync(path.join(root, 'guide/manual.js'), 'utf8');
if (!manualScript.includes("href=`../${code}/privacy/`")) {
  throw new Error('The user guide does not route its privacy link by locale.');
}

for (const code of codes) {
  const home = fs.readFileSync(path.join(root, code, 'index.html'), 'utf8');
  if (!/href="(?:\.\/)?privacy\/"/.test(home)) {
    throw new Error(`Localized home privacy link is missing: ${code}`);
  }
}

console.log(
  'PASS: app/web privacy source parity, 16 localized bodies, lang/dir/title, dates, links and placeholders.',
);
