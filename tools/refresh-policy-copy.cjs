'use strict';
// Refresh only the affected public manual wording; do not re-import app data
// or replace the existing manual image/provenance metadata.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { renderManual, writeManual } = require('./render-manual.cjs');
const { publicManualChapters } = require('./public-copy.cjs');
const root = path.resolve(__dirname, '..');
if (!process.argv[2]) throw Error('Pass the read-only reviewed app source.');
const app = path.resolve(process.argv[2]);
const data = JSON.parse(fs.readFileSync(path.join(root, 'guide/manual.json'), 'utf8'));
const original = structuredClone(data);
const html = fs.readFileSync(path.join(root, 'guide/index.html'), 'utf8');
const ui = JSON.parse(html.match(/<script type="application\/json" id="manual-ui">([\s\S]*?)<\/script>/u)[1]);
for (const [code, locale] of Object.entries(data.locales)) {
  const arb = JSON.parse(fs.readFileSync(path.join(app, 'lib/l10n', `app_${code}.arb`), 'utf8'));
  const affected = new Set(['camera-gps-record', 'restore']);
  const reviewed = publicManualChapters(locale.chapters, code, arb)
    .flatMap(chapter => chapter.features);
  for (const id of affected) {
    const updated = reviewed.find(feature => feature.id === id);
    const current = locale.chapters.flatMap(chapter => chapter.features)
      .find(feature => feature.id === id);
    assert.ok(updated && current, `${code}/${id}`);
    current.body = updated.body;
  }
  const before = original.locales[code].chapters.flatMap(chapter => chapter.features);
  for (const feature of locale.chapters.flatMap(chapter => chapter.features)) {
    const expected = before.find(entry => entry.id === feature.id);
    assert.deepEqual({ ...feature, body: expected.body }, expected, `${code}/${feature.id}: other fields changed`);
    if (!affected.has(feature.id)) assert.equal(feature.body, expected.body);
  }
  assert.deepEqual(locale.images, original.locales[code].images, `${code}: image provenance changed`);
}
writeManual(root, renderManual(root, data, ui));
console.log('Updated only16 camera-GPS and restore manual bodies;110 features, UI strings and original image metadata preserved.');
