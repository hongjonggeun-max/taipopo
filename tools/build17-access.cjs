'use strict';
const copy = require('./build17-copy.json');
const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function build17Path(locale, source, document) {
  if (!copy[locale]) throw Error(`Unknown document language: ${locale}`);
  if (!source && !document) return `/${locale}/documents/build-17/`;
  if (!['app','web'].includes(source) || !['terms','privacy'].includes(document)) throw Error('Invalid preserved document');
  return `/${locale}/documents/build-17/${source}/${document}/`;
}
function renderBuild17Access(locale) {
  const text=copy[locale];
  if (!text) throw Error(`Build17 copy missing: ${locale}`);
  return `<section class="glass policy-build-access" aria-labelledby="build17-access-heading"><h2 id="build17-access-heading">${escape(text.entryHeading)}</h2><p>${escape(text.buildHelp)}</p><p>${escape(text.currentReview)}</p><p><a class="button" href="${build17Path(locale)}">${escape(text.viewBuild17)}</a></p></section>`;
}
module.exports={copy,escape,build17Path,renderBuild17Access};
