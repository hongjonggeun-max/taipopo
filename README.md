# TAIPOPO website

Static, dependency-free Korean introduction and support site for GitHub Pages.

- Home: `index.html`
- Detailed manual: `guide/` (13 topics, 16 languages, search and expandable contents).
- Manual content is generated from the app's ARB keys only. Edit `manual*` keys in the app, run `flutter gen-l10n`, then `node tools/sync-manual.cjs <path-to-app-lib/l10n>`. Never copy full app ARBs or private source into this public repository. Edit `tools/manual-template.html`, `guide/manual.css` and `guide/manual.js` for website layout; do not hand-edit generated `guide/index.html` or `guide/manual.json`.
- Support / four-question email templates: `support/index.html`, `site.js`
- Privacy navigation: `privacy/index.html` (links to the existing published policy; does not replace its legal text)
- Theme, spacing, typography and responsive layout: `styles.css`
- Brand: existing TAIPOPO SVG symbol and wordmark, used without redesign.

## Editing the design

Change the CSS variables at the start of `styles.css`. App references: background `#F0F6FF`, primary `#1976F3`, teal `#16B8B8`, text `#3A3F4B`. Website text uses darker teal/amber for readability. Glass surfaces use soft gradients and shadows; dark mode is supported. No animation is required. The app-sized values are adapted for a website, not copied pixel-for-pixel.

Edit copy in the HTML files. The sample interface is illustrative, with no user or device data. The app is explicitly marked as preparing for launch; no nonfunctional store button is published.

## Preview

`node tools/serve.cjs` serves the site at `http://127.0.0.1:4173/taipopo/`.

## Deployment

Publish the root of the `main` branch with GitHub Pages. Default URL: https://hongjonggeun-max.github.io/taipopo/

The application source repository is separate and must not be copied here. Do not commit signing keys, account credentials, screenshots containing personal records, or test data.

## Privacy and release notes

The homepage links to the existing public policy at https://hongjonggeun-max.github.io/taipopo-privacy/privacy/ . No legal compliance or store approval is implied. Review that policy against the final release (including retention and backup behavior) before submitting to Play Console. The site itself has no analytics, remote fonts, login or server form. Browser storage contains only the selected visual theme; hosting is provided by GitHub Pages.

The font is a subset of the app's Noto Sans KR. License: `assets/OFL.txt`. When adding new characters, regenerate the subset using the original font and fonttools, or use the system-font fallback. Domain purchase and DNS configuration are separate; do not add a CNAME until ownership is confirmed.
