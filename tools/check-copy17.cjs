'use strict';
// Functional copy regression checks, independent of HTML renderer equality tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const app = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw Error('Pass the +17 app source explicitly.');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const policies = JSON.parse(read('tools/privacy-content.json'));
const data = JSON.parse(read('guide/manual.json'));
const copy = JSON.parse(read('tools/public-copy.json'));
const readiness = JSON.parse(read('tools/publication-readiness.json'));
const { escapeHtml } = require('./privacy-page.cjs');
const baseline = JSON.parse(execFileSync('git', ['show', '6939c57671c1efdcca69ea1ce6f7e9d38e41b299:guide/manual.json'], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
const oldPolicies = JSON.parse(execFileSync('git', ['show', '6939c57671c1efdcca69ea1ce6f7e9d38e41b299:tools/privacy-content.json'], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
const removed = ['backup-drive', 'drive-management', 'restore-drive'];
const allowedBodies = new Set(['memo', 'work-photos', 'camera-flash', 'camera-memo', 'camera-exposure', 'camera-capture', 'camera-landscape', 'data-usage', 'backup-device', 'backup-external', 'backup-share', 'restore', 'camera-gps-record', 'camera-coordinates', 'camera-address', 'workplace-gps-address']);
const section = (body, n) => body.match(new RegExp(`(?:^|\\n\\n)${n}\\. [\\s\\S]*?(?=\\n\\n${n + 1}\\. |$)`, 'u'))?.[0].trim();
let preserved = 0, menus = 0;
for (const [code, locale] of Object.entries(data.locales)) {
  const arb = JSON.parse(fs.readFileSync(path.join(app, `lib/l10n/app_${code}.arb`), 'utf8'));
  const features = locale.chapters.flatMap(c => c.features);
  const oldFeatures = baseline.locales[code].chapters.flatMap(c => c.features);
  assert.deepEqual(features.map(f => f.id), oldFeatures.filter(f => !removed.includes(f.id)).map(f => f.id), `${code}: unrelated feature addition/removal/reordering`);
  for (const feature of features) {
    const previous = oldFeatures.find(f => f.id === feature.id);
    for (const field of ['title', 'notice', 'icon']) {
      if (field === 'title' && ['camera-address','workplace-gps-address','camera-options','camera-coordinates'].includes(feature.id)) continue;
      if (field === 'notice' && feature.id === 'workplace-gps-address') continue;
      assert.deepEqual(feature[field], previous[field], `${code}/${feature.id}/${field}: unrequested change`);
    }
    if (!allowedBodies.has(feature.id)) { assert.equal(feature.body, previous.body, `${code}/${feature.id}: normal copy changed`); preserved++; }
  }
  assert.deepEqual(locale.images, baseline.locales[code].images, `${code}: image metadata changed`);
  assert.deepEqual(locale.chapters.map(c => [c.id, c.title, c.screen, c.icon]), baseline.locales[code].chapters.map(c => [c.id, c.title, c.screen, c.icon]));
  const body = id => features.find(f => f.id === id).body;
  assert.equal(features.find(f => f.id === 'camera-options').title, arb.cameraOptions, `${code}: camera options title`);
  assert.equal(features.find(f => f.id === 'camera-coordinates').title, arb.cameraGpsCoordinatesDisplay, `${code}: GPS display title`);
  assert.equal(body('camera-coordinates'), arb.manualPurposeCoordinates, `${code}: GPS display requires recording and valid fix`);
  for (const [id, key] of [['backup-device','backupFileSave'], ['backup-external','externalStorageBackupAction'], ['backup-share','backupFileShare']]) {
    assert.ok(body(id).includes(`${arb.settings} > ${arb.dataManagement} > ${arb[key]}`), `${code}/${id}: wrong menu path`); menus++;
  }
  for (const key of ['localRestoreSourceDevice','localRestoreSourceExternal','externalBackupRestoreAction','localRestoreDeviceActionSubtitle','localRestoreExternalActionSubtitle','externalBackupRestoreActionSubtitle']) {
    assert.ok(body('restore').includes(arb[key]), `${code}: restore path/step missing ${key}`); menus++;
  }
  assert.ok(body('restore').includes(arb.manualPurposeRestore.split('\n\n').at(-1)), `${code}: replacement warning missing`);
  assert.ok(body('camera-gps-record').includes(arb.gpsLocationRecordSubtitle), `${code}: local GPS purpose missing`);
  assert.ok(body('camera-gps-record').includes(arb.cameraGpsUsageNotice), `${code}: camera-first default-OFF choice missing`);
  assert.ok(body('camera-gps-record').includes(arb.locationPreservationNotice), `${code}: existing EXIF/share scope missing`);
  for (const [id,key] of [['camera-address','showAddressSubtitle'],['workplace-gps-address','manualPurposeWorkplaceGpsAddress']]) {
    assert.equal(body(id),arb[key],`${code}/${id}: blocked address notice differs`);
    assert.ok(!body(id).includes(arb.cameraAddressLookupNotice)&&!body(id).includes(arb.workplaceGpsLookupDisclosure),`${code}/${id}: obsolete opt-in address promise`);
  }
  assert.ok(body('backup-share').includes(arb.backupFileDisclosure), `${code}: unencrypted backup scope missing`);
  assert.ok(body('restore').includes(arb.legacyDriveBackupNotice), `${code}: older Drive copy distinction missing`);
  assert.equal(body('data-usage'), copy[code].dataUsage);
  assert.ok(body('data-usage').includes('1.0.0(17)'));
  assert.equal(copy[code].services.length, 6);
  const oldTerms = oldPolicies[code].terms.body;
  const newTerms = policies[code].terms.body;
  const preamble = value => value.split(/\n\n1\. /u)[0];
  assert.equal(preamble(newTerms), preamble(arb.termsOfUseBody), `${code}: candidate provider/assent text differs from current app`);
  assert.equal(policies[code].terms.effectiveDate, oldPolicies[code].terms.effectiveDate, `${code}: terms effective date invented`);
  for (const n of [1,2,3,6,7,8,10,11]) assert.equal(section(newTerms,n), section(arb.termsOfUseBody,n), `${code}: legal clause ${n} differs from current app`);
  assert.equal(section(newTerms,9), section(arb.termsOfUseBody,9), `${code}: statutory liability clause differs from current bundled terms`);
  assert.ok(section(newTerms,4).includes(copy[code].backupDuty), `${code}: separate backup duty missing`);
  assert.ok(section(newTerms,5).includes(arb.backupFileDisclosure), `${code}: terms backup scope missing`);
  for (const field of ['manualStart','externalReset']) assert.ok(section(newTerms,5).includes(copy[code][field]), `${code}: verified ${field} condition missing`);
  assert.ok(!newTerms.includes(copy[code].sharingResponsibility), `${code}: blanket external-processing responsibility retained`);
  assert.equal(policies[code].body, arb.privacyPolicyBody, `${code}: current app privacy text not synchronized`);
  assert.equal(policies[code].processingNotice, arb.privacyPolicyProcessingNotice, `${code}: current app notices not synchronized`);
  assert.ok(copy[code].externalIntroduction?.trim(), `${code}: named external processing introduction missing`);
  assert.equal(policies[code].effectiveDate, oldPolicies[code].effectiveDate, `${code}: policy effective date invented`);
  const resetPath = `${arb.settings} > ${arb.storageManagement} > ${arb.resetAllData}`;
  assert.ok(policies[code].deletion.body.includes(resetPath), `${code}: wrong reset path`);
  for (const route of ['', 'privacy/', 'terms/', 'deletion/', 'support/']) {
    const html = read(`${code}/${route}index.html`);
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gu, '').replace(/<[^>]*>/gu, '');
    if (['privacy/', 'deletion/', 'support/'].includes(route)) {
      for (const paragraph of copy[code].supportMailPolicy.split('\n\n')) {
        assert.ok(paragraph.trim() && visible.includes(escapeHtml(paragraph)), `${code}/${route}: approved support retention/deletion policy missing`);
      }
    }
    assert.ok(!/검토용 문안|검토판|검토 중인 앱 후보|Review draft|candidate under review|审核草案|確認用草案|समीक्षा मसौदा|Minuta para revisão|Borrador para revisión|Projet de révision|Prüfentwurf|Draf tinjauan|Bản nháp đánh giá|Черновик для проверки|İnceleme taslağı|مسودة للمراجعة|Bozza da esaminare|ร่างเพื่อทบทวน/iu.test(visible), `${code}/${route}: internal draft wording`);
    if (route === 'terms/') {
      assert.ok(!/Google Drive|appDataFolder|backup\/restore/u.test(visible), `${code}: stale direct Drive terms`);
      assert.ok(!html.includes('plus17-consent-review-'), `${code}: internal document identifier exposed`);
    }
    if (route === 'privacy/') {
      const numbers = [...html.matchAll(/<h2>(\d+)\. /gu)].map(match => Number(match[1]));
      assert.deepEqual(numbers, Array.from({ length: 18 }, (_, index) => index + 1), `${code}: missing or duplicate policy section numbers`);
      assert.ok(visible.includes(escapeHtml(copy[code].externalIntroduction)), `${code}: ambiguous external processing introduction`);
      const providerDeletion = escapeHtml(copy[code].providerMailDeletion)
        .replaceAll('https://policies.google.com/technologies/retention', 'Google')
        .replaceAll('https://support.google.com/mail/answer/7401', 'Gmail');
      assert.ok(visible.includes(providerDeletion), `${code}: provider deletion distinction missing`);
      for (const url of ['https://policies.google.com/technologies/retention', 'https://support.google.com/mail/answer/7401']) {
        assert.ok(html.includes(`href="${url}"`), `${code}: provider deletion reference is not linked`);
      }
    }
  }
}
for (const file of ['index.html', 'ko/index.html']) assert.ok(!/현장|작업 사진/u.test(read(file)), file);
assert.ok(!/site photos/u.test(read('en/index.html')));
assert.deepEqual(readiness.blockers.map(item => item.id).sort(), [
  'terms_effective_date_and_assent', 'external_processing_and_transfers',
  'support_mail_retention', 'operator_security_measures',
].sort());
for (const blocker of readiness.blockers) assert.ok(blocker.id && blocker.required && ['BLOCKED','PASS'].includes(blocker.status));
console.log(`PASS: 16 locales; ${preserved} unrelated feature bodies preserved; ${menus} exact app menu/step labels; original legal clauses, reset routes, no stale Drive actions/internal draft copy.`);
if (process.argv.includes('--publication')) {
  if (readiness.status !== 'PASS' || readiness.blockers.some(item => item.status !== 'PASS')) {
    console.error(`BLOCKED: unresolved publication prerequisites: ${readiness.blockers.filter(item => item.status !== 'PASS').map(item => item.id).join(', ') || 'overall readiness'}.`);
    process.exitCode = 2;
  }
}
