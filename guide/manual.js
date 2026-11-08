'use strict';
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

const ui = JSON.parse(document.querySelector('#manual-ui').textContent);
const language = document.querySelector('#manual-language');
const pages = document.querySelector('#manual-pages');
const toc = document.querySelector('#manual-toc');
const contents = document.querySelector('#manual-chapter');
const status = document.querySelector('#manual-status');
const failure = document.querySelector('#manual-load-error');
const retry = document.querySelector('#manual-retry');
const expectedOrder = ['guide-main', 'guide-gallery', 'guide-settlement', 'guide-report'];
const version = document.querySelector('#main').dataset.manualVersion;
let currentCode = new URL(location.href).searchParams.get('lang') || 'ko';
let cycle = 0;
let manifestPromise;
let observers = [];
let timers = [];
const supports = code => Object.hasOwn(ui, code) && Object.hasOwn(chrome, code);
function setThemeLabel() {
  document.querySelector('#theme-toggle').setAttribute('aria-label', (supports(currentCode) ? ui[currentCode] : ui.ko).theme);
}
new MutationObserver(setThemeLabel).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
function updateChrome(code) {
  const c = chrome[code], text = ui[code];
  document.documentElement.lang = code;
  document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
  language.value = code;
  document.querySelector('#skip-link').textContent = c.skip;
  document.querySelector('#brand-home').setAttribute('aria-label', `TAIPOPO · ${c.home}`);
  document.querySelector('#brand-home').href = `../${code}/`;
  document.querySelector('#site-nav').setAttribute('aria-label', c.nav);
  for (const key of ['home', 'guide', 'support']) document.querySelector(`#nav-${key}`).textContent = c[key];
  document.querySelector('#nav-home').href = `../${code}/`;
  document.querySelector('#nav-guide').href = `./?lang=${code}`;
  document.querySelector('#nav-support').href = `../${code}/support/`;
  document.querySelector('#language-picker-label').textContent = languageNames[code];
  document.querySelector('#language-picker-summary').setAttribute('aria-label', changeLanguage[code]);
  document.querySelector('#manual-language-label').textContent = c.language;
  document.querySelector('#manual-chapter-label').textContent = text.contents;
  document.querySelector('#manual-contact-link').textContent = c.support;
  document.querySelector('#manual-contact-link').href = `../${code}/support/`;
  document.querySelector('#footer-support').textContent = c.support;
  document.querySelector('#footer-support').href = `../${code}/support/`;
  document.querySelector('#footer-privacy').textContent = c.privacy;
  document.querySelector('#footer-privacy').href=`../${code}/privacy/`;
  document.querySelector('#manual-title').textContent = text.title;
  document.querySelector('#manual-intro').textContent = text.intro;
  document.querySelector('#manual-safety').textContent = text.safety;
  retry.textContent = text.retry;
  document.title = `${text.title} · ${code === 'ko' ? 'TAIPOPO(타이포포)' : 'TAIPOPO'}`;
  setThemeLabel();
}
async function loadManifest() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`manual.json?v=${version}`, { signal: controller.signal, cache: 'no-cache' });
    if (!response.ok) throw Error('Manual manifest unavailable');
    const data = await response.json();
    if (data.schemaVersion !== 4 || data.contentVersion !== version || JSON.stringify(data.imageOrder) !== JSON.stringify(expectedOrder)) throw Error('Manual version mismatch');
    return data;
  } finally { clearTimeout(timeout); }
}
function clearView() {
  observers.forEach(observer => observer.disconnect()); observers = [];
  timers.forEach(timer => clearTimeout(timer)); timers = [];
  pages.replaceChildren(); toc.replaceChildren();
  contents.replaceChildren(); contents.disabled = true;
  pages.dataset.loaded = '0'; pages.dataset.failed = '0';
  pages.dataset.state = 'loading'; pages.setAttribute('aria-busy', 'true');
  status.hidden = false; failure.hidden = true;
}
function showFailure(code, message) {
  const text = supports(code) ? ui[code] : ui.ko;
  document.querySelector('#manual-error-message').textContent = message || text.error;
  status.hidden = true; failure.hidden = false;
  pages.dataset.state = 'error'; pages.setAttribute('aria-busy', 'false');
}
function validateLocale(data, code) {
  const item = data.locales?.[code];
  if (!item || item.images?.length !== 4 || !data.localeOrder.includes(code)) throw Error('Requested language unavailable');
  if (data.overlay?.color !== '#E53935' || data.overlay.strokeWidth !== 1.5 || data.overlay.maxRadius !== 12 || data.overlay.radiusFactor !== 0.20) throw Error('Invalid annotation style');
  for (const [index, image] of item.images.entries()) {
    if (image.id !== expectedOrder[index] || image.order !== index + 1 || image.src !== `images/${code}/${image.id}.webp` || !/^[a-f0-9]{64}$/u.test(image.sha256) || image.width <= 0 || image.height <= 0 || !Array.isArray(image.targets)) throw Error('Invalid language image');
    if (!image.targets.length || image.targets.some(r => !['x', 'y', 'width', 'height'].every(k => Number.isFinite(r[k])) || r.width <= 0 || r.height <= 0)) throw Error('Invalid annotation geometry');
    if (['guide-settlement', 'guide-report'].includes(image.id) && !image.preview) throw Error('Missing web preview');
    if (image.preview && (!['guide-settlement', 'guide-report'].includes(image.id) || image.preview.src !== `previews/${code}/${image.id}.webp` || image.preview.sourceSha256 !== image.sha256 || !/^[a-f0-9]{64}$/u.test(image.preview.sha256) || image.preview.width !== image.width || !Number.isInteger(image.preview.height) || image.preview.height <= 0 || image.preview.height >= image.height || image.preview.targets?.length !== image.targets.length)) throw Error('Invalid web preview');
  }
  const counts = [10, 27, 9, 6, 22, 39];
  if (item.chapters?.length !== 6 || item.chapters.some((chapter, index) => !chapter.title || chapter.id !== `manual-category-${index}` || chapter.features?.length !== counts[index] || chapter.features.some(feature => !feature.id || !feature.title || !feature.body || feature.notice !== null && typeof feature.notice !== 'string'))) throw Error('Incomplete manual chapters');
  if (JSON.stringify(item.chapters.flatMap(chapter => chapter.screen ? [chapter.screen] : [])) !== JSON.stringify(expectedOrder)) throw Error('Invalid chapter images');
  return item;
}
function makeIcon(icon) {
  if (!icon) return null;
  const span = document.createElement('span'); span.className = 'manual-app-icon'; span.setAttribute('aria-hidden', 'true');
  span.textContent = String.fromCodePoint(icon.codePoint);
  span.style.setProperty('--manual-icon-light', icon.color);
  span.style.setProperty('--manual-icon-dark', icon.colorDark);
  if (icon.background === '#25282C') span.classList.add('manual-app-icon-contrast');
  if (icon.matchTextDirection) span.classList.add('manual-app-icon-directional');
  return span;
}
function renderManual(data, item, code, token) {
  const mounts = new Map();
  const hint = document.createElement('option'); hint.value = ''; hint.textContent = ui[code].contents;
  contents.append(hint); contents.disabled = false;
  for (const [index, chapter] of item.chapters.entries()) {
    const section = document.createElement('section'); section.className = 'manual-chapter'; section.id = chapter.id;
    const heading = document.createElement('h2'); heading.className = 'manual-chapter-title'; heading.id = `${chapter.id}-title`;
    const icon = makeIcon(chapter.icon); if (icon) heading.append(icon);
    const title = `${index + 1}. ${chapter.title}`; heading.append(document.createTextNode(title));
    section.setAttribute('aria-labelledby', heading.id); section.append(heading); pages.append(section);
    if (chapter.screen) mounts.set(chapter.screen, section);
    const link = document.createElement('a'); link.href = `#${chapter.id}`; link.textContent = title; toc.append(link);
    const option = document.createElement('option'); option.value = chapter.id; option.textContent = title; contents.append(option);
  }
  renderImages(data, item, code, token, mounts);
  for (const chapter of item.chapters) {
    const list = document.createElement('div'); list.className = 'manual-feature-list';
    for (const feature of chapter.features) {
      const article = document.createElement('article'); article.className = 'manual-feature'; article.id = `manual-feature-${feature.id}`;
      const icon = makeIcon(feature.icon); if (icon) article.append(icon);
      const copy = document.createElement('div'); copy.className = 'manual-feature-copy';
      const heading = document.createElement('h3'); heading.textContent = feature.title;
      const body = document.createElement('p'); body.className = 'manual-feature-body'; body.textContent = feature.body; copy.append(heading, body);
      if (feature.notice) { const notice = document.createElement('p'); notice.className = 'manual-feature-notice'; notice.textContent = feature.notice; copy.append(notice); }
      article.append(copy); list.append(article);
    }
    document.getElementById(chapter.id).append(list);
  }
}
function renderImages(data, item, code, token, mounts) {
  const text = ui[code];
  const results = new Map();
  function updateProgress(id, value) {
    if (token !== cycle) return;
    results.set(id, value);
    const loaded = [...results.values()].filter(v => v === 'loaded').length;
    const failed = [...results.values()].filter(v => v === 'error').length;
    pages.dataset.loaded = loaded; pages.dataset.failed = failed;
    status.textContent = `${text.loading} ${loaded} / ${item.images.length}`;
    if (loaded + failed === item.images.length) {
      pages.setAttribute('aria-busy', 'false');
      pages.dataset.state = failed ? 'partial-error' : 'ready';
      status.hidden = !failed;
      if (failed) status.textContent = `${text.error} (${loaded} / ${item.images.length})`;
    } else {
      pages.dataset.state = 'loading'; pages.setAttribute('aria-busy', 'true'); status.hidden = false;
    }
  }
  for (const record of item.images) {
    const figure = document.createElement('figure'); figure.className = 'manual-page'; figure.id = record.id;
    const caption = document.createElement('figcaption');
    const heading = document.createElement('span'); heading.className = 'manual-page-title'; heading.textContent = record.title;
    const src = `${record.src}?v=${record.sha256.slice(0, 12)}`;
    const view = record.preview || record;
    const displaySrc = `${view.src}?v=${view.sha256.slice(0, 12)}`;
    const original = document.createElement('a'); original.className = 'manual-open-original'; original.href = src; original.target = '_blank'; original.rel = 'noopener'; original.textContent = text.original;
    original.setAttribute('aria-label', `${text.original}: ${record.title}`);
    caption.append(heading, original); figure.append(caption);
    const frame = document.createElement('a'); frame.className = 'manual-original-link'; frame.href = src; frame.target = '_blank'; frame.rel = 'noopener'; frame.dir = 'ltr'; frame.setAttribute('aria-label', `${text.original}: ${record.title}`);
    frame.style.setProperty('--manual-image-ratio', view.width / view.height);
    const image = document.createElement('img'); image.className = 'manual-image'; image.width = view.width; image.height = view.height; image.alt = `${record.order}. ${record.title} · ${item.name}`; image.decoding = 'async'; image.loading = 'eager';
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const annotations = document.createElementNS(svgNamespace, 'svg'); annotations.classList.add('manual-annotations'); annotations.setAttribute('aria-hidden', 'true');
    const marks = view.targets.map(target => { const span = document.createElementNS(svgNamespace, 'rect'); span.classList.add('manual-highlight'); span.dataset.target = target.id; annotations.append(span); return { target, span }; });
    frame.append(image, annotations); figure.append(frame);
    const error = document.createElement('div'); error.className = 'manual-page-error'; error.hidden = true; error.setAttribute('role', 'alert');
    const message = document.createElement('p'); message.textContent = text.error;
    const button = document.createElement('button'); button.className = 'button'; button.type = 'button'; button.textContent = text.retry; error.append(message, button); figure.append(error);
    mounts.get(record.id).append(figure);
    function drawTargets() {
      if (token !== cycle || !image.isConnected) return;
      const width = image.clientWidth, height = image.clientHeight, stroke = data.overlay.strokeWidth;
      if (!width || !height) return;
      annotations.setAttribute('viewBox', `0 0 ${width} ${height}`);
      for (const { target, span } of marks) {
        const left = Math.max(0, target.x * width), top = Math.max(0, target.y * height);
        const w = Math.max(0, Math.min(width, (target.x + target.width) * width) - left);
        const h = Math.max(0, Math.min(height, (target.y + target.height) * height) - top);
        const radius = Math.min(data.overlay.maxRadius, Math.max(0, Math.min(w - stroke, h - stroke)) * data.overlay.radiusFactor);
        // Same clipped/deflated path as the app painter; image pixels remain untouched.
        for (const [key, value] of Object.entries({ x: left + stroke / 2, y: top + stroke / 2, width: Math.max(0, w - stroke), height: Math.max(0, h - stroke), rx: radius, ry: radius, stroke: data.overlay.color, 'stroke-width': stroke })) span.setAttribute(key, value);
      }
    }
    const observer = new ResizeObserver(drawTargets); observer.observe(image); observers.push(observer);
    let imageTimer;
    function imageError() {
      if (token !== cycle || !image.isConnected) return;
      clearTimeout(imageTimer); error.hidden = false; frame.dataset.error = 'true'; image.hidden = true; updateProgress(record.id, 'error');
    }
    image.addEventListener('load', () => {
      if (token !== cycle || !image.isConnected) return;
      clearTimeout(imageTimer); error.hidden = true; delete frame.dataset.error; image.hidden = false; drawTargets(); updateProgress(record.id, 'loaded');
    });
    image.addEventListener('error', imageError);
    let attempt = 0;
    function requestImage() {
      if (token !== cycle) return;
      image.hidden = false; error.hidden = true; delete frame.dataset.error;
      updateProgress(record.id, 'pending');
      clearTimeout(imageTimer); imageTimer = setTimeout(imageError, 20000); timers.push(imageTimer);
      image.src = attempt++ ? `${displaySrc}&retry=${attempt}` : displaySrc;
    }
    button.addEventListener('click', requestImage);
    requestImage();
  }
  requestAnimationFrame(() => {
    if (token !== cycle) return;
    let id = ''; try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { /* Invalid anchors do not change the selected images. */ }
    if (expectedOrder.includes(id) || /^manual-(?:category-\d|feature-[\w-]+)$/u.test(id)) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  });
}
async function chooseLanguage(code, updateUrl = true) {
  currentCode = code;
  const token = ++cycle;
  clearView();
  if (!supports(code)) {
    updateChrome('ko'); language.selectedIndex = -1; showFailure('ko', ui.ko.chooseLanguage); return;
  }
  updateChrome(code); status.textContent = ui[code].loading;
  if (updateUrl) { const url = new URL(location.href); url.searchParams.set('lang', code); history.replaceState(null, '', url); }
  try {
    manifestPromise ||= loadManifest().catch(error => { manifestPromise = undefined; throw error; });
    const data = await manifestPromise;
    if (token !== cycle) return;
    renderManual(data, validateLocale(data, code), code, token);
  } catch (_) { if (token === cycle) showFailure(code); }
}
language.addEventListener('change', () => chooseLanguage(language.value));
contents.addEventListener('change', () => { if (contents.value) { document.getElementById(contents.value)?.scrollIntoView({ block: 'start' }); history.replaceState(null, '', `#${contents.value}`); } });
document.querySelector('.language-options').addEventListener('click', event => {
  const link = event.target.closest('a[lang]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); document.querySelector('.language-picker').open = false; chooseLanguage(link.lang);
});
retry.addEventListener('click', () => { manifestPromise = undefined; chooseLanguage(currentCode); });
window.addEventListener('popstate', () => chooseLanguage(new URL(location.href).searchParams.get('lang') || 'ko', false));
chooseLanguage(currentCode, false);
