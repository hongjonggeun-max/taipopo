// Static English pages share the existing Korean layouts. No runtime translator.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pairs=Object.entries(require('./english-text.json')).sort((a,b)=>b[0].length-a[0].length);
for(const file of ['index.html','support/index.html','privacy/index.html']){
  const nested=file!=='index.html';
  const source=path.join(root,file);
  let ko=fs.readFileSync(source,'utf8');
  if(!ko.includes('language.css'))ko=ko.replace('</head>',`<link rel="stylesheet" href="${nested?'../':''}language.css"></head>`);
  const enPath=(nested?'../':'')+'en/'+(nested?file.replace('index.html',''):'');
  if(!ko.includes('class="language-link"'))ko=ko.replace('<button class="theme-button"',`<a class="language-link" href="${enPath}" lang="en" aria-label="English">EN</a><button class="theme-button"`);
  fs.writeFileSync(source,ko);
  let en=ko.replace('lang="ko"','lang="en"');
  for(const [k,v] of pairs)en=en.split(k).join(v.replaceAll('&','&amp;'));
  if(/[가-힣]/.test(en))throw Error('Untranslated text in '+file+': '+en.match(/[^<>]*[가-힣][^<>]*/g));
  // Content links stay within /en/. Shared assets and the 16-language manual live at the root.
  en=en.replace(/((?:href|src)=")((?:\.\.\/)?(?:assets\/[^" ]+|styles\.css|language\.css|site\.js))"/g,'$1../$2"');
  en=en.replace(/href="(\.\.\/)?guide\/"/g,(_,prefix)=>`href="../${prefix||''}guide/?lang=en"`);
  en=en.replace(/<a class="language-link"[^>]*>EN<\/a>/,`<a class="language-link" href="${nested?'../../'+file.replace('index.html',''):'../'}" lang="ko" aria-label="한국어">한국어</a>`);
  const dest=path.join(root,'en',file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,en);
}
console.log('Built English main, support and privacy pages with reciprocal language links.');
