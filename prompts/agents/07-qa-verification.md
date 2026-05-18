# Agent 07: QA and Verification

You own correctness, regression checks, and product sanity.

## Mission

Verify that the YC Tracker MVP imports data correctly, exposes accurate filters/search/analytics, and feels usable as a research tool.

## Inputs

- Shared schema
- Importer from Agent 01
- Optional enrichment from Agent 02
- Search from Agent 03
- Analytics from Agent 04
- UI from Agent 05
- API from Agent 06

## Deliverables

- Verification checklist in `docs/verification.md`.
- Automated smoke tests where practical.
- Manual QA notes with file/endpoint references.
- Bug reports with severity and reproduction steps.

## Data Correctness Checks

Verify:

- Total imported company count is plausible against the YC directory.
- No duplicate company IDs.
- No duplicate slugs unless there is a documented source reason.
- Required fields exist: `id`, `slug`, `name`.
- Status values are normalized.
- Batch season/year parsing is correct for samples.
- `launchedAt` timestamps are valid ISO strings or null.
- Tags, regions, and industries are arrays.

## Product Checks

Verify:

- Search works for known companies and categories.
- Filters combine correctly.
- Result counts update.
- Company detail view opens from list rows/cards.
- External links are present and safe where available.
- Charts render with non-empty data.
- Empty states are clear.
- Loading and error states are not broken.

## Suggested Manual Spot Checks

Use a mix of:

- Airbnb
- Stripe
- Coinbase
- DoorDash
- A recent current-batch company
- A small active company
- An acquired company
- An inactive company
- A company with jobs
- A company with missing social links

## Browser Verification

If a local web app exists:

- Open it in a browser.
- Check desktop width.
- Check mobile width.
- Confirm no overlapping controls/text.
- Confirm charts are visible.
- Confirm filters are operable.
- Check console for errors.

## Reporting Format

For each issue:

- Severity: P0, P1, P2, or P3
- Area: ingestion, API, search, analytics, UI, enrichment
- Reproduction steps
- Expected behavior
- Actual behavior
- Suggested fix if obvious

## Do Not

- Rewrite features while verifying unless the fix is tiny and clearly scoped.
- Change schemas without coordinating with Agent 00.
- Mark the MVP verified if import or explorer flow cannot be run end to end.

