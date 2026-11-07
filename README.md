# U Plan · 华大课友

Local prototype combining the existing 华大课友 course-review iframe with inline professor ratings on UW MyPlan. Inspired by the interaction in [RateMyProf Assistant for UW MyPlan](https://chromewebstore.google.com/detail/ratemyprof-assistant-for/ofkeokbllkoiceaekhaljfjbjegahaej). This is an independent implementation; the referenced extension is not a dependency.

## Try it locally

Use Node 22.14+ and Bun 1.4.4 (pinned in `package.json`).

```sh
bun install --frozen-lockfile
bun run dev
```

Open **http://127.0.0.1:3011/demo/**. The default preview uses fictional instructors, example ratings, and sample course reviews. It makes no AWS, Railway, or RMP requests.

- Hover, click, or keyboard-focus the badge beside an instructor.
- Select a department when multiple people have the same name.
- Switch between course reviews and professor ratings.
- Try team-taught courses, a missing match, and different UW campuses.
- To test real public ratings, check **试用真实 RMP 评分**, enter a professor name, and click **查询评分**. Only that name and selected campus go to RMP through the local server. The test course row and course reviews remain clearly marked samples; they do not represent that professor's actual teaching assignment.

The local server binds to `127.0.0.1`, keeps at most 500 memory-cache entries, and provides no database, deployment, or account-management endpoints. No cloud resources are created.

## Try the actual Chrome extension

```sh
bun run build
```

1. Open Chrome's Extensions page, enable Developer mode, then choose **Load unpacked**.
2. Select **`dist-dev/`** for local testing, or **`dist/`** for the MyPlan-only build. Do not load the source repository root.
3. Open the U Plan toolbar icon or its extension options. Seattle is the default campus; choose Bothell or Tacoma when appropriate.
4. Live RMP queries are **off by default**. Enabling them requests access only to `www.ratemyprofessors.com`. Refresh MyPlan after changing settings. Turning them off removes that host permission; **清除本机评分缓存** removes previously cached results.
5. Open a MyPlan course-detail page. Existing 华大课友 course reviews remain available alongside the professor tab. The local mock page runs the same compiled content script without installing the extension.

The browser test covered the local mock with the actual compiled content script and the real RMP adapter. Installation and the authenticated live MyPlan DOM still need a manual Chrome smoke test before publishing. The DOM selectors support the original `.cdpCourseDetails` container and common instructor nodes, including the legacy table `.mb-1` selector. They may need updates when UW changes MyPlan.

## Data, matching, and cost

- The extension reads the course code and displayed instructor names. It does not read NetID credentials, authentication cookies, private plans, or student records.
- Opt-in RMP requests include only a professor name and UW campus. No API credentials, proxies, tracking, or extra backend services are used.
- Ratings are professor-wide, rather than specific to the displayed course or quarter. The card labels RMP as the source and links to the complete profile.
- Exact names are scoped to the selected campus. Duplicates and abbreviated first names require a user choice. Missing or unavailable results link to a school-scoped RMP search.
- Successful matches cache for 24 hours; missing/failing responses for five minutes. Requests deduplicate and are limited to 20 new queries per minute per worker. The extension prunes expired cache entries and limits retained entries to 500.
- RMP's external endpoint is experimental and can change. A failed request falls back to a source link; it does not attempt to bypass access controls.

This prototype adds no Railway service, AWS database table, paid API, deployment, or scheduled job. Existing course reviews still load from the existing 华大课友 website in the real extension.

## Development checks

```sh
bun run typecheck
bun run test
bun run build
bun audit
```

`src/` contains TypeScript source. `scripts/build.mjs` bundles it locally with esbuild and copies the manifest, options, and icons. The extension has **zero runtime package dependencies** and never downloads executable code. `dist/`, `dist-dev/`, `artifacts/`, and `node_modules/` are generated and ignored by Git.

## Chrome Web Store candidate

Run `bun run package:store` to rebuild and produce `artifacts/u-plan-2.0.0-store-candidate.zip` plus its SHA-256 checksum. Upload only this production ZIP to the existing store item after completing the real MyPlan checks and publisher/privacy review in [the release guide](docs/CHROME_WEB_STORE_RELEASE.md).

The 2.0.0 candidate has not been submitted or published to the Chrome Web Store. Development dependencies were checked and updated on November 6, 2026; type checking and all 13 tests pass, and Bun audit reports no known vulnerabilities.
