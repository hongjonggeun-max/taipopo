const officialKoreanPolicyUrl =
  'https://taipopo.app/ko/privacy/';
const webDisclosures = require('./website-disclosures.json');
const { copy } = require('./public-copy.cjs');
const { renderBuild17Access } = require('./build17-access.cjs');

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
    ['https://support.google.com/mail/answer/7401', 'Gmail'],
    ['https://policies.google.com/technologies/retention', 'Google'],
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
  resolvedBody = resolvedBody.replace(policy.revisionDate, webDisclosures.reviewDate);
  const qrSection = /(\n7\. [^\n]+\n)[\s\S]*?(?=\n\n8\. )/u;
  if (!qrSection.test(resolvedBody)) throw new Error('Missing versioned QR policy section');
  resolvedBody = resolvedBody.replace(qrSection, (_, heading) =>
    `${heading}${review.qrLegacy}\n\n${review.qrCandidate}`);
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

  // Keep the imported policy intact as provenance; organize current public facts here.
  const external = sections.find(section => section.heading.startsWith('8. '));
  // Keep exact imported text in privacy-content.json; the public introduction
  // names the actual paths instead of the ambiguous "in this case" reference.
  external.lines = ['', copy[policy.locale].externalIntroduction];
  external.lines.push('', ...copy[policy.locale].services);
  const retention = sections.find(section => section.heading.startsWith('4. '));
  retention.lines.push('', policy.websiteNotice.paragraphs.at(-1));
  const information = sections.find(section => section.heading.startsWith('2. '));
  const legacyPhotoLines = information.lines.filter(line =>
    /EXIF/iu.test(line) && !line.startsWith('• '));
  if (legacyPhotoLines.length !== 1 || !review.metadataResidualNotice?.trim()) {
    throw new Error(`Expected one imported photo-sharing paragraph: ${policy.locale}`);
  }
  // Keep the imported app text as provenance. The website distinguishes
  // processed gallery copies, remaining image metadata/pixels and backups.
  information.lines = information.lines.map(line =>
    line === legacyPhotoLines[0] ? review.gpsCache : line);
  const dateIndex = metadata.findIndex(line => line.includes(policy.effectiveDate));
  if (dateIndex < 0 || !review.privacyDateLabel?.trim() || !review.privacyDateScope?.trim()) {
    throw new Error(`Missing qualified existing policy date: ${policy.locale}`);
  }
  metadata[dateIndex] = `${review.privacyDateLabel}: ${policy.effectiveDate}`;
  if (policy.locale === 'ko') {
    for (const section of sections) section.lines = section.lines.map(line => line.replace(/\bmetadata\b/gu, '메타데이터(사진 부가정보)'));
  }

  for (const [number, fields] of [[2, ['gpsChoice']], [5, ['privacyBackupBuildGuidance']], [6, ['crashDeletion']]]) {
    const section = sections.find((entry) => entry.heading.startsWith(`${number}. `));
    if (!section || fields.some((field) => !review[field]?.trim())) {
      throw new Error(`Missing reviewed privacy details: ${policy.locale}/${number}`);
    }
    section.lines.push('', ...fields.flatMap((field) => [
      ...(field === 'privacyBackupBuildGuidance' ? review[field].split('\n') : [review[field]]), '',
    ]));
  }

  if (!title || metadata.length < 3 || sections.length < 8) {
    throw new Error('Privacy policy source is incomplete.');
  }

  const html = [
    `<section class="glass policy-summary" data-policy-date-status="unconfirmed">${renderLines([review.privacyDateScope, ...metadata, ...(policy.zipBackup.version ? [`TAIPOPO ${policy.zipBackup.version}`] : []), review.scope])}</section>`,
    ...sections.map(
      (section) =>
        `<section class="glass"${section === external ? ` data-web-review="${webDisclosures.reviewDate}"` : ''}><h2>${escapeHtml(section.heading)}</h2>${renderLines(section.lines)}</section>`,
    ),
    ...(policy.processingNotice
      ? policy.processingNotice.split(/\n\n(?=\d+\. )/u).map((block) => {
          const [heading, ...body] = block.split('\n');
          const content = heading.startsWith('14. ')
            ? [...body, '', copy[policy.locale].providerMailDeletion]
            : heading.startsWith('17. ')
              ? [copy[policy.locale].termsImplementationStatus, '', ...body]
              : body;
          return `<section class="glass" data-notice-version="${escapeHtml(policy.noticeVersion)}"><h2>${escapeHtml(heading.replace(/\s*·\s*2026-\d{2}-\d{2}/gu, ''))}</h2>${renderLines(content)}</section>`;
        })
      : []),
    `<section class="glass"><h2>${escapeHtml(copy[policy.locale].salesHeading)}</h2>${renderLines([review.localConfig, policy.websiteNotice.paragraphs[2]])}</section>`,
  ].join('');
  return { title, html: renderBuild17Access(policy.locale) + html };
}

function renderTerms(policy) {
  const terms = policy.terms;
  const reviewNotice = terms.reviewNotice.split('\n')
    .filter(line => !line.includes('plus17-consent-review-')).join('\n');
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
  const html = `<section class="glass policy-summary" data-review-version="${escapeHtml(policy.noticeVersion)}">${renderLines([reviewNotice, copy[policy.locale].termsImplementationStatus])}</section>` +
    sections.map((section) => `<section class="glass">${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ''}${renderLines(section.lines)}</section>`).join('');
  return { title, html: renderBuild17Access(policy.locale) + html, reviewNotice };
}

function renderDeletion(policy) {
  const review = reviewedDisclosure(policy);
  // Publish the review date without inventing a new legal effective date.
  const body = policy.deletion.body.split('\n')
    .filter((line) => !line.includes('{effectiveDate}')).join('\n');
  const lines = body.split('\n');
  const title = lines.shift();
  const revisionLine = policy.body.split('\n').find((line) => line.includes(policy.revisionDate));
  if (!revisionLine) throw new Error('Missing localized revision date');
  lines.unshift(`TAIPOPO ${policy.zipBackup.version}`, revisionLine.replace(policy.revisionDate, webDisclosures.reviewDate));
  const sections = [];
  let current = { heading: null, lines: [] };
  for (const line of lines) {
    if (/^\d+\. /u.test(line)) {
      sections.push(current);
      current = { heading: line, lines: [] };
    } else current.lines.push(line);
  }
  sections.push(current);
  for (const [number, field] of [[5, 'currentBackup'], [7, 'crashDeletion']]) {
    const section = sections.find((entry) => entry.heading?.startsWith(`${number}. `));
    if (!section || !review[field]?.trim()) throw new Error(`Missing reviewed deletion details: ${policy.locale}/${number}`);
    if (number === 5) section.lines = ['', review[field]];
    else section.lines.push('', review[field]);
  }
  const inquirySection = sections.find((entry) => entry.heading?.startsWith('9. '));
  if (!inquirySection) throw new Error(`Missing support deletion section: ${policy.locale}`);
  inquirySection.lines.push('', ...copy[policy.locale].supportMailPolicy.split('\n\n'));
  if (sections.filter((s) => s.heading).length < 6) throw new Error('Deletion source is incomplete.');
  const html = sections.map((section) => `<section class="glass"${section.heading?.startsWith('7. ') ? ` data-web-review="${webDisclosures.reviewDate}"` : ''}>${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ''}${renderLines(section.lines)}</section>`).join('') +
    `<section class="glass" data-review-version="${escapeHtml(policy.noticeVersion)}">${renderLines(policy.deletion.notice.split('\n').slice(1))}</section>`;
  return { title, html };
}

function renderSupportProcessing(policy) {
  const block = policy.processingNotice.split(/\n\n(?=\d+\. )/u).find((part) => part.startsWith('14. '));
  if (!block) throw new Error('Missing received-email notice');
  const [heading] = block.split('\n');
  return `<section class="glass" data-support-processing="${escapeHtml(policy.noticeVersion)}" data-web-review="${webDisclosures.reviewDate}"><h2>${escapeHtml(heading.replace(/^14\.\s*/u, ''))}</h2>${renderLines([copy[policy.locale].services[3], ...copy[policy.locale].supportMailPolicy.split('\n\n')])}<p><a href="../privacy/">${escapeHtml(policy.body.split('\n')[0])}</a> · <a href="../deletion/">${escapeHtml(policy.deletion.body.split('\n')[0])}</a></p></section>`;
}

module.exports = { escapeHtml, officialKoreanPolicyUrl, renderPolicy, renderTerms, renderDeletion, renderSupportProcessing };
