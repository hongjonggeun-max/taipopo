const officialKoreanPolicyUrl =
  'https://hongjonggeun-max.github.io/taipopo-privacy/privacy/';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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
      html += `<li>${escapeHtml(line.slice(2))}</li>`;
      continue;
    }
    if (listOpen) {
      html += '</ul>';
      listOpen = false;
    }
    html += `<p>${escapeHtml(line)}</p>`;
  }
  if (listOpen) html += '</ul>';
  return html;
}

function renderPolicy(policy) {
  const resolvedBody = policy.body.replaceAll(
    '{effectiveDate}',
    policy.effectiveDate,
  );
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
    `<section class="glass policy-summary">${renderLines(metadata)}</section>`,
    ...sections.map(
      (section) =>
        `<section class="glass"><h2>${escapeHtml(section.heading)}</h2>${renderLines(section.lines)}</section>`,
    ),
  ].join('');
  return { title, html };
}

module.exports = { escapeHtml, officialKoreanPolicyUrl, renderPolicy };
