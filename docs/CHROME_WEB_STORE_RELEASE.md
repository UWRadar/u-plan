# U Plan 2.0.1 release

Submitted November 14, 2026. Google review is pending; automatic publication
after approval is enabled. The previously published package is 2.0.0.

## Existing store item

- Repository: https://github.com/UWRadar/u-plan
- Item ID: `peldbkaogppcbjjjhhnmcmgickkopohp`
- [Store listing](https://chromewebstore.google.com/detail/peldbkaogppcbjjjhhnmcmgickkopohp)
- Source: `39d8f17` / PR #2, fixing sign-in links inside the course-review iframe.
- Release preparation changed the package and manifest version from 2.0.0 to 2.0.1.
- Existing listing, host/privacy explanations, disclosure selections, policy URL
  and distribution settings were retained. No new AWS or Railway service was added.

## Artifact

`artifacts/u-plan-2.0.1-store-candidate.zip` — 43,578 bytes, 12 files.

SHA-256: `9eb5909da3c39ecee2a375139850e8adf0149d1143177227051a2cc426205499`.

Upload the complete production ZIP to the existing item. Never upload the
repository, `dist-dev/`, demo fixtures, environment files or database backups.
Rebuilding a ZIP may change its timestamp-dependent hash; record the hash of the
exact artifact actually uploaded.

## Validation

```sh
npm run typecheck
npm test
npm run package:store
```

All passed: 18 tests, production build and package checks. Manifest version,
production file allowlist, absence of source maps/local URLs, and PNG sizes
were verified. In real MyPlan CSE 123, the production build displayed the
course-review panel and opened its 登录 link in a new top-level sign-in tab.
The original MyPlan course tab remained open. A new login session and the full
cross-campus/RMP permission matrix were not exercised for this patch.

## Observed submission

The publisher dashboard first showed Draft 2.0.1 and Published 2.0.0. Submission
with automatic publication enabled returned “Your extension was submitted for
review.” This is a submitted update, not a claim that 2.0.1 is already live.

Current listing metadata, permissions, existing privacy answers and release
history are recorded in [CHROMEWEBSTORE.md](../CHROMEWEBSTORE.md).

[Official update process](https://developer.chrome.com/docs/webstore/update).
