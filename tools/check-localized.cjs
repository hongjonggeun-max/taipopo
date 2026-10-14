const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const codes = ['ar','de','en','es','fr','hi','id','it','ja','ko','pt','ru','th','tr','vi','zh'];
const pages = [['index.html',0],['support/index.html',1],['privacy/index.html',1]];
let count = 0;
for (const code of codes) for (const [relative, nested] of pages) {
  const file = path.join(root, code, relative);
  if (!fs.existsSync(file)) throw new Error(`Missing localized page: ${code}/${relative}`);
  const html = fs.readFileSync(file, 'utf8');
  if (!new RegExp(`<html[^>]*lang="${code}"`).test(html)) throw new Error(`Wrong/missing lang attribute: ${code}/${relative}`);
  if (!html.includes('class="language-picker"') || !html.includes('<svg aria-hidden="true" viewBox="0 0 24 24">')) throw new Error(`Missing globe language picker: ${code}/${relative}`);
  for (const other of codes) if (!html.includes(`lang="${other}"`)) throw new Error(`Picker missing ${other}: ${code}/${relative}`);
  const translatedContent = html.replace(/<details class="language-picker">[\s\S]*?<\/details>/, '');
  if (code !== 'ko' && /[가-힣]/.test(translatedContent)) throw new Error(`Unexpected Korean text in ${code}/${relative}`);
  const prefix = nested ? '../../' : '../';
  for (const asset of ['styles.css','language.css','site.js','assets/symbol.svg']) {
    const target = path.resolve(path.dirname(file), prefix, asset);
    if (!fs.existsSync(target)) throw new Error(`Missing asset ${asset}: ${code}/${relative}`);
  }
  if (!html.includes(`?lang=${code}`) && relative !== 'privacy/index.html') throw new Error(`Guide link missing locale ${code}: ${relative}`);
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|#|data:)/.test(raw)) continue;
    const urlPath = decodeURIComponent(raw.split(/[?#]/,1)[0]);
    let target = path.resolve(path.dirname(file), urlPath || '.');
    if (!path.extname(target)) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) throw new Error(`Broken local link ${raw}: ${code}/${relative}`);
  }
  count++;
}
for (const file of ['index.html','support/index.html','privacy/index.html','guide/index.html']) {
  const html = fs.readFileSync(path.join(root,file),'utf8');
  if (!html.includes('class="language-picker"') || !html.includes('<svg aria-hidden="true" viewBox="0 0 24 24">')) throw new Error(`Missing globe language picker: ${file}`);
  for (const code of codes) {
    const destination = file === 'guide/index.html' ? `?lang=${code}` : `lang="${code}"`;
    if (!html.includes(destination)) throw new Error(`Language picker missing ${code}: ${file}`);
  }
}
console.log(`Checked ${count} localized pages across ${codes.length} locales.`);
