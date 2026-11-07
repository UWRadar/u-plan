# U Plan 2.0.0 release candidate

Prepared November 7, 2026. This is a local candidate, not a submitted or published Chrome Web Store update.

## Existing store item

Update the existing item so installed users keep the same extension ID:

- ID: `peldbkaogppcbjjjhhnmcmgickkopohp`
- [Current listing](https://chromewebstore.google.com/detail/u-plan-by-%E5%8D%8E%E5%A4%A7%E8%AF%BE%E5%8F%8B/peldbkaogppcbjjjhhnmcmgickkopohp)
- The public listing checked November 6 showed version 1.1, updated April 13, 2023, and contact `ohcmuw@gmail.com`. Public contact information does not confirm dashboard ownership or access. The local historical manifest was 1.2.
- Proposed version: 2.0.0. Check the publisher dashboard for newer uploaded/draft versions before using this number.

## Produce the upload ZIP

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
bun audit
bun run package:store
```

The upload candidate is `artifacts/u-plan-2.0.0-store-candidate.zip`; a SHA-256 file is beside it. The ZIP has manifest.json at its root and contains only the ten production files. The packager rebuilds clean output, checks the permission scope, and rejects local demo fixtures, local server URLs and dynamic code execution. Production bundles exclude the fictional rating fixtures; `dist-dev/` retains the local preview.

Never upload the repository, `dist-dev/`, demo pages, `.env` files, or database backups. To test unpacked, extract the candidate ZIP and select its folder in Chrome's Extensions page with Developer mode enabled.

## Complete before submission

1. Load `dist/` or extract and load the candidate in Chrome. Test on an authenticated, real UW MyPlan course-detail page. Browser automation is currently disabled, so this release has not passed that final check. Verify placement against the current DOM, the existing course-review iframe, professor tab, keyboard access, SPA navigation without duplicate widgets, and missing-instructor handling. Never infer an instructor when MyPlan leaves that cell blank.
2. Test Seattle, Bothell and Tacoma; duplicate names, team teaching, no match, offline/RMP errors and cache expiry. Professor scores must remain labeled as professor-wide RMP data, separate from course reviews, GPA distributions and CEC evaluations.
3. Confirm RMP requests are off initially. Enabling requires the optional RMP host permission. On actual course browsing, visible instructor names can then be queried automatically. Denying/removing permission must prevent requests; turning the setting off removes the host permission. Test the clear-cache action.
4. Review permission/data disclosures against actual network behavior below, and provide a public privacy-policy URL covering it. The old listing's no-data statement should not be reused without review. The external RMP endpoint is unofficial and can change; confirm acceptable use before distributing the integration.
5. Capture current screenshots and release notes from the real extension. Do not use fictional scores as real professor data.

## Permission and data inventory for the publisher

- Single purpose: show course and professor information while browsing UW MyPlan course details.
- Content script: only `https://myplan.uw.edu/course/*`. It reads displayed course identifiers and instructor names; it does not read NetID passwords, authentication cookies, private plans or student records.
- `storage`: local campus/settings and bounded professor-result cache. Successful lookups last 24 hours, failures five minutes, at most 500 entries. No Chrome history permission is requested.
- Optional `https://www.ratemyprofessors.com/*`: only requested when the user enables live ratings. The service worker sends public instructor names and selected UW campus/school to RMP without cookies or authorization tokens. New queries are limited to 20 per minute per worker and deduplicated.
- Course-review iframe: a course-code URL on `https://uwclassmate.com/CourseDetail/…` loads the existing club website. That website has its own login, analytics and privacy behavior. The host and RMP receive ordinary network metadata such as IP address; avoid promising that no information ever leaves the device.
- Matching, settings and cached records are kept locally; there is no new extension database, paid proxy, AWS/Railway service or scheduled scraper.
- All extension JavaScript is bundled into the ZIP. The RMP response is JSON data. Website content is in the existing separate iframe; it is not downloaded as executable extension code.

This inventory helps complete the dashboard's Privacy practices tab; it is not a substitute for reviewing the published policy and questionnaire.

## Upload and release

Open the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole) with an account that can manage the existing item. Choose that item, upload the complete ZIP as a new package, update listing/permissions/privacy answers, and submit for review. Choose deferred publishing if the club wants to control when an approved version goes live. The currently published extension stays available during review. New permissions can require user acceptance.

No upload, review submission or publication was performed while preparing this candidate.

## Official references

- [Update an existing item](https://developer.chrome.com/docs/webstore/update)
- [Privacy practices dashboard](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [User data policy FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Remotely hosted code guidance](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
