'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {copy,escape,build17Path}=require('./build17-access.cjs');
const manifest=require('./build17-manifest.json');
const root=path.resolve(__dirname,'..');
function replaceContent(html,content) {
  const marker='<div class="policy-content">',start=html.indexOf(marker);
  if(start<0)throw Error('Document shell has no policy container');
  const tags=/<div\b[^>]*>|<\/div>/gu;tags.lastIndex=start+marker.length;
  let depth=1,match;
  while((match=tags.exec(html))){depth+=match[0].startsWith('</')?-1:1;if(!depth)return html.slice(0,start+marker.length)+content+html.slice(match.index);}
  throw Error('Document shell has an unclosed container');
}
function shell(locale,title,route,content,source,document) {
  const template=fs.readFileSync(path.join(root,locale,'terms/index.html'),'utf8');
  const origin='https://taipopo.app',base=`${origin}/${locale}/terms/`;
  let html=template.replace(/\b(href|src)="([^"]+)"/gu,(all,attribute,value)=>{
    if(/^(?:https?:|mailto:|tel:|data:|#)/u.test(value))return all;
    const u=new URL(value,base);return `${attribute}="${u.pathname}${u.search}${u.hash}"`;
  });
  html=replaceContent(html,content);
  html=html.replace(/<title>[^<]*<\/title>/u,`<title>${escape(title)} · TAIPOPO</title>`)
    .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/u,`<h1>${escape(title)}</h1>`)
    .replace(/<meta name="description" content="[^"]*">/u,`<meta name="description" content="${escape(copy[locale].provenanceNotice)}">`)
    .replace(/<meta name="taipopo-web-review"[^>]*>/gu,'')
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/u,`<link rel="canonical" href="${origin}${route}">`)
    .replace(/<meta property="og:title" content="[^"]*">/u,`<meta property="og:title" content="${escape(title)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/u,`<meta property="og:url" content="${origin}${route}">`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gu,'');
  if(!html.includes('content="noindex,follow"'))throw Error('Archive shell must remain noindex');
  html=html.replace(/<link\b[^>]*rel="alternate"[^>]*>/gu,tag=>{
    const language=tag.match(/hreflang="([^"]+)"/u)?.[1];
    if(!language)return tag;
    const target=language==='x-default'?'ko':language;
    return tag.replace(/href="[^"]*"/u,`href="${origin}${build17Path(target,source,document)}"`);
  });
  html=html.replace(/(<details\b[^>]*class="[^"]*language-picker[^"]*"[^>]*>)([\s\S]*?)(<\/details>)/u,(all,open,inside,close)=>open+inside.replace(/<a\b[^>]*>/gu,tag=>{
    const language=tag.match(/\blang="([^"]+)"/u)?.[1];
    return language?tag.replace(/href="[^"]*"/u,`href="${build17Path(language,source,document)}"`):tag;
  })+close);
  return html.replace('</head>','<style>.archived-original{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.95;max-inline-size:75ch;margin-inline:auto}.policy-archive-nav{display:flex;flex-wrap:wrap;gap:12px 24px;margin-block:0 24px}.policy-archive-provenance h2{overflow-wrap:anywhere}.policy-archive-original{padding:28px 32px}@media(max-width:600px){.policy-archive-original{padding:24px}}</style></head>');
}
const paragraph=text=>`<p>${escape(text)}</p>`;
function buildBuild17Documents(){
  let count=0;
  for(const [locale,text] of Object.entries(copy)){
    const hub=build17Path(locale);
    const sourceSection=(source)=>`<section class="glass"><h2>${escape(source==='app'?text.appSource:text.webSource)}</h2><ul>${['terms','privacy'].map(document=>`<li><a href="${build17Path(locale,source,document)}">${escape(text[source+(document==='terms'?'Terms':'Privacy')])}</a></li>`).join('')}</ul></section>`;
    const hubContent=`<section class="glass policy-archive-provenance">${paragraph(text.buildHelp)}${paragraph(text.provenanceNotice)}${paragraph(text.datesNotice)}</section>${sourceSection('app')}${sourceSection('web')}<section class="glass">${paragraph(text.addressNotice)}</section>`;
    const write=(route,html)=>{const target=path.join(root,route.slice(1),'index.html');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,html.replace(/\s*$/u,'')+'\n');count++;};
    write(hub,shell(locale,text.archiveTitle,hub,hubContent));
    for(const source of ['app','web'])for(const document of ['terms','privacy']){
      const record=manifest.documents.find(row=>row.locale===locale&&row.source===source&&row.document===document);
      if(!record)throw Error(`Missing retained source: ${locale}/${source}/${document}`);
      const raw=fs.readFileSync(path.join(root,record.textFile));
      if(crypto.createHash('sha256').update(raw).digest('hex')!==record.sha256)throw Error(`Preserved original changed: ${record.textFile}`);
      const label=text[source+(document==='terms'?'Terms':'Privacy')];
      const evidence=source==='app'?text.appEvidence:document==='terms'?text.webTermsEvidence:text.webPrivacyEvidence;
      const route=build17Path(locale,source,document);
      const nav=`<nav class="policy-archive-nav" aria-label="${escape(text.backToBuild17)}"><a href="${hub}">${escape(text.backToBuild17)}</a><a href="/${locale}/terms/">${escape(text.backToTerms)}</a><a href="/${locale}/privacy/">${escape(text.backToPrivacy)}</a></nav>`;
      const notices=`<section class="glass policy-archive-provenance"><h2>${escape(source==='app'?text.appSource:text.webSource)}</h2>${paragraph(evidence)}${paragraph(text.provenanceNotice)}${paragraph(text.datesNotice)}${document==='privacy'?paragraph(text.addressNotice):''}<p><a href="/${record.textFile}" download>${escape(text.downloadOriginal)}</a></p></section>`;
      const body=`<section class="glass policy-archive-original"><h2>${escape(text.originalHeading)}</h2><div class="archived-original" lang="${locale}">${escape(raw.toString('utf8'))}</div></section>`;
      write(route,shell(locale,`${label} · ${text.archiveTitle}`,route,nav+notices+body,source,document));
    }
  }
  return count;
}
module.exports={buildBuild17Documents};
if(require.main===module)console.log(`Generated ${buildBuild17Documents()} preserved build17 document pages. No deployment.`);
