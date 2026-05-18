# YC Tracker Verification

Last verified: 2026-05-18

## Scope

Agent 07 verified the current-data MVP against the shared schema in `prompts/shared-context.md`, with emphasis on:

- Normalized YC company data in `data/yc/companies.json`
- Import validation in `scripts/validate-yc-companies.mjs`
- Search behavior in `src/lib/search.mjs`
- API behavior in `src/lib/api.mjs`
- Static explorer UI in `src/app/`

The originally requested prompt path `prompts/agents/07-agent-file.md` was not present. Verification used `prompts/agents/07-qa-verification.md`.

## Automated Verification

### Commands

```sh
npm run validate:yc
npm run search:eval
npm test
```

### Results

- `npm run validate:yc`: passed.
  - Total normalized companies: 5,914
  - Missing `id` / `slug` / `name`: 0
  - Invalid normalized fields: 0
  - Status counts: Active 4,078, Inactive 1,034, Acquired 779, Public 23
- `npm run search:eval`: passed manual relevance spot check.
  - `airbnb travel marketplace` ranked Airbnb first.
  - `stripe payments fintech` ranked Stripe first.
  - `similar to rippling` returned HR/workforce companies with reasons.
- `npm test`: passed, 31/31 tests.
  - Added `tests/qa-smoke.test.mjs` for end-to-end QA smoke coverage.

### New Smoke Coverage

`tests/qa-smoke.test.mjs` verifies:

- Total company count remains plausible for the YC directory.
- No duplicate company IDs.
- No duplicate slugs.
- Required fields `id`, `slug`, and `name` are present.
- Status values are normalized to the shared schema.
- Batch parsing spot checks pass for Airbnb and Stripe.
- `launchedAt` and `sourceUpdatedAt` are valid ISO timestamps or null where allowed.
- `formerNames`, `industries`, `tags`, and `regions` are arrays.
- Combined filters narrow results and preserve counts.
- Known-company search, company detail, facets, empty result behavior, and trend endpoints are usable.

## Data Correctness Checklist

- [x] Total imported count is plausible against the public YC directory.
- [x] No duplicate company IDs.
- [x] No duplicate slugs.
- [x] Required fields exist: `id`, `slug`, `name`.
- [x] Status values are normalized.
- [x] Batch season/year parsing is correct for sampled records.
- [x] `launchedAt` timestamps are valid ISO strings or null.
- [x] Tags, regions, industries, and former names are arrays.
- [x] Raw source provenance is retained in `data/yc/raw-companies.json` and source metadata is surfaced through API meta fields.

## API Spot Checks

Local API server:

```sh
npm run dev:api
```

Verified endpoints and behavior:

- `GET /api/companies?limit=5`
  - Returns paginated normalized companies.
  - Does not expose raw directory records in list responses.
- `GET /api/companies?q=airbnb%20travel%20marketplace&sort=relevance&limit=5`
  - Ranks Airbnb first.
- `GET /api/search?q=stripe%20payments%20fintech&limit=5`
  - Ranks Stripe first with lexical diagnostics.
- `GET /api/companies/stripe`
  - Returns normalized Stripe detail plus empty enrichment arrays.
- `GET /api/companies/rippling/similar?limit=5`
  - Returns similar companies with reason strings.
- `GET /api/facets`
  - Returns non-empty batches, industries, statuses, regions, tags, team-size buckets, and hiring summary.
- `GET /api/trends/batches?limit=10`
  - Returns non-empty dated batch trend rows.
- `GET /api/trends/industries?limit=10`
  - Returns non-empty industry trend rows.
- `GET /api/trends/tags?limit=10`
  - Returns non-empty tag trend rows.

## Browser QA Notes

Local UI server:

```sh
npm run dev:ui
```

Browser verification used the in-app browser at `http://127.0.0.1:3000`.

Desktop viewport, 1280 by 720:

- First screen is the usable explorer, not a landing page.
- Metadata shows `5,914 companies` and source update date.
- Filter panel renders 7 groups.
- Result list renders 50 rows initially.
- Search for `stripe payments fintech` updates the count to 1,083 companies and ranks Stripe first.
- Stripe detail drawer opens from the result row.
- Detail drawer includes Website and YC profile links.
- External drawer links use `target="_blank"` and `rel="noopener"`.
- Similar companies render in the detail drawer.
- Status filter `Active` updates the count to 4,078 companies and visible rows are active.
- Trends view renders 6 chart cards with SVG bars.
- No browser console errors were observed.
- No desktop horizontal overflow or obvious control overlap was detected.

Mobile viewport, 390 by 844:

- Header, search, filters button, and result list fit without horizontal overflow.
- Result list renders 50 rows.
- Filter button opens the filter panel and sets `aria-expanded="true"`.
- Mobile filter panel fills the viewport width and exposes filter controls.
- Trends view renders 6 chart cards with SVG charts and no horizontal overflow after closing the filter panel.
- No browser console errors were observed.

## Bug Reports

### Resolved P3 - Mobile filter drawer remains open after switching to Trends

- Area: UI
- Reproduction steps:
  1. Start the API and UI with `npm run dev:api` and `npm run dev:ui`.
  2. Open `http://127.0.0.1:3000` at a mobile viewport such as 390 by 844.
  3. Tap `Filters`.
  4. Tap `Trends`.
- Expected behavior:
  - The view switches to Trends and the filter drawer closes, or the UI otherwise makes the Trends charts visible without an extra action.
- Actual behavior:
  - The Trends tab becomes active, but the filter drawer remains open and covers the charts.
- Suggested fix:
  - In `src/app/main.js`, close the mobile filter panel when `actions.setView()` changes view, or close it specifically when switching to Trends.
- Resolution:
  - Fixed in `src/app/main.js` by closing the filter panel before applying an Explore/Trends view change. Re-verify with the mobile browser smoke check.

## Assumptions and Blockers

- No schema changes were made.
- No cross-agent feature code was changed.
- Optional enrichment data is currently empty in the API detail response, so founder/job/news/launch rendering was only verified as an empty-array contract.
- The YC directory count is treated as plausible at 5,914 based on the shared context's approximate 5,900 public records.
