# TAIPOPO website

Static, dependency-free introduction, privacy and support site in 16 languages for GitHub Pages.

- English pages: `en/`. Edit `tools/english-text.json`, then run `node tools/build-english.cjs` after updating Korean pages or exporting the manual. The generator preserves shared layouts and produces static English HTML with no runtime translation service. Language selection uses URLs, not extra browser storage.
- `language.css` adds a responsive language link and header wrapping without changing the Glass design.
- Run `tools/check-english.cjs` with Playwright alongside the existing website/manual checks.

- Home: `index.html`
- Image manual: `guide/` keeps the existing language URLs, header/footer and theme. It displays the complete published app guide in all 16 languages: six chapters (Main, Gallery, Settlement, Report, Camera, Settings), 113 feature instructions and two notices, plus the four current overview images. A contents selector navigates to each chapter. Continuous vertical scrolling preserves each image's proportions; original-image links open the unchanged WebP in a new tab. No offline availability is promised.
- Full text is resolved without running the app by tools/manual-content-export.cjs from manual_feature_catalog.dart, manual_camera_settings_features.dart and ARBs; the Production-only Drive entries are included and every referenced string is checked against generated Dart. Only resolved public text and glyph/style data are published; source paths and parser metadata stay out of the guide manifest.
- Manual export reads the current app's `manual_overview_catalog.dart`, `app_language_options.dart`, `pubspec.yaml`, per-language `assets/manual/*/manifest.json` and the explicit public UI strings. Run `node tools/sync-manual.cjs C:/TAIPOPO/development/app-current`, then `node tools/build-seo.cjs`. The exporter copies only 64 active WebPs byte-for-byte; 1,968 archived manifest entries are excluded. Existing app target rectangles remain a separate presentation layer; originals are never redrawn, recompressed, cropped or mirrored. Website-only previews remove verified blank rows and remap annotations as described below. Never copy full ARBs, archived captures or private app source here. Edit `tools/manual-template.html`, `guide/manual.css` and `guide/manual.js` for layout; generated HTML/JSON and copied images must come from the exporter.
- Validate image provenance with `node tools/check-manual-assets.cjs C:/TAIPOPO/development/app-current` and isolated browser coverage with `node tools/check-manual.cjs` (`PLAYWRIGHT_MODULE` may point at an external installed Playwright package). `MANUAL_BASE_URL` switches the same browser checks to the deployed site. Missing/corrupt manifests or images show errors and retry controls, never older text or another language. With JavaScript disabled, all six chapters, 113 instructions, notices and original-image links remain available in explicitly selected language sections. Actual app icons use the unchanged Production +21 Material Icons font subset, credited in assets/manual/LICENSE-MaterialIcons.txt.
- Support / four-question email templates: `support/index.html`, `site.js`
- Privacy: `privacy/index.html` and `/{language}/privacy/`. The local review includes the full policy and common website/email/rights notices in 16 languages; production must be checked separately.
- Terms drafts: `terms/index.html` and `/{language}/terms/`. These remain clearly labeled review copies with an unconfirmed effective date and `noindex,follow`; publication does not establish an effective date.
- Theme, spacing, typography and responsive layout: `styles.css`
- Brand: existing TAIPOPO SVG symbol and wordmark, used without redesign.

Website layout changes use one centred 1,080px container for the main content, long notices and footer. The existing font, palette, card treatment, navigation targets and footer brand alignment remain in place.

The manual keeps all 64 app-original WebPs unchanged for original viewing. It additionally displays 32 lossless web-only previews for Settlement and Report: only a verified uniform background band between the last card and bottom navigation is removed; every retained pixel and the RTL direction remain unchanged. These previews are 945×1220 and 945×1000 respectively. Desktop display fits within the viewport height (up to 720px); mobile follows the available width. Clicking either a preview or its original-view link opens the unchanged full-resolution original.

For a layout-only refresh, preserve the already published guide text instead of importing an unverified app candidate:

```powershell
# Run using an external Python environment with Pillow available.
python tools/compact-manual-images.py
node tools/refresh-manual-layout.cjs
node tools/build-seo.cjs
node tools/check-manual-assets.cjs C:/TAIPOPO/development/app-current --images-only
node tools/check-manual.cjs
```

The preview generator rejects non-uniform cuts or a content/annotation overlap. `render-manual.cjs` is shared by a normal app export and the published-content layout refresh; stale preview source hashes fail explicitly. The `--images-only` check verifies original provenance and preview metadata; exact preservation of published text is checked separately against the pre-change manifest. The default asset check still compares text against the selected app source and must be used when intentionally exporting an approved new app manual.

## Editing the design

Change the CSS variables at the start of `styles.css`. App references: background `#F0F6FF`, primary `#1976F3`, teal `#16B8B8`, text `#3A3F4B`. Website text uses darker teal/amber for readability. Glass surfaces use soft gradients and shadows; dark mode is supported. No animation is required. The app-sized values are adapted for a website, not copied pixel-for-pixel.

Edit copy in the HTML files. The sample interface is illustrative, with no user or device data. The app is explicitly marked as preparing for launch; no nonfunctional store button is published.

## Preview

`node tools/serve.cjs` serves the site at `http://127.0.0.1:4173/taipopo/`.

## Deployment

Publish validated, authorized website changes from the root of `main` using the existing GitHub Pages deployment. Official URL: https://taipopo.app/ . The previous URL, https://hongjonggeun-max.github.io/taipopo/ , redirects to it. Preserve the domain configuration established in commit `1518133`. Confirm the Pages build commit and public HTTPS content separately from a successful push. Website publication does not publish the Android app or submit Play declarations.

The application source repository is separate and must not be copied here. Do not commit signing keys, account credentials, screenshots containing personal records, or test data.

## Privacy and release notes

The 2026-11-07 local review uses the actual app working tree as its source. The policy effective date stays 2026-08-23; the body revision and new notice version are 2026-11-07. Neutral photo-record wording replaces evidence claims in the policy. The previous 2026-10-25 website release/account addendum is preserved separately. The new common notice explains GitHub Pages/IP processing, theme removal and refusal, received email versus website storage, conditional privacy rights and technical permissions versus legal grounds. Terms retain all 11 app clauses and the existing unconfirmed effective date, which the app also uses for its deletion guide. No legal compliance, final publication, SDK behavior change or store approval is implied.

Import only public legal text, using the current app checkout explicitly:

```powershell
node tools/sync-privacy.cjs C:/TAIPOPO/development/app-current/lib/l10n
node tools/build-legal.cjs
node tools/build-seo.cjs
node tools/check-privacy.cjs C:/TAIPOPO/development/app-current/lib/l10n
node tools/check-legal.cjs C:/TAIPOPO/development/app-current/lib/l10n
node tools/check-publication.cjs
```

If regenerating the general English/localized site, run `build-legal.cjs` followed by `build-seo.cjs` so common legal notices, footer links and crawl metadata remain authoritative. Use the current public Korean policy URL for site navigation and keep the former policy URL available for earlier versions. Imported app bodies and dates remain unchanged; `tools/website-disclosures.json` supplies separately reviewed website-only corrections for authentication scope, version-qualified QR processing, Geocoder and deletion. Do not copy private app source or operator-decision drafts here. Actual recipient entities/countries, transfer grounds, received-mail retention and the terms effective date remain unconfirmed; do not turn them into definite promises. The site has no analytics, remote fonts, login or server form; browser storage contains only the theme choice.

The 2026-11-11 web review distinguishes versions that used ML Kit from those using on-device ZXing. The policy body describes the camera address-display condition and the potential automatic resumption of an eligible interrupted Drive upload. The deletion guide names the current Data Management route. The policy effective date and the separately versioned website and email notice are preserved.

`build-seo.cjs` preserves routes and design, adds the Korean brand name `TAIPOPO(타이포포)`, WebSite aliases, canonical/hreflang metadata, `robots.txt` and a 65-URL sitemap. Korean aliases have preferred canonical routes. Unconfirmed terms drafts are excluded from the sitemap and marked noindex. A sitemap or indexing request does not guarantee inclusion or ranking. Search Console verification and indexing requests require an authenticated authorized session.

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


## 2026-11-07 privacy review draft

The legal-only generator now prepares `/deletion/` and all 16 locale deletion routes from the same app deletion body and device-choice notice. Support pages include the received-email processing notice. Terms/deletion effective dates remain unconfirmed; the privacy policy effective date remains 2026-08-23. These files are local review candidates; no production deployment has been performed. Run `sync-privacy.cjs` with the actual release worktree ARB path, then `build-legal.cjs`, `check-privacy.cjs` and `check-legal.cjs`. Keep older audit evidence; see the app release processing/jurisdiction review for operator decisions and SDK blockers.

- Mobile header controls and menu links have 48px touch targets, 16px separation between rows and 20px below navigation. Run tools/check-header.cjs for all-page mobile geometry and upper/middle/lower Guide touch taps in all 16 languages. build-seo.cjs versions the shared header CSS on all generated pages; run it after the content generators.
