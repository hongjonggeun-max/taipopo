// Preserve published text while refreshing stylesheet versions and web previews.
const fs = require('node:fs');
const path = require('node:path');
const { renderManual, writeManual } = require('./render-manual.cjs');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'guide/manual.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'guide/index.html'), 'utf8');
const ui = JSON.parse(html.match(/<script type="application\/json" id="manual-ui">([\s\S]*?)<\/script>/u)[1]);
const rendered = renderManual(root, data, ui);
writeManual(root, rendered);
console.log(`Refreshed published manual layout ${rendered.data.contentVersion}; existing 16-language bodies and original images preserved.`);
