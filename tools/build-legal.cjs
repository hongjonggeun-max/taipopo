// Update only legal content/links in existing pages; retain the current site layouts.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const policies = require('./privacy-content.json');
const { escapeHtml, officialKoreanPolicyUrl, renderPolicy, renderTerms, renderDeletion, renderSupportProcessing } = require('./privacy-page.cjs');

function replacePolicyContent(html, content) {
  const marker = '<div class="policy-content">';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('Missing existing policy container');
  const tags = /<div\b[^>]*>|<\/div>/gu;
  tags.lastIndex = start + marker.length;
  let depth = 1;
  let match;
  while ((match = tags.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      return html.slice(0, start + marker.length) + content + html.slice(match.index);
    }
  }
  throw new Error('Unclosed policy container');
}

function legalFooter(html, code, nested) {
  const policy = policies[code];
  const prefix = nested ? '../' : '';
  const title = policy.body.split('\n')[0];
  const supportLabel = html.match(/<a\b[^>]*href="[^"]*support\/"[^>]*>([^<]+)<\/a>/u)?.[1]
    || (code === 'en' ? 'Support' : undefined);
  if (!supportLabel) throw new Error(`Missing existing localized support label: ${code}`);
  const deletionTitle = policy.deletion.body.split('\n')[0];
  const links = `<p class="legal-links"><a href="${prefix}privacy/">${escapeHtml(title)}</a> · <a href="${prefix}terms/">${escapeHtml(policy.terms.title)}</a> · <a href="${prefix}deletion/">${escapeHtml(deletionTitle)}</a> · <a href="${prefix}support/">${supportLabel}</a></p>`;
  html = html.replace(/<p class="legal-links">[\s\S]*?<\/p>/gu, '');
  if (!/<footer\b/u.test(html)) throw new Error('Missing existing footer');
  return html.replace(/<footer\b[^>]*>/u, (open) => open + links);
}

function updateSet(code, prefix) {
  const policy = policies[code];
  if (policy.noticeVersion !== '2026-11-07' || !policy.terms?.reviewNotice) {
    throw new Error(`Run sync-privacy.cjs with the current app source first: ${code}`);
  }
  for (const relative of ['index.html', 'support/index.html', 'privacy/index.html']) {
    const file = path.join(root, prefix, relative);
    let html = fs.readFileSync(file, 'utf8');
    if (relative === 'privacy/index.html') {
      const currentPolicyLink = code === 'ko' && prefix === ''
        ? `<section class="glass"><h2>공식 공개 정책</h2><p><a href="${officialKoreanPolicyUrl}">한국어 개인정보처리방침</a></p></section>`
        : '';
      html = replacePolicyContent(html, renderPolicy(policy).html + currentPolicyLink);
    }
    if (relative === 'support/index.html') {
      html = html.replace(/<section class="glass" data-support-processing="[^"]*">[\s\S]*?<\/section>/gu, '');
      html = html.replace(/<section class="glass" data-web-review="[^"]*">[\s\S]*?<\/section>/gu, '');
      html = html.replace('<footer', renderSupportProcessing(policy) + '<footer');
    }
    html = legalFooter(html, code, relative !== 'index.html');
    fs.writeFileSync(file, html.replace(/\s*$/u, '') + '\n');
  }
  const source = fs.readFileSync(path.join(root, prefix, 'privacy/index.html'), 'utf8');
  const terms = renderTerms(policy);
  let html = replacePolicyContent(source, terms.html);
  html = html.replace(/<title>[^<]*<\/title>/u, `<title>${escapeHtml(terms.title)} · TAIPOPO</title>`);
  html = html.replace(/<(div|section) class="page-intro">[\s\S]*?<\/\1>/u,
    `<section class="page-intro"><h1>${escapeHtml(terms.title)}</h1></section>`);
  html = html.replace(/<meta name="description" content="[^"]*">/u,
    `<meta name="description" content="${escapeHtml(policy.terms.reviewNotice)}">`);
  html = html.replace(/<details class="language-picker">[\s\S]*?<\/details>/u,
    (picker) => picker.replaceAll('/privacy/', '/terms/'));
  html = legalFooter(html, code, true);
  const target = path.join(root, prefix, 'terms/index.html');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html.replace(/\s*$/u, '') + '\n');
  const deletion = renderDeletion(policy);
  let deletionHtml = replacePolicyContent(source, deletion.html);
  deletionHtml = deletionHtml.replace(/<title>[^<]*<\/title>/u, `<title>${escapeHtml(deletion.title)} · TAIPOPO</title>`);
  deletionHtml = deletionHtml.replace(/<(div|section) class="page-intro">[\s\S]*?<\/\1>/u,
    `<section class="page-intro"><h1>${escapeHtml(deletion.title)}</h1></section>`);
  deletionHtml = deletionHtml.replace(/<meta name="description" content="[^"]*">/u,
    `<meta name="description" content="${escapeHtml(deletion.title)}">`);
  deletionHtml = deletionHtml.replace(/<details class="language-picker">[\s\S]*?<\/details>/u,
    (picker) => picker.replaceAll('/privacy/', '/deletion/'));
  deletionHtml = legalFooter(deletionHtml, code, true);
  const deletionTarget = path.join(root, prefix, 'deletion/index.html');
  fs.mkdirSync(path.dirname(deletionTarget), { recursive: true });
  fs.writeFileSync(deletionTarget, deletionHtml.replace(/\s*$/u, '') + '\n');
}

for (const code of Object.keys(policies)) updateSet(code, code);
updateSet('ko', '');
console.log('Updated policy/support notices and 16 localized terms/deletion drafts plus Korean root routes. No deployment.');
