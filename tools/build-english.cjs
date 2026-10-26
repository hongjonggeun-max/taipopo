// Static English pages share the existing Korean layouts. No runtime translator.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const policies=require('./privacy-content.json');
const {escapeHtml,renderPolicy}=require('./privacy-page.cjs');
const pairs=Object.entries(require('./english-text.json')).sort((a,b)=>b[0].length-a[0].length);
const languages=[['ar','العربية'],['de','Deutsch'],['en','English'],['es','Español'],['fr','Français'],['hi','हिन्दी'],['id','Bahasa Indonesia'],['it','Italiano'],['ja','日本語'],['ko','한국어'],['pt','Português'],['ru','Русский'],['th','ไทย'],['tr','Türkçe'],['vi','Tiếng Việt'],['zh','中文']];
const englishNames=['Arabic','German','English','Spanish','French','Hindi','Indonesian','Italian','Japanese','Korean','Portuguese','Russian','Thai','Turkish','Vietnamese','Chinese'];
function picker(current,up,english=false,page=''){const labels=english?englishNames:languages.map(x=>x[1]);const links=languages.map(([id],i)=>`<a href="${up}${id}/${page}" lang="${id}"${id===current?' aria-current="true"':''}>${labels[i]}</a>`).join('');return `<details class="language-picker"><summary aria-label="Change language"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path></svg><span>${labels[languages.findIndex(x=>x[0]===current)]}</span></summary><div class="language-options">${links}</div></details>`;}
for(const file of ['index.html','support/index.html','privacy/index.html']){
  const nested=file!=='index.html';
  const source=path.join(root,file);
  let ko=fs.readFileSync(source,'utf8');
  if(!ko.includes('language.css'))ko=ko.replace('</head>',`<link rel="stylesheet" href="${nested?'../':''}language.css"></head>`);
  const upKo=nested?'../':'./';
  if(!ko.includes('class="language-picker"'))ko=ko.replace(/<a class="language-link"[^>]*>.*?<\/a>/,picker('ko',upKo));
  if(file==='privacy/index.html'){
    ko=ko.replace('<html lang="ko">','<html lang="ko" dir="ltr">');
    ko=ko.replace(/<details class="language-picker">[\s\S]*?<\/details>/,picker('ko','../',false,'privacy/'));
    ko=ko.replace(/<!-- app-privacy:start -->[\s\S]*?<!-- app-privacy:end -->/,`<!-- app-privacy:start -->${renderPolicy(policies.ko).html}<!-- app-privacy:end -->`);
  }
  fs.writeFileSync(source,ko);
  // Policy bodies already have reviewed translations; do not translate them again.
  const englishSource=file==='privacy/index.html'
    ? ko.replace(/<div class="page-intro">[\s\S]*?<\/div><div class="policy-content">[\s\S]*?<\/div><\/main>/,'<!-- localized-privacy -->')
    : ko;
  let en=englishSource.replace(/lang="ko"(?: dir="ltr")?/,'lang="en" dir="ltr"');
  for(const [k,v] of pairs)en=en.split(k).join(v.replaceAll('&','&amp;'));
  en=en.replace(/<details class="language-picker">[\s\S]*?<\/details>/,picker('en',nested?'../../':'../',true,file==='privacy/index.html'?'privacy/':''));
  if(/[가-힣]/.test(en))throw Error('Untranslated text in '+file+': '+en.match(/[^<>]*[가-힣][^<>]*/g));
  // Content links stay within /en/. Shared assets and the 16-language manual live at the root.
  en=en.replace(/((?:href|src)=")((?:\.\.\/)?(?:assets\/[^" ]+|styles\.css|language\.css|site\.js))"/g,'$1../$2"');
  en=en.replace(/href="(\.\.\/)?guide\/"/g,(_,prefix)=>`href="../${prefix||''}guide/?lang=en"`);
  en=en.replace(/<a href="https:\/\/hongjonggeun-max\.github\.io\/taipopo-privacy\/privacy\/">[^<]*<\/a>/,'');
  if(file==='privacy/index.html'){
    const policy=renderPolicy(policies.en);
    const privacyMain=`<div class="page-intro"><span class="eyebrow">Your records and privacy</span><h1>${escapeHtml(policy.title)}</h1><p>Read the app privacy policy in English below. The policy explains the information processed, storage, external services, retention, deletion and contact details.</p></div><div class="policy-content">${policy.html}<section class="glass"><h2>Information used by this website</h2><p>This website has no sign-up, advertising trackers or analytics scripts. Only your light or dark theme preference is stored in your browser. Contact buttons open your email app; the website itself does not receive or store your messages.</p><p>This website is hosted on GitHub Pages. The hosting provider may process data when you visit. For details, see the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub Privacy Statement</a>.</p></section></div></main>`;
    en=en.replace('<!-- localized-privacy -->',privacyMain);
    en=en.replace(/<title>[^<]*<\/title>/,`<title>${escapeHtml(policy.title)} · TAIPOPO</title>`);
  }
  const dest=path.join(root,'en',file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,en);
}
console.log('Built English main, support and localized privacy pages with reciprocal language links.');
