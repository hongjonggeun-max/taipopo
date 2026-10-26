# TAIPOPO website

Static, dependency-free Korean/English introduction and support site for GitHub Pages.

- English pages: `en/`. Edit `tools/english-text.json`, then run `node tools/build-english.cjs` after updating Korean pages or exporting the manual. The generator preserves shared layouts and produces static English HTML with no runtime translation service. Language selection uses URLs, not extra browser storage.
- `language.css` adds a responsive language link and header wrapping without changing the Glass design.
- Run `tools/check-english.cjs` with Playwright alongside the existing website/manual checks.

- Home: `index.html`
- Detailed manual: `guide/` (13 topics, 16 languages, search and expandable contents).
- Manual content is generated from the app's ARB keys only. Edit `manual*` keys in the app, run `flutter gen-l10n`, then `node tools/sync-manual.cjs <path-to-app-lib/l10n>`. Never copy full app ARBs or private source into this public repository. Edit `tools/manual-template.html`, `guide/manual.css` and `guide/manual.js` for website layout; do not hand-edit generated `guide/index.html` or `guide/manual.json`.
- Support / four-question email templates: `support/index.html`, `site.js`
- Privacy: `privacy/index.html` (the local change contains the complete Korean policy and website addendum; the currently deployed root page is still a policy navigation page)
- Theme, spacing, typography and responsive layout: `styles.css`
- Brand: existing TAIPOPO SVG symbol and wordmark, used without redesign.

## Editing the design

Change the CSS variables at the start of `styles.css`. App references: background `#F0F6FF`, primary `#1976F3`, teal `#16B8B8`, text `#3A3F4B`. Website text uses darker teal/amber for readability. Glass surfaces use soft gradients and shadows; dark mode is supported. No animation is required. The app-sized values are adapted for a website, not copied pixel-for-pixel.

Edit copy in the HTML files. The sample interface is illustrative, with no user or device data. The app is explicitly marked as preparing for launch; no nonfunctional store button is published.

## Preview

`node tools/serve.cjs` serves the site at `http://127.0.0.1:4173/taipopo/`.

## Deployment

Publish the root of the `main` branch with GitHub Pages only after separate deployment approval. Official URL: https://taipopo.app/ . The previous URL, https://hongjonggeun-max.github.io/taipopo/ , redirects to it. Current domain configuration is recorded in commit `1518133`; the pending website policy/copy changes have not been committed or deployed.

The application source repository is separate and must not be copied here. Do not commit signing keys, account credentials, screenshots containing personal records, or test data.

## Privacy and release notes

`privacy/` now contains the complete Korean app policy using the existing policy renderer, and retains the existing public policy link at https://hongjonggeun-max.github.io/taipopo-privacy/privacy/ . The original 16 app policy bodies remain unchanged. A separately dated website addendum explains the current advertising/purchase configuration and Google Sign-In account data in all 16 languages. `tools/sync-privacy.cjs` preserves that addendum when importing app text. No legal compliance or store approval is implied. Keep the in-app policy, the separate legacy policy site and Play disclosures aligned before submission. The site itself has no analytics, remote fonts, login or server form. Browser storage contains only the selected visual theme; hosting is provided by GitHub Pages.

The font is a subset of the app's Noto Sans KR. License: `assets/OFL.txt`. When adding new characters, regenerate the subset using the original font and fonttools, or use the system-font fallback. Domain ownership is confirmed; preserve the existing `CNAME` and DNS configuration.

## taipopo.app connection — completed 2026-10-25

The approved domain connection is complete: Spaceship DNS, GitHub Pages custom domain, HTTPS certificate, Enforce HTTPS and Search Console domain ownership were verified. This does not mean the pending website changes, OAuth brand verification or public-app transition are complete. Do not repeat the connection steps during policy review.

- Repository: `hongjonggeun-max/taipopo`; Pages source: `main`, `/`; deployed domain configuration: `1518133458a364af403c44ebee04da68ac470d01`.
- Live public URLs: `https://taipopo.app/`, `https://taipopo.app/ko/privacy/`, `https://taipopo.app/support/`. The deployed `/privacy/` is still a navigation page; only the local pending version contains the full policy there. Keep the existing directory/index.html structure and trailing-slash URLs.
- Relative asset/navigation URLs work at the domain root and the old `/taipopo/` base. The old project address and `www.taipopo.app` redirect to the HTTPS root. The separate `taipopo-privacy` repository and its published address remain available and unchanged.

These website routing records are already applied. The Google-issued Search Console TXT is also installed and must be retained; do not copy credentials or verification tokens into this repository. Consult the [GitHub instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) only if an approved future DNS change is needed.

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | hongjonggeun-max.github.io |

IPv6 records were not added and are not needed for this website review. Do not put `/taipopo/` in a DNS value. Preserve existing website, mail and TXT records. Any future verification value must come from the service's actual verification screen, not an example token.

The certificate covers both `taipopo.app` and `www.taipopo.app`, and Enforce HTTPS is enabled. Public access, HTTP/HTTPS redirects, main assets and basic mobile layout passed the domain-connection checks. Preserve this completed state. The [.app registry requires HTTPS](https://www.registry.google/domains/app/) through HSTS preloading. See [HTTPS guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https) for future certificate problems.

## OAuth and Google Play handoff

- OAuth configuration in `taipopo-26591` is saved: homepage `https://taipopo.app/`, privacy `https://taipopo.app/ko/privacy/`, authorized domain `taipopo.app`. Search Console ownership is confirmed. The app remains External / Testing. Saved Branding fields are not verification approval or published Branding; the Verification Center currently says verification is not required while the app is in Testing. Follow [Google brand verification requirements](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification) before a separately approved verification/publication step.
- The product currently requests `https://www.googleapis.com/auth/drive.appdata` for appDataFolder backups, not access to all Drive files. [Google's scope reference](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) classifies it as non-sensitive; that does not establish that branding, project or consent-screen review is complete. Do not add Drive scopes or change Android package/signing OAuth clients as part of the website connection.
- The installed Android Google Sign-In implementation also uses `DEFAULT_SIGN_IN` with `requestEmail()`, so the review includes basic account identity/profile and email access, not only the explicit Drive scope. No additional sensitive/restricted API scopes were found in the reviewed app requests; do not extend that finding to future changes or treat it as a new device authorization test.
- Camera/photos, location, local records, original/derived images, Google Sign-In/Drive, Crashlytics, ML Kit, external copies and deletion are covered by the existing policy. The website addendum covers disabled advertisements/new purchases, the existing Google Play product/purchase queries and Google Sign-In account ID/basic profile/email processing. The app policy and separate published policy need matching purchase/account-processing clarifications before a final Play submission; this task does not modify them.
- Contact/support: `taipopo.app@gmail.com`, with existing mail templates. Opening a mail composer is tested; email delivery and mailbox operation are not verified by sending a message.
- There is no separate website terms page, sign-up or checkout. Google treats the OAuth terms link as optional. Final sales terms, prices and any additional terms require the release owner's decision; no permanent-purchase or ad-removal promise is added here.
- Future Play listing URL: `https://play.google.com/store/apps/details?id=com.workshield.app`. Add a live store link only after its public availability is verified. Until then retain the existing launch-preparation notice.
- Before submission, align the store's developer/contact information, Data safety and policy links with the actual release, including third-party SDK processing. A website update alone is not approval. See [Google Play User Data requirements](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
- Keep three approvals separate: (1) website commit/push and production deployment, (2) OAuth brand verification request and Branding publication, and (3) OAuth app transition to In production. None is authorized by this policy-review task. No Play submission or advertising/purchase activation is included.
