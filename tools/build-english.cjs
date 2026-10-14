// Static English pages share the existing Korean layouts. No runtime translator.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pairs=Object.entries(require('./english-text.json')).sort((a,b)=>b[0].length-a[0].length);
const languages=[['ar','العربية'],['de','Deutsch'],['en','English'],['es','Español'],['fr','Français'],['hi','हिन्दी'],['id','Bahasa Indonesia'],['it','Italiano'],['ja','日本語'],['ko','한국어'],['pt','Português'],['ru','Русский'],['th','ไทย'],['tr','Türkçe'],['vi','Tiếng Việt'],['zh','中文']];
const englishNames=['Arabic','German','English','Spanish','French','Hindi','Indonesian','Italian','Japanese','Korean','Portuguese','Russian','Thai','Turkish','Vietnamese','Chinese'];
function picker(current,up,english=false){const labels=english?englishNames:languages.map(x=>x[1]);const links=languages.map(([id],i)=>`<a href="${up}${id}/" lang="${id}"${id===current?' aria-current="true"':''}>${labels[i]}</a>`).join('');return `<details class="language-picker"><summary aria-label="Change language"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path></svg><span>${labels[languages.findIndex(x=>x[0]===current)]}</span></summary><div class="language-options">${links}</div></details>`;}
for(const file of ['index.html','support/index.html','privacy/index.html']){
  const nested=file!=='index.html';
  const source=path.join(root,file);
  let ko=fs.readFileSync(source,'utf8');
  if(!ko.includes('language.css'))ko=ko.replace('</head>',`<link rel="stylesheet" href="${nested?'../':''}language.css"></head>`);
  const upKo=nested?'../':'./';
  if(!ko.includes('class="language-picker"'))ko=ko.replace(/<a class="language-link"[^>]*>.*?<\/a>/,picker('ko',upKo));
  fs.writeFileSync(source,ko);
  let en=ko.replace('lang="ko"','lang="en"');
  for(const [k,v] of pairs)en=en.split(k).join(v.replaceAll('&','&amp;'));
  en=en.replace(/<details class="language-picker">[\s\S]*?<\/details>/,picker('en',nested?'../../':'../',true));
  if(/[가-힣]/.test(en))throw Error('Untranslated text in '+file+': '+en.match(/[^<>]*[가-힣][^<>]*/g));
  // Content links stay within /en/. Shared assets and the 16-language manual live at the root.
  en=en.replace(/((?:href|src)=")((?:\.\.\/)?(?:assets\/[^" ]+|styles\.css|language\.css|site\.js))"/g,'$1../$2"');
  en=en.replace(/href="(\.\.\/)?guide\/"/g,(_,prefix)=>`href="../${prefix||''}guide/?lang=en"`);
  const dest=path.join(root,'en',file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,en);
}
console.log('Built English main, support and privacy pages with reciprocal language links.');
