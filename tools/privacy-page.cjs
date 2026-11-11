const officialKoreanPolicyUrl =
  'https://taipopo.app/ko/privacy/';
const webDisclosures = require('./website-disclosures.json');

function reviewedDisclosure(policy) {
  const review = webDisclosures.locales[policy.locale];
  if (!review) throw new Error(`Missing reviewed website disclosure: ${policy.locale}`);
  return review;
}

function renderWebDisclosure(policy, fields) {
  const review = reviewedDisclosure(policy);
  return `<section class="glass" data-web-review="${webDisclosures.reviewDate}"><h2>${escapeHtml(review.heading)} · ${webDisclosures.reviewDate}</h2>${renderLines(fields.map((field) => review[field]))}</section>`;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderInline(value) {
  let html = escapeHtml(value);
  html = html.replaceAll('taipopo.app@gmail.com',
    '<a href="mailto:taipopo.app@gmail.com">taipopo.app@gmail.com</a>');
  for (const [url, label] of [
    ['https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', 'GitHub'],
    ['https://policies.google.com/privacy', 'Google'],
    ['https://www.edpb.europa.eu/about-edpb/our-members_en', 'EDPB'],
  ]) {
    html = html.replaceAll(url, `<a href="${url}">${label}</a>`);
  }
  return html;
}

function renderLines(lines) {
  let html = '';
  let listOpen = false;
  for (const line of lines) {
    if (!line) {
      if (listOpen) {
        html += '</ul>';
        listOpen = false;
      }
      continue;
    }
    if (line.startsWith('• ')) {
      if (!listOpen) {
        html += '<ul>';
        listOpen = true;
      }
      html += `<li>${renderInline(line.slice(2))}</li>`;
      continue;
    }
    if (listOpen) {
      html += '</ul>';
      listOpen = false;
    }
    html += `<p>${renderInline(line)}</p>`;
  }
  if (listOpen) html += '</ul>';
  return html;
}

function renderPolicy(policy) {
  const review = reviewedDisclosure(policy);
  let resolvedBody = policy.body.replaceAll(
    '{effectiveDate}',
    policy.effectiveDate,
  );
  const qrSection = /(\n7\. [^\n]+\n)[\s\S]*?(?=\n\n8\. )/u;
  if (!qrSection.test(resolvedBody)) throw new Error('Missing versioned QR policy section');
  resolvedBody = resolvedBody.replace(qrSection, (_, heading) =>
    `${heading}${review.qrLegacy}\n\n${review.qrCandidate}`);
  const authSection = /(\n5\. [^\n]+\n)[^\n]+(?=\n\n)/u;
  if (!authSection.test(resolvedBody)) throw new Error('Missing Google authentication section');
  resolvedBody = resolvedBody.replace(authSection, (_, heading) => `${heading}${review.authScope}`);
  const lines = resolvedBody.split('\n');
  const title = lines.shift();
  while (lines[0] === '') lines.shift();

  const metadata = [];
  while (lines.length && !/^\d+\.\s/u.test(lines[0])) {
    metadata.push(lines.shift());
  }

  const sections = [];
  let current = null;
  for (const line of lines) {
    if (/^\d+\.\s/u.test(line)) {
      if (current) sections.push(current);
      current = { heading: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  if (!title || metadata.length < 3 || sections.length < 8) {
    throw new Error('Privacy policy source is incomplete.');
  }

  const html = [
    `<section class="glass policy-summary">${renderLines([...metadata, review.scope])}</section>`,
    ...sections.map(
      (section) =>
        `<section class="glass"><h2>${escapeHtml(section.heading)}</h2>${renderLines(section.lines)}</section>`,
    ),
    ...(policy.websiteNotice
      ? [`<section class="glass"><h2>${escapeHtml(policy.websiteNotice.heading)}</h2>${renderLines([review.localConfig, ...policy.websiteNotice.paragraphs.slice(1)])}</section>`]
      : []),
    ...(policy.processingNotice
      ? policy.processingNotice.split(/\n\n(?=\d+\. )/u).map((block) => {
          const [heading, ...body] = block.split('\n');
          return `<section class="glass" data-notice-version="${escapeHtml(policy.noticeVersion)}"><h2>${escapeHtml(heading)}</h2>${renderLines(body)}</section>`;
        })
      : []),
    renderWebDisclosure(policy, ['international', 'otherInternational', 'deletion']),
  ].join('');
  return { title, html };
}

function renderTerms(policy) {
  const terms = policy.terms;
  const lines = terms.body.replaceAll('{effectiveDate}', terms.effectiveDate).split('\n');
  const title = lines.shift();
  const sections = [];
  let current = { heading: null, lines: [] };
  for (const line of lines) {
    if (/^\d+\. /u.test(line)) {
      sections.push(current);
      current = { heading: line, lines: [] };
    } else current.lines.push(line);
  }
  sections.push(current);
  if (sections.filter((s) => s.heading).length !== 11) {
    throw new Error('Terms source must retain all 11 sections.');
  }
  const html = `<section class="glass policy-summary" data-review-version="${escapeHtml(policy.noticeVersion)}">${renderLines([terms.reviewNotice])}</section>` +
    sections.map((section) => `<section class="glass">${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ''}${renderLines(section.lines)}</section>`).join('');
  return { title, html };
}

function renderDeletion(policy) {
  const review = reviewedDisclosure(policy);
  let body = policy.deletion.body.replaceAll('{effectiveDate}', policy.deletion.effectiveDate);
  const accountSection = /(\n1\. [^\n]+\n)[\s\S]*?(?=\n\n2\. )/u;
  if (!accountSection.test(body)) throw new Error('Missing app account deletion section');
  body = body.replace(accountSection, (_, heading) => `${heading}${review.accountScope}\n\n${review.authScope}`);
  const lines = body.split('\n');
  const title = lines.shift();
  const sections = [];
  let current = { heading: null, lines: [] };
  for (const line of lines) {
    if (/^\d+\. /u.test(line)) {
      sections.push(current);
      current = { heading: line, lines: [] };
    } else current.lines.push(line);
  }
  sections.push(current);
  if (sections.filter((s) => s.heading).length < 6) throw new Error('Deletion source is incomplete.');
  const html = sections.map((section) => `<section class="glass">${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ''}${renderLines(section.lines)}</section>`).join('') +
    `<section class="glass" data-review-version="${escapeHtml(policy.noticeVersion)}">${renderLines(policy.deletion.notice.split('\n'))}</section>` +
    renderWebDisclosure(policy, ['deletion']);
  return { title, html };
}

function renderSupportProcessing(policy) {
  const block = policy.processingNotice.split(/\n\n(?=\d+\. )/u).find((part) => part.startsWith('14. '));
  if (!block) throw new Error('Missing received-email notice');
  const [heading, ...lines] = block.split('\n');
  return `<section class="glass" data-support-processing="${escapeHtml(policy.noticeVersion)}"><h2>${escapeHtml(heading)}</h2>${renderLines(lines)}</section>` +
    renderWebDisclosure(policy, ['deletion']);
}

module.exports = { escapeHtml, officialKoreanPolicyUrl, renderPolicy, renderTerms, renderDeletion, renderSupportProcessing };
