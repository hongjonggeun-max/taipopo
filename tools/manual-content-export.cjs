'use strict';

// Read-only, deliberately limited interpreter for the three current manual lists.
// This does not execute Dart, Flutter, application code, or arbitrary JavaScript.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { fileURLToPath, pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const BASE = 'lib/screens/settings/pages/manual/';
const EXPECTED_COUNTS = [10, 27, 9, 6, 22, 39];
const EXPECTED_KEYS = ['main', 'gallery', 'settlement', 'report', 'camera', 'settings'];
const EXPECTED_SCREENS = ['guide-main', 'guide-gallery', 'guide-settlement', 'guide-report', null, null];

class Parser {
  constructor(text, source, offset = 0) { this.text = text; this.source = source; this.at = offset; this.cached = null; }
  fail(message, position = this.at) {
    const line = this.text.slice(0, position).split('\n').length;
    throw Error(`${this.source}:${line}: ${message}`);
  }
  scan() {
    for (;;) {
      while (/\s/u.test(this.text[this.at] || '') && this.at < this.text.length) this.at++;
      if (this.text.startsWith('//', this.at)) { const end = this.text.indexOf('\n', this.at); this.at = end < 0 ? this.text.length : end; continue; }
      if (this.text.startsWith('/*', this.at)) { const end = this.text.indexOf('*/', this.at + 2); if (end < 0) this.fail('Unclosed comment'); this.at = end + 2; continue; }
      break;
    }
    const start = this.at, c = this.text[this.at];
    if (start === this.text.length) return { type: 'end', value: '<EOF>', start, end: start };
    if (c === "'" || c === '"') {
      const quote = c; this.at++;
      while (this.at < this.text.length) {
        const value = this.text[this.at++];
        if (value === '\\') { if (this.at >= this.text.length) this.fail('Unclosed string escape'); this.at++; continue; }
        if (value === quote) return { type: 'string', value: this.text.slice(start, this.at), start, end: this.at };
        if (value === '\n' || value === '\r') this.fail('Multiline string syntax is unsupported', start);
      }
      this.fail('Unclosed string', start);
    }
    const identifier = this.text.slice(start).match(/^(?:[A-Za-z_][A-Za-z0-9_]*|\$[1-9][0-9]*)/u);
    if (identifier) { this.at += identifier[0].length; return { type: 'id', value: identifier[0], start, end: this.at }; }
    const number = this.text.slice(start).match(/^(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?)/u);
    if (number) { this.at += number[0].length; return { type: 'number', value: number[0], start, end: this.at }; }
    if (this.text.startsWith('...', start)) { this.at += 3; return { type: 'symbol', value: '...', start, end: this.at }; }
    if ('()[]{}.,:;<>?=!-'.includes(c)) { this.at++; return { type: 'symbol', value: c, start, end: this.at }; }
    this.fail(`Unsupported token ${JSON.stringify(c)}`, start);
  }
  peek() { return this.cached ||= this.scan(); }
  take(value) {
    const token = this.peek();
    if (value !== undefined && token.value !== value) this.fail(`Expected ${value}, got ${token.value}`, token.start);
    this.cached = null; return token;
  }
  accept(value) { if (this.peek().value !== value) return false; this.take(); return true; }
  node(type, start, fields) { return { type, source: this.source, start, end: this.peek().start, ...fields }; }
  list() {
    const start = this.take('[').start, items = [];
    while (this.peek().value !== ']') {
      if (this.peek().value === 'for') {
        const begin = this.take().start; this.take('('); this.take('final'); const variable = this.take().value; this.take('in');
        const iterable = this.expression(); this.take(')'); const body = this.expression();
        items.push(this.node('for', begin, { variable, iterable, body }));
      } else if (this.peek().value === 'if') {
        const begin = this.take().start; this.take('('); const condition = this.expression(); this.take(')'); this.take('...');
        const body = this.list(); items.push(this.node('ifSpread', begin, { condition, body }));
      } else {
        items.push(this.expression());
      }
      if (!this.accept(',')) { if (this.peek().value !== ']') this.fail('Only comma-separated collection entries are supported'); }
    }
    const end = this.take(']').end;
    return { type: 'list', source: this.source, start, end, items };
  }
  expression() {
    const first = this.peek(), start = first.start;
    if (first.value === '<') {
      // The only current typed collection is the eight settings triples.
      for (const token of ['<', '(', 'String', ',', 'String', ',', 'String', ')', '>']) this.take(token);
      const value = this.list(); return { ...value, start, tupleType: ['String', 'String', 'String'] };
    }
    if (first.value === '[') return this.list();
    if (first.value === '(') {
      this.take(); const values = [this.expression()];
      while (this.accept(',')) values.push(this.expression());
      const end = this.take(')').end;
      if (values.length !== 3) this.fail('Only three-element settings tuples are supported', start);
      return { type: 'tuple', source: this.source, start, end, values };
    }
    if (first.type === 'string') {
      const strings = [];
      do { strings.push(this.take()); } while (this.peek().type === 'string');
      return { type: 'strings', source: this.source, start, end: strings.at(-1).end, strings: strings.map(t => t.value) };
    }
    if (first.type !== 'id') this.fail(`Unsupported expression ${first.value}`, start);
    const names = [this.take().value];
    while (this.accept('.')) { const part = this.take(); if (part.type !== 'id') this.fail('Expected member name', part.start); names.push(part.value); }
    if (this.accept('(')) {
      if (names.length !== 1) this.fail('Only explicitly allowed unqualified calls are supported', start);
      const args = [], named = {};
      while (this.peek().value !== ')') {
        const argument = this.expression();
        if (this.accept(':')) {
          if (argument.type !== 'member' || argument.names.length !== 1) this.fail('Invalid named argument', argument.start);
          const name = argument.names[0]; if (Object.hasOwn(named, name)) this.fail(`Duplicate named argument ${name}`, argument.start);
          named[name] = this.expression();
        } else { if (Object.keys(named).length) this.fail('Positional argument after named argument'); args.push(argument); }
        if (!this.accept(',')) { if (this.peek().value !== ')') this.fail('Unsupported call syntax'); }
      }
      const end = this.take(')').end;
      return { type: 'call', source: this.source, start, end, name: names[0], args, named };
    }
    return { type: 'member', source: this.source, start, end: this.peek().start, names };
  }
}

function resolveManual(appRoot) {
  if (!appRoot || !path.isAbsolute(appRoot)) throw Error('An explicit absolute appRoot is required');
  appRoot = path.resolve(appRoot);
  const sources = new Map(), texts = new Map();
  function read(relative, absolute = path.join(appRoot, relative)) {
    if (!texts.has(relative)) {
      const bytes = fs.readFileSync(absolute); texts.set(relative, bytes.toString('utf8'));
      sources.set(relative, { path: relative, absolutePath: absolute, bytes: bytes.length, sha256: sha(bytes) });
    }
    return texts.get(relative);
  }
  function location(node) {
    return { file: node.source, line: texts.get(node.source).slice(0, node.start).split('\n').length,
      expression: texts.get(node.source).slice(node.start, node.end).trim() };
  }
  function definition(relative, name) {
    const text = read(relative), regex = new RegExp(`\\b${name}\\(AppLocalizations l\\)\\s*=>\\s*`, 'gu');
    const matches = [...text.matchAll(regex)]; if (matches.length !== 1) throw Error(`Expected one exact definition of ${name}`);
    const parser = new Parser(text, relative, matches[0].index + matches[0][0].length);
    const ast = parser.list(); parser.take(';'); return ast;
  }
  const definitions = {
    manualChapters: definition(BASE + 'manual_feature_catalog.dart', 'manualChapters'),
    manualCameraFeatures: definition(BASE + 'manual_camera_settings_features.dart', 'manualCameraFeatures'),
    manualSettingsFeatures: definition(BASE + 'manual_camera_settings_features.dart', 'manualSettingsFeatures'),
  };
  const configuration = read('lib/config/app_build_environment.dart');
  if (!/static const bool cloudAndBackupEnabled\s*=\s*!isValidation\s*;/u.test(configuration)) throw Error('Review changed cloudAndBackupEnabled semantics');
  const validationDefinition = configuration.match(/static const bool isValidation\s*=([^;]+);/u)?.[1]?.replace(/\s+/gu, ' ').trim();
  assert.equal(validationDefinition, 'appFlavor == deviceValidationFlavor || appFlavor == restorePolicyValidationFlavor || appFlavor == crashlyticsValidationFlavor || appFlavor == atomicValidationFlavor', 'Review changed validation flavor gate');
  for (const flavor of ['deviceValidation', 'restorePolicyValidation', 'crashlyticsValidation', 'atomicValidation']) {
    assert.match(configuration, new RegExp(`static const String ${flavor}Flavor\\s*=\\s*'${flavor}'\\s*;`, 'u'));
  }

  const languageSource = read('lib/settings/app_language_options.dart');
  const languageOptions = [...languageSource.matchAll(/AppLanguageOption\(code: '([a-z]+)', label: '([^']+)'\)/gu)].map(m => ({ code: m[1], name: m[2] }));
  assert.equal(languageOptions.length, 16); assert.equal(new Set(languageOptions.map(l => l.code)).size, 16);
  const packageConfigRelative = '.dart_tool/package_config.json', packageConfigPath = path.join(appRoot, packageConfigRelative);
  const packageConfig = JSON.parse(read(packageConfigRelative));
  const flutter = packageConfig.packages.find(p => p.name === 'flutter');
  if (!flutter) throw Error('Flutter package root missing from package_config.json');
  const flutterRoot = fileURLToPath(new URL(flutter.rootUri, pathToFileURL(packageConfigPath)));
  const iconSourcePath = path.join(flutterRoot, 'lib/src/material/icons.dart'), colorSourcePath = path.join(flutterRoot, 'lib/src/material/colors.dart');
  const iconSource = read('flutter-sdk/material/icons.dart', iconSourcePath);
  const materialColorSource = read('flutter-sdk/material/colors.dart', colorSourcePath);
  const appColorSource = read('lib/core/theme/app_colors.dart');
  const continuous = read(BASE + 'manual_continuous_content.dart');
  // Fail rather than silently losing runtime icon/background/adaptive-color behavior.
  assert.match(continuous, /id\.startsWith\('manual-feature-editor-'\)\s*\|\|\s*color == Colors\.white\s*\|\|\s*color == Colors\.greenAccent\s*\|\|\s*color == Colors\.cyanAccent\s*\? const Color\(0xFF25282C\)/u);
  assert.match(continuous, /if \(icon == null\) return null/u);
  assert.match(continuous, /color == AppColors\.textPrimary\s*\? fallbackColor \?\? color\s*: color/u);
  assert.match(appColorSource, /adaptiveTextPrimary\(BuildContext context\)\s*\{\s*return isDark\(context\) \? darkTextPrimary : textPrimary;/u);
  const icons = {}, colors = {}, referencedKeys = new Set();
  function color(reference) {
    if (colors[reference]) return colors[reference];
    const [owner, name] = reference.split('.'); if (!['AppColors', 'Colors'].includes(owner) || !name) throw Error(`Unsupported color ${reference}`);
    const source = owner === 'AppColors' ? appColorSource : materialColorSource;
    const match = source.match(new RegExp(`static const (?:Color|MaterialColor|MaterialAccentColor) ${name}\\s*=\\s*(?:Color|MaterialColor|MaterialAccentColor)\\(\\s*(0x[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*)`, 'u'));
    if (!match) throw Error(`Unsupported color declaration ${reference}`);
    let value = match[1];
    if (!value.startsWith('0x')) {
      value = source.match(new RegExp(`static const int ${value}\\s*=\\s*(0x[0-9A-Fa-f]+)\\s*;`, 'u'))?.[1];
      if (!value) throw Error(`Unresolved material swatch primary value ${reference}`);
    }
    const argb = Number.parseInt(value, 16); if ((argb >>> 24) !== 255) throw Error(`Review non-opaque manual color ${reference}`);
    colors[reference] = { reference, argb, argbHex: `0x${argb.toString(16).toUpperCase().padStart(8, '0')}`, css: `#${(argb & 0xffffff).toString(16).toUpperCase().padStart(6, '0')}` };
    return colors[reference];
  }
  function glyph(reference) {
    if (icons[reference]) return icons[reference];
    if (!reference.startsWith('Icons.')) throw Error(`Unsupported icon ${reference}`);
    const name = reference.slice(6);
    const match = iconSource.match(new RegExp(`static const IconData ${name}\\s*=\\s*IconData\\(([\\s\\S]*?)\\);`, 'u'));
    if (!match) throw Error(`Missing Flutter icon ${reference}`);
    const declaration = match[1].replace(/\s+/gu, ' ').trim();
    const parsed = declaration.match(/^(0x[0-9a-fA-F]+), fontFamily: '([^']+)'(?:, matchTextDirection: (true|false))?,?$/u);
    if (!parsed) throw Error(`Unsupported IconData declaration ${reference}: ${declaration}`);
    icons[reference] = { name, codePoint: Number.parseInt(parsed[1], 16), codePointHex: parsed[1], fontFamily: parsed[2], matchTextDirection: parsed[3] === 'true', declaration };
    return icons[reference];
  }
  function iconSpec(reference, colorReference, rowId) {
    if (reference === null) return null;
    const original = color(colorReference), adaptive = original.argb === color('AppColors.textPrimary').argb;
    const darkBackground = rowId.startsWith('manual-feature-editor-') || ['Colors.white', 'Colors.greenAccent', 'Colors.cyanAccent'].some(c => original.argb === color(c).argb);
    return { ...glyph(reference), color: original.css, colorDark: adaptive ? color('AppColors.darkTextPrimary').css : original.css,
      colorRole: adaptive ? 'adaptiveTextPrimary' : 'fixed', sourceColor: colorReference, argb: original.argb,
      background: darkBackground ? '#25282C' : 'transparent', boxSize: 34, glyphSize: 22, borderRadius: 8 };
  }

  function stringValue(raw, env, usedKeys) {
    let out = '';
    for (let i = 1; i < raw.length - 1; i++) {
      let c = raw[i];
      if (c === '\\') {
        c = raw[++i]; const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '\\': '\\', "'": "'", '"': '"', '$': '$' };
        if (Object.hasOwn(escapes, c)) { out += escapes[c]; continue; }
        if (c === 'u') {
          const match = raw.slice(i + 1).match(/^(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))/u);
          if (!match) throw Error('Unsupported Unicode escape'); out += String.fromCodePoint(Number.parseInt(match[1] || match[2], 16)); i += match[0].length; continue;
        }
        throw Error(`Unsupported string escape \\${c}`);
      }
      if (c === '$') {
        const match = raw.slice(i).match(/^\$\{l\.([A-Za-z_][A-Za-z0-9_]*)\}/u);
        if (!match) throw Error(`Unsupported interpolation in ${raw}`);
        out += localized(match[1], env, usedKeys); i += match[0].length - 1; continue;
      }
      out += c;
    }
    return out;
  }
  function localized(key, env, usedKeys) {
    if (!Object.hasOwn(env.arb, key) || typeof env.arb[key] !== 'string' || !env.arb[key].trim()) throw Error(`Missing localized text ${env.code}.${key}`);
    if (Object.keys(env.arb[`@${key}`]?.placeholders || {}).length) throw Error(`Parameterized message requires explicit handling: ${env.code}.${key}`);
    referencedKeys.add(key); usedKeys?.add(key); return env.arb[key];
  }
  function value(node, env, usedKeys) {
    if (node.type === 'strings') return node.strings.map(raw => stringValue(raw, env, usedKeys)).join('');
    if (node.type === 'member') {
      const names = node.names;
      if (names.length === 1 && names[0] === 'l') return env;
      if (names.length === 2 && names[0] === 'l') return localized(names[1], env, usedKeys);
      if (names.length === 2 && ['Icons', 'AppColors', 'Colors'].includes(names[0])) return names.join('.');
      if (names.join('.') === 'AppBuildEnvironment.cloudAndBackupEnabled') return true;
      if (names.length === 2 && env.tuples?.[names[0]] && /^\$[1-3]$/u.test(names[1])) return value(env.tuples[names[0]][Number(names[1].slice(1)) - 1], env, usedKeys);
      throw Error(`Unsupported member ${names.join('.')} at ${JSON.stringify(location(node))}`);
    }
    if (node.type === 'list') {
      const result = [];
      for (const item of node.items) {
        if (item.type === 'for') {
          if (!item.iterable.tupleType || item.iterable.items.length !== 8 || item.iterable.items.some(n => n.type !== 'tuple')) throw Error('Review changed settings tuple loop');
          for (const tuple of item.iterable.items) result.push(value(item.body, { ...env, tuples: { ...env.tuples, [item.variable]: tuple.values }, iterationSource: location(tuple) }));
        } else if (item.type === 'ifSpread') {
          if (item.condition.type !== 'member' || item.condition.names.join('.') !== 'AppBuildEnvironment.cloudAndBackupEnabled' || item.body.items.length !== 3) throw Error('Unsupported manual condition/spread');
          const condition = { ...location(item.condition), productionValue: true };
          if (value(item.condition, env)) result.push(...value(item.body, { ...env, conditions: [...(env.conditions || []), condition] }));
        } else { result.push(value(item, env)); }
      }
      return result;
    }
    if (node.type === 'call') {
      if (Object.hasOwn(definitions, node.name)) {
        if (node.args.length !== 1 || node.args[0].type !== 'member' || node.args[0].names.join('.') !== 'l' || Object.keys(node.named).length) throw Error('Unsupported manual helper arguments');
        if (node.name === 'manualChapters') throw Error('Unexpected recursive manualChapters call');
        return value(definitions[node.name], env);
      }
      const allowed = node.name === 'ManualFeature' ? ['icon', 'color', 'notice'] : node.name === 'ManualChapter' ? ['screen'] : null;
      if (!allowed || node.args.length !== 4 || Object.keys(node.named).some(k => !allowed.includes(k))) throw Error(`Unsupported constructor signature ${node.name}`);
      function text(arg) {
        const keys = new Set(), resolved = value(arg, env, keys);
        if (typeof resolved !== 'string' || !resolved.trim()) throw Error(`Empty/nontext manual field at ${JSON.stringify(location(arg))}`);
        return { value: resolved, source: { ...location(arg), arbKeys: [...keys] } };
      }
      if (node.name === 'ManualFeature') {
        const id = text(node.args[0]), title = text(node.args[1]), body = text(node.args[2]), source = text(node.args[3]);
        if (id.source.arbKeys.length || !/^[a-z0-9-]+$/u.test(id.value)) throw Error('Feature ID must be a stable literal');
        const notice = node.named.notice ? text(node.named.notice) : null;
        const icon = node.named.icon ? value(node.named.icon, env) : null;
        const colorReference = node.named.color ? value(node.named.color, env) : 'AppColors.textPrimary';
        return { id: id.value, rowId: `manual-feature-${id.value}`, title: title.value, body: body.value, notice: notice?.value ?? null,
          icon: iconSpec(icon, colorReference, `manual-feature-${id.value}`), source: source.value,
          expressions: { id: id.source, title: title.source, body: body.source, notice: notice?.source ?? null,
            icon: node.named.icon ? location(node.named.icon) : null, color: node.named.color ? location(node.named.color) : { expression: 'AppColors.textPrimary', defaultFrom: BASE + 'manual_feature_catalog.dart:16' } },
          conditions: env.conditions || [], iterationSource: env.iterationSource || null };
      }
      const title = text(node.args[0]), icon = value(node.args[1], env), colorReference = value(node.args[2], env), features = value(node.args[3], env);
      if (!Array.isArray(features)) throw Error('Chapter features must be an explicitly resolved list');
      return { title: title.value, titleKey: title.source.arbKeys.length === 1 ? title.source.arbKeys[0] : null,
        screen: node.named.screen ? text(node.named.screen).value : null,
        icon: iconSpec(icon, colorReference, 'manual-category'), features, expressions: { title: title.source, icon: location(node.args[1]), color: location(node.args[2]) } };
    }
    throw Error(`Unsupported AST node ${node.type}`);
  }

  const locales = {}, checks = [];
  for (const { code, name } of languageOptions) {
    const arbPath = `lib/l10n/app_${code}.arb`, arb = JSON.parse(read(arbPath));
    const env = { code, arb, tuples: {}, conditions: [] };
    const chapters = value(definitions.manualChapters, env);
    assert.deepEqual(chapters.map(c => c.titleKey), EXPECTED_KEYS, `${code}: chapter order drift`);
    assert.deepEqual(chapters.map(c => c.screen), EXPECTED_SCREENS, `${code}: image selection drift`);
    assert.deepEqual(chapters.map(c => c.features.length), EXPECTED_COUNTS, `${code}: feature count drift`);
    const ids = chapters.flatMap(c => c.features.map(f => f.id)); assert.equal(ids.length, 113); assert.equal(new Set(ids).size, 113);
    chapters.forEach((chapter, index) => {
      chapter.id = `manual-category-${index}`; chapter.order = index + 1;
      chapter.features.forEach((feature, featureIndex) => { feature.chapterId = chapter.id; feature.order = featureIndex + 1; });
    });
    const allFeatures = chapters.flatMap(c => c.features);
    assert.deepEqual(allFeatures.filter(f => f.notice !== null).map(f => f.id), ['workplace-gps-address', 'attendance']);
    assert.deepEqual(allFeatures.filter(f => f.conditions.length).map(f => f.id), ['backup-drive', 'drive-management', 'restore-drive']);
    assert.equal(allFeatures.filter(f => f.iterationSource).length, 8);
    locales[code] = { name, direction: code === 'ar' ? 'rtl' : 'ltr', title: localized('userGuideTitle', env), intro: localized('manualIntro', env), chapters };
    const generatedPath = `lib/l10n/generated/app_localizations_${code}.dart`, generated = read(generatedPath);
    for (const key of referencedKeys) {
      const regex = new RegExp(`\\bString get ${key}\\s*=>\\s*`, 'gu'), matches = [...generated.matchAll(regex)];
      if (matches.length !== 1) throw Error(`Expected one generated literal getter ${code}.${key}`);
      const parser = new Parser(generated, generatedPath, matches[0].index + matches[0][0].length), node = parser.expression(); parser.take(';');
      if (node.type !== 'strings') throw Error(`Generated getter is not a literal: ${code}.${key}`);
      assert.equal(value(node, env), arb[key], `ARB/generated getter drift ${code}.${key}`);
    }
    checks.push({ locale: code, chapters: 6, features: 113, images: 4, rows: 123, notices: 2, conditionalProductionFeatures: 3, tupleRows: 8, missingText: 0, duplicateFeatureIds: 0, arbAndGeneratedGettersMatch: true });
  }
  const firstIds = locales[languageOptions[0].code].chapters.flatMap(c => c.features.map(f => f.id));
  for (const locale of Object.values(locales)) assert.deepEqual(locale.chapters.flatMap(c => c.features.map(f => f.id)), firstIds);
  for (const source of sources.values()) assert.equal(sha(fs.readFileSync(source.absolutePath)), source.sha256, `Source changed during read-only export: ${source.path}`);
  return { schemaVersion: 1, localeOrder: languageOptions.map(l => l.code), locales, sources: [...sources.values()],
    production: { appFlavor: 'production', isValidation: false, cloudAndBackupEnabled: true,
      proof: { source: 'lib/config/app_build_environment.dart', expression: 'cloudAndBackupEnabled = !isValidation', validationDefinition } },
    validation: { status: 'PASS', meaning: 'Static parsing and exact source/locale metadata comparison only; no Flutter/app execution or runtime verification.',
      localeCount: 16, chaptersPerLocale: 6, featuresPerLocale: 113, featureRowsTotal: 1808, imagesPerLocale: 4, resolvedRowCountPerLocale: 123,
      chapterFeatureCounts: EXPECTED_COUNTS, sourceLocalizationKeys: referencedKeys.size, noticesPerLocale: 2, tupleRowsPerLocale: 8, productionConditionalRowsPerLocale: 3,
      uniqueIcons: Object.keys(icons).length, directionalIcons: Object.values(icons).filter(i => i.matchTextDirection).map(i => i.name),
      unsupportedSyntax: [], missingText: [], sourceHashesUnchanged: true, appWrites: false, appTestsBuildsInstallsRun: false, locales: checks },
    renderingContract: { source: BASE + 'manual_continuous_content.dart', order: 'chapter heading, optional one overview image, all chapter feature rows',
      icons: { nullMeansNoInventedIcon: true, boxSize: 34, glyphSize: 22, borderRadius: 8, iconTextGap: 10, fontSource: iconSourcePath,
        directionalGlyphsOnlyMirrorInRTL: true, bitmapsNeverMirror: true },
      text: { bodyAndNoticeRequiredWhenPresent: true, noticeFollowsBody: true, koreanInWordBreakPrevention: 'manualReadableText inserts U+2060 between adjacent Hangul letters for layout; preserve original text for content/semantics.' },
      publication: 'Do not expose sources, implementation paths, expressions, or validation metadata in the public website manifest. Copy only resolved public content and actual glyph/style metadata.' } };
}

module.exports = { resolveManual };
if (require.main === module) {
  const [appRoot, output] = process.argv.slice(2);
  if (!appRoot || !output || process.argv.length !== 4) throw Error('Usage: node manual-content-export.cjs <absolute-appRoot> <absolute-output.json>');
  const destination = path.resolve(output), root = path.resolve(appRoot);
  const relative = path.relative(root, destination);
  if (!path.isAbsolute(output) || !relative.startsWith('..') || path.extname(destination) !== '.json') throw Error('Output must be an explicit JSON path outside the app tree');
  const result = resolveManual(root);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ output: destination, status: result.validation.status, locales: 16, chaptersPerLocale: 6, featuresPerLocale: 113, rowsPerLocale: 123, icons: result.validation.uniqueIcons, sourceLocalizationKeys: result.validation.sourceLocalizationKeys, appExecution: false, sourceWrites: false }));
}
