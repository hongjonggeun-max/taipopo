const language=document.querySelector('#manual-language');
const search=document.querySelector('#manual-search');
const topics=document.querySelector('#topics');
const toc=document.querySelector('#manual-toc');
const empty=document.querySelector('#manual-empty');
let manuals;
function filterTopics(){const q=search.value.trim().toLocaleLowerCase();let count=0;for(const topic of topics.children){const match=topic.textContent.toLocaleLowerCase().includes(q);topic.hidden=!match;if(match){count++;if(q)topic.open=true}}empty.hidden=count!==0;for(const link of toc.children){link.hidden=document.getElementById(link.hash.slice(1))?.hidden??false}}
function openHash(){const id=decodeURIComponent(location.hash.slice(1));const target=document.getElementById(id);if(target?.tagName==='DETAILS'){search.value='';filterTopics();target.open=true;target.scrollIntoView({block:'start'})}}
search.addEventListener('input',filterTopics);
toc.addEventListener('click',event=>{const link=event.target.closest('a');if(link){const topic=document.getElementById(link.hash.slice(1));if(topic)topic.open=true}});
window.addEventListener('hashchange',openHash);
function render(code){const m=manuals[code];document.documentElement.lang=code;document.documentElement.dir=code==='ar'?'rtl':'ltr';language.value=code;document.title=`${m.title} · TAIPOPO`;document.querySelector('#manual-title').textContent=m.title;document.querySelector('#manual-intro').textContent=m.intro;document.querySelector('#search-label').textContent=m.search;empty.textContent=m.empty;topics.replaceChildren();toc.replaceChildren();m.sections.forEach((s,i)=>{const detail=document.createElement('details');detail.id=s.id;detail.className='glass manual-topic';const summary=document.createElement('summary');summary.textContent=`${i+1}. ${s.title}`;detail.append(summary);const body=document.createElement('div');for(const paragraph of s.body.split('\n\n')){const p=document.createElement('p');p.textContent=paragraph;body.append(p)}detail.append(body);topics.append(detail);const a=document.createElement('a');a.href=`#${s.id}`;a.textContent=summary.textContent;toc.append(a)});search.value='';filterTopics();const url=new URL(location.href);url.searchParams.set('lang',code);history.replaceState(null,'',url);openHash()}
language.disabled=true;
fetch('manual.json').then(r=>{if(!r.ok)throw Error('Manual unavailable');return r.json()}).then(data=>{manuals=data;language.disabled=false;const code=new URL(location.href).searchParams.get('lang');if(code&&manuals[code])render(code);else openHash();language.addEventListener('change',()=>render(language.value))}).catch(()=>{language.disabled=true;openHash()});
window.addEventListener('beforeprint',()=>{for(const topic of topics.children)topic.open=true});
