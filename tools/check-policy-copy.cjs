'use strict';
// Functional checks for the website/app distinction, beyond renderer equality.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
if (!process.argv[2]) throw Error('Pass the read-only R3 source.');
const app = path.resolve(process.argv[2]);
const policies = require('./privacy-content.json');
const review = require('./website-disclosures.json').locales;
const manual = require('../guide/manual.json');
const { policyBodyMatchesApp } = require('./reviewed-app-copy.cjs');
const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
let languages = 0;
for (const [code, source] of Object.entries(policies)) {
  const arb = JSON.parse(fs.readFileSync(path.join(app, 'lib/l10n', `app_${code}.arb`), 'utf8'));
  const text = review[code];
  const html = fs.readFileSync(path.join(root, code, 'privacy/index.html'), 'utf8');
  assert.equal(source.effectiveDate, '2026-08-23', `${code}: do not invent a new effective date`);
  assert.ok(policyBodyMatchesApp(source, arb), `${code}: only the identified app sharing paragraph may differ from preserved provenance`);
  const section2 = source.body.match(/(?:^|\n)2\. [\s\S]*?(?=\n3\. |$)/u)?.[0];
  assert.ok(section2, code);
  const ambiguous = section2.split('\n').filter(line => /EXIF/iu.test(line) && !line.startsWith('• '));
  assert.equal(ambiguous.length, 1, `${code}: imported ambiguous paragraph count`);
  assert.ok(!html.includes(esc(ambiguous[0])), `${code}: broad photo-share/backup paragraph remains visible`);
  assert.equal(html.split(esc(text.gpsCache)).length - 1, 1, `${code}: current photo/ZIP distinction must appear once`);
  assert.ok(text.gpsCache.includes(text.metadataResidualNotice), `${code}: residual metadata qualification absent`);
  assert.notEqual(text.gpsCache, arb.locationPreservationNotice, `${code}: frozen app guarantee reused`);
  assert.ok(html.includes('data-policy-date-status="unconfirmed"'));
  assert.ok(html.includes(esc(text.privacyDateScope)), `${code}: unknown build/effective-date scope absent`);
  assert.ok(text.privacyDateScope.includes('17') && text.privacyDateScope.includes('40'), `${code}: separate build applicability`);
  assert.ok(html.includes(esc(`${text.privacyDateLabel}: ${source.effectiveDate}`)));
  const oldDate = source.body.split('\n').find(line => line.includes('{effectiveDate}'))
    .replaceAll('{effectiveDate}', source.effectiveDate);
  assert.ok(!html.includes(`<p>${esc(oldDate)}</p>`), `${code}: unqualified date label still shown`);
  const route = `${arb.settings} > ${arb.storageManagement} > ${arb.resetAllData}`;
  assert.ok(source.deletion.body.includes(route), `${code}: deletion guide actual menu mismatch`);
  assert.ok(source.body.includes(route), `${code}: privacy actual menu mismatch`);
  assert.ok(html.includes(esc(route)), `${code}: rendered privacy actual menu mismatch`);
  const feature = manual.locales[code].chapters.flatMap(chapter => chapter.features)
    .find(entry => entry.id === 'camera-gps-record');
  assert.equal(manual.locales[code].chapters.flatMap(chapter => chapter.features).length, 110);
  assert.equal(feature.body.split(text.gpsCache).length - 1, 1, `${code}: manual current metadata qualification`);
  assert.ok(feature.body.includes(arb.locationPreservationNotice) &&
    feature.body.includes(text.metadataResidualNotice), `${code}: candidate behavior and deployment qualification must both appear`);
  const history = fs.readFileSync(path.join(root, code, 'documents/build-17/index.html'), 'utf8');
  assert.ok(history.includes(`/${code}/documents/build-17/app/terms/`) && history.includes(`/${code}/documents/build-17/web/privacy/`));
  languages++;
}
assert.equal(languages, 16);
console.log('PASS16languages: one current photo-sharing paragraph, residual-EXIF qualification, retained date with unconfirmed17/40 scope, actual reset menu,110manualfeatures and historical-source links.');
