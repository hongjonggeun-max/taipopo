// Export only the explicitly allowlisted public manual, never app source/data.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const arbDir=path.resolve(process.argv[2]||path.join(root,'../workshield/lib/l10n'));
const names=['Start','Home','Attendance','Income','Claims','Sync','Photos','Memos','Settlement','Reports','Backup','Trash','Help'];
const locales={ko:'한국어',en:'English',de:'Deutsch',es:'Español',fr:'Français',th:'ไทย',ar:'العربية',hi:'हिन्दी',id:'Bahasa Indonesia',it:'Italiano',ja:'日本語',pt:'Português',ru:'Русский',tr:'Türkçe',vi:'Tiếng Việt',zh:'中文'};
const data={};
for(const [code,name] of Object.entries(locales)){
  const a=JSON.parse(fs.readFileSync(path.join(arbDir,`app_${code}.arb`),'utf8'));
  const sections=names.map((n,i)=>({id:n.toLowerCase(),title:a[`manual${n}Title`],body:a[`manual${n}Body`]}));
  const manual={name,title:a.userGuideTitle,intro:a.manualIntro,search:a.search,empty:a.noSearchResults,sections};
  if(!manual.intro||sections.some(s=>!s.title||!s.body))throw Error(`Incomplete manual: ${code}`);
  data[code]=manual;
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const ko=data.ko;
const toc=ko.sections.map((s,i)=>`<a href="#${s.id}">${i+1}. ${escape(s.title)}</a>`).join('');
const content=ko.sections.map((s,i)=>`<details class="glass manual-topic" id="${s.id}"><summary>${i+1}. ${escape(s.title)}</summary><div>${s.body.split('\n\n').map(p=>`<p>${escape(p)}</p>`).join('')}</div></details>`).join('\n');
const template=fs.readFileSync(path.join(root,'tools/manual-template.html'),'utf8');
const html=template.replace('<!--LANGUAGES-->',Object.entries(locales).map(([code,name])=>`<option value="${code}">${name}</option>`).join('')).replace('<!--INTRO-->',escape(ko.intro)).replace('<!--TOC-->',toc).replace('<!--TOPICS-->',content);
fs.mkdirSync(path.join(root,'guide'),{recursive:true});
fs.writeFileSync(path.join(root,'guide/manual.json'),JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(path.join(root,'guide/index.html'),html);
for(const file of ['index.html','support/index.html','privacy/index.html']) {
  const target=path.join(root,file);
  const prefix=file==='index.html'?'':'../';
  let page=fs.readFileSync(target,'utf8');
  if(!page.includes(`href="${prefix}guide/"`)) {
    page=page.replace('</nav>',`<a href="${prefix}guide/">사용 안내</a></nav>`);
  }
  page=page.replaceAll('href="support/#guide"','href="guide/"');
  if(file==='support/index.html') {
    page=page.replace('href="#guide"','href="../guide/"');
    page=page.replace(/<section class="guide" id="guide">[\s\S]*?<\/section>/,'<section class="guide" id="guide"><h2>처음부터 차근차근, 상세 사용설명서</h2><p>출퇴근부터 수입·수당·별도 청구, 사진, 정산·리포트, 백업·복구와 휴지통까지 13개 주제를 살펴보세요. 검색과 16개 언어를 지원합니다.</p><a class="button primary" href="../guide/">사용설명서 열기 →</a></section>');
  }
  fs.writeFileSync(target,page);
}
console.log(`Exported ${Object.keys(data).length} languages × ${names.length} topics. Only public manual fields included.`);
