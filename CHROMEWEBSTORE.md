# Chrome Web Store Listing — U Plan by 华大课友

Last updated: 2026-11-14.

**Release status:** 2.0.1 was uploaded to the existing item and submitted for
review on November 14. The dashboard confirmed “Your extension was submitted
for review.” Automatic publication after approval was checked. This does not
mean 2.0.1 is published; the previously published package is 2.0.0.

## Store Listing

**Extension name:** U Plan by 华大课友

**Short description:** 在 UW MyPlan 中一起查看华大课友课程评价与教授评分。

Both match `manifest.json`. The existing dashboard description was preserved:

```text
选课时，不用再来回切换网页。U Plan 将华大课友课评带到 UW MyPlan 的课程详情页，支持按需查看 Rate My Professors 教授评分，并在课评页面中参考历史成绩分布与 UW 官方课程评价。不同来源分开展示，帮助你更完整地了解一门课。

U Plan brings UW Classmates course reviews and optional professor ratings into
UW MyPlan. Read student experiences, inspect available instructor ratings, and
explore historical course information while browsing course details.
```

**Category:** Education. **Primary language:** Chinese (China).

**Single purpose — existing dashboard text, unchanged:**

```text
Add the course comments to UW couses from uwclassmate.com onto UW's official course registration website myplan.uw.edu.
```

## Graphics & Assets

| Asset | Dimensions | Observed status |
| --- | --- | --- |
| Store icon | 128 × 128 PNG | Existing dashboard asset retained |
| Screenshots 1–5 | 1280 × 800 or 640 × 400 accepted by the dashboard | Five existing assets retained; not replaced for 2.0.1 |
| Small promo tile | 440 × 280 | Dashboard empty; unchanged |
| Marquee promo tile | 1400 × 560 | Dashboard empty; unchanged |

Package icons at 16, 32, 48 and 128 pixels were verified from their PNG headers.
The existing store screenshots were not recaptured for this login-only patch.

## Permissions Justification

The existing dashboard explanations were preserved, as requested by the
publisher on November 14. The host-permission explanation remains identical
to the single-purpose text above. The storage explanation remains:

```text
Saves the user's settings (selected UW campus, interface language, and whether live professor ratings are on) and a small local cache of professor-rating results in chrome.storage.local, so ratings are not re-fetched on every page. Cached results expire after 24 hours (failed lookups after 5 minutes) and the cache holds at most 500 entries. Users can clear it in the extension settings. Nothing is synced or sent to the developer.
```

The following is an internal inventory of the submitted manifest, not new
wording entered in the dashboard:

| Scope | Manifest location | Behavior |
| --- | --- | --- |
| `storage` | `permissions` | Local settings and bounded rating cache |
| `https://www.ratemyprofessors.com/*` | `optional_host_permissions` | Public professor lookups after opt-in |
| `https://myplan.uw.edu/course/*` | `content_scripts.matches` | Course review panel and instructor ratings on MyPlan |
| `https://uwclassmate.com/*` | `content_scripts.matches`, `all_frames: true` | In an embedded frame, open same-origin sign-in links in a new tab; does nothing in a top-level page |

No required `host_permissions`, `<all_urls>`, history or cookies permission.
All extension JavaScript is bundled. The upstream login fix introduced the
club-site content script; the release preparation only bumped the version.

## Privacy & Data Use

**Existing dashboard answers, unchanged:** all nine data-use categories remain
unchecked; all three existing data-use certifications remain checked. This
records the publisher's existing selections rather than a new attestation.

Actual network behavior remains: the review iframe requests the selected
course from UW Classmates; optional live queries send public instructor names
and the selected campus to Rate My Professors. Contacted services receive
ordinary network metadata. The extension stores settings and cached public
rating results locally; the separate course-review website manages its own
login and website behavior. The 2.0.1 change only handles embedded login links.

## Privacy Policy

**Existing dashboard policy URL:** blank, preserved unchanged at the user's
request. No policy page was added, deployed, or linked for this release.

## Distribution

**Existing item ID:** `peldbkaogppcbjjjhhnmcmgickkopohp`.

**Visibility:** Published — public for 2.0.0. The 2.0.1 update is submitted.
Regions and other distribution settings were not changed.
Automatic publication after passing review was enabled in the submission.

## Developer Info

**Publisher:** 华大课友. Dashboard account: `ohcmuw@gmail.com`.
**Homepage:** https://uwclassmate.com/.
**Official URL:** `uwclassmate.com`.
**Support URL:** existing blank field retained.

## Version History

| Version | Date | Changes | Status |
| --- | --- | --- | --- |
| 2.0.1 | 2026-11-14 | Upstream fix opens embedded course-review sign-in links in a new tab | Submitted; automatic publication after approval |
| 2.0.0 | Observed 2026-11-14 | Combined course/professor panels and optional RMP ratings | Published — public |
| 1.1 | Observed 2026-11-08 | Previous public release | Historical |

## Review Notes

### Package and validation

- Source: `origin/main` commit `39d8f17`, merging PR #2 / `a28ff6e`.
- Prepared version: 2.0.1 in both `manifest.json` and `package.json`.
- `npm run typecheck`: passed.
- `npm test`: 18 tests passed, no failures or skips.
- `npm run package:store`: production and preview builds passed; ZIP allowlist checks passed.
- Uploaded artifact: `artifacts/u-plan-2.0.1-store-candidate.zip`.
- Size: 43,578 bytes; 12 production files; manifest at ZIP root.
- SHA-256: `9eb5909da3c39ecee2a375139850e8adf0149d1143177227051a2cc426205499`.
- Package includes `scripts/course-frame.js`; no source maps, secrets, demo fixtures or local URLs.
- Real MyPlan CSE 123 smoke test with the production unpacked build: one U Plan panel,
  real course reviews, historical GPA and CEC content visible. Clicking the embedded
  website's 登录 link opened a separate top-level `https://uwclassmate.com/sign-in`
  tab while the original MyPlan course remained open. The new tab displayed NetID
  and email sign-in choices; completing a fresh login was outside this patch test.
- The cross-campus, live RMP permission and failure-state matrix was not rerun for
  this login-only patch. No claim of full regression coverage is made.
- Upload verified as Draft 2.0.1 while Published remained 2.0.0, then the dashboard
  confirmed successful review submission. Preserve the existing item ID for updates.

### Known limitations

Google review is pending. Do not mark this release Published until the store or
publisher dashboard actually reports 2.0.1 as published.

### Rejection history

No review rejection observed for 2.0.1 at submission time.
