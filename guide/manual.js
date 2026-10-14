const language=document.querySelector('#manual-language');
const search=document.querySelector('#manual-search');
const topics=document.querySelector('#topics');
const toc=document.querySelector('#manual-toc');
const empty=document.querySelector('#manual-empty');
let manuals;
const languageNames={ar:'العربية',de:'Deutsch',en:'English',es:'Español',fr:'Français',hi:'हिन्दी',id:'Bahasa Indonesia',it:'Italiano',ja:'日本語',ko:'한국어',pt:'Português',ru:'Русский',th:'ไทย',tr:'Türkçe',vi:'Tiếng Việt',zh:'中文'};
const changeLanguage={ar:'تغيير اللغة',de:'Sprache ändern',en:'Change language',es:'Cambiar idioma',fr:'Changer de langue',hi:'भाषा बदलें',id:'Ganti bahasa',it:'Cambia lingua',ja:'言語を変更',ko:'언어 변경',pt:'Mudar idioma',ru:'Сменить язык',th:'เปลี่ยนภาษา',tr:'Dili değiştir',vi:'Đổi ngôn ngữ',zh:'切换语言'};
const chrome={
  ar:{skip:'تخطي إلى المحتوى',home:'الرئيسية',guide:'دليل الاستخدام',support:'الدعم',privacy:'الخصوصية',nav:'التنقل الرئيسي',theme:'التبديل إلى الوضع الداكن',language:'اللغة'},
  de:{skip:'Zum Inhalt springen',home:'Startseite',guide:'Handbuch',support:'Support',privacy:'Datenschutz',nav:'Hauptnavigation',theme:'Dunkelmodus aktivieren',language:'Sprache'},
  en:{skip:'Skip to content',home:'Home',guide:'User guide',support:'Support',privacy:'Privacy',nav:'Main navigation',theme:'Switch to dark mode',language:'Language'},
  es:{skip:'Saltar al contenido',home:'Inicio',guide:'Guía de usuario',support:'Ayuda',privacy:'Privacidad',nav:'Navegación principal',theme:'Cambiar al modo oscuro',language:'Idioma'},
  fr:{skip:'Aller au contenu',home:'Accueil',guide:'Guide d’utilisation',support:'Assistance',privacy:'Confidentialité',nav:'Navigation principale',theme:'Passer au mode sombre',language:'Langue'},
  hi:{skip:'मुख्य सामग्री पर जाएँ',home:'होम',guide:'उपयोग मार्गदर्शिका',support:'सहायता',privacy:'गोपनीयता',nav:'मुख्य नेविगेशन',theme:'डार्क मोड चालू करें',language:'भाषा'},
  id:{skip:'Lewati ke konten',home:'Beranda',guide:'Panduan pengguna',support:'Dukungan',privacy:'Privasi',nav:'Navigasi utama',theme:'Aktifkan mode gelap',language:'Bahasa'},
  it:{skip:'Vai al contenuto',home:'Home',guide:'Guida utente',support:'Assistenza',privacy:'Privacy',nav:'Navigazione principale',theme:'Attiva modalità scura',language:'Lingua'},
  ja:{skip:'本文へ移動',home:'ホーム',guide:'使い方ガイド',support:'サポート',privacy:'プライバシー',nav:'メインナビゲーション',theme:'ダークモードに切り替え',language:'言語'},
  ko:{skip:'본문으로 이동',home:'홈',guide:'사용 안내',support:'고객지원',privacy:'개인정보 안내',nav:'주 메뉴',theme:'다크 모드로 변경',language:'언어'},
  pt:{skip:'Pular para o conteúdo',home:'Início',guide:'Guia do usuário',support:'Suporte',privacy:'Privacidade',nav:'Navegação principal',theme:'Ativar modo escuro',language:'Idioma'},
  ru:{skip:'Перейти к содержимому',home:'Главная',guide:'Руководство',support:'Поддержка',privacy:'Конфиденциальность',nav:'Основная навигация',theme:'Включить тёмную тему',language:'Язык'},
  th:{skip:'ข้ามไปยังเนื้อหา',home:'หน้าหลัก',guide:'คู่มือผู้ใช้',support:'ติดต่อช่วยเหลือ',privacy:'ความเป็นส่วนตัว',nav:'การนำทางหลัก',theme:'เปลี่ยนเป็นโหมดมืด',language:'ภาษา'},
  tr:{skip:'İçeriğe geç',home:'Ana sayfa',guide:'Kullanım kılavuzu',support:'Destek',privacy:'Gizlilik',nav:'Ana gezinme',theme:'Koyu modu aç',language:'Dil'},
  vi:{skip:'Chuyển đến nội dung',home:'Trang chủ',guide:'Hướng dẫn sử dụng',support:'Hỗ trợ',privacy:'Quyền riêng tư',nav:'Điều hướng chính',theme:'Bật chế độ tối',language:'Ngôn ngữ'},
  zh:{skip:'跳转到正文',home:'首页',guide:'使用指南',support:'支持',privacy:'隐私',nav:'主导航',theme:'切换到深色模式',language:'语言'}
};
function filterTopics(){const q=search.value.trim().toLocaleLowerCase();let count=0;for(const topic of topics.children){const match=topic.textContent.toLocaleLowerCase().includes(q);topic.hidden=!match;if(match){count++;if(q)topic.open=true}}empty.hidden=count!==0;for(const link of toc.children){link.hidden=document.getElementById(link.hash.slice(1))?.hidden??false}}
function openHash(){const id=decodeURIComponent(location.hash.slice(1));const target=document.getElementById(id);if(target?.tagName==='DETAILS'){search.value='';filterTopics();target.open=true;target.scrollIntoView({block:'start'})}}
search.addEventListener('input',filterTopics);
toc.addEventListener('click',event=>{const link=event.target.closest('a');if(link){const topic=document.getElementById(link.hash.slice(1));if(topic)topic.open=true}});
window.addEventListener('hashchange',openHash);
function render(code){const m=manuals[code],c=chrome[code];document.documentElement.lang=code;document.documentElement.dir=code==='ar'?'rtl':'ltr';language.value=code;document.querySelector('#skip-link').textContent=c.skip;document.querySelector('#brand-home').setAttribute('aria-label',`TAIPOPO · ${c.home}`);document.querySelector('#site-nav').setAttribute('aria-label',c.nav);document.querySelector('#nav-home').textContent=c.home;document.querySelector('#nav-guide').textContent=c.guide;document.querySelector('#nav-support').textContent=c.support;document.querySelector('#theme-toggle').setAttribute('aria-label',c.theme);document.querySelector('#language-picker-label').textContent=languageNames[code];document.querySelector('#language-picker-summary').setAttribute('aria-label',changeLanguage[code]);document.querySelector('#manual-language-label').textContent=c.language;document.querySelector('#manual-contact-link').textContent=c.support;document.querySelector('#footer-support').textContent=c.support;document.querySelector('#footer-privacy').textContent=c.privacy;document.title=`${m.title} · TAIPOPO`;document.querySelector('#manual-title').textContent=m.title;document.querySelector('#manual-intro').textContent=m.intro;document.querySelector('#search-label').textContent=m.search;empty.textContent=m.empty;topics.replaceChildren();toc.replaceChildren();m.sections.forEach((s,i)=>{const detail=document.createElement('details');detail.id=s.id;detail.className='glass manual-topic';const summary=document.createElement('summary');summary.textContent=`${i+1}. ${s.title}`;detail.append(summary);const body=document.createElement('div');for(const paragraph of s.body.split('\n\n')){const p=document.createElement('p');p.textContent=paragraph;body.append(p)}detail.append(body);topics.append(detail);const a=document.createElement('a');a.href=`#${s.id}`;a.textContent=summary.textContent;toc.append(a)});search.value='';filterTopics();const url=new URL(location.href);url.searchParams.set('lang',code);history.replaceState(null,'',url);openHash()}
language.disabled=true;
fetch('manual.json').then(r=>{if(!r.ok)throw Error('Manual unavailable');return r.json()}).then(data=>{manuals=data;language.disabled=false;const code=new URL(location.href).searchParams.get('lang');if(code&&manuals[code])render(code);else openHash();language.addEventListener('change',()=>render(language.value))}).catch(()=>{language.disabled=true;openHash()});
window.addEventListener('beforeprint',()=>{for(const topic of topics.children)topic.open=true});
