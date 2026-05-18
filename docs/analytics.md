# Analytics Module

Owner: Agent 04.

This module turns the normalized `Company` records produced by Agent 01 into
chart-ready aggregates. It is intentionally pure: every function takes an
array of `Company` objects and returns plain JSON-safe structures. No
storage, fetching, or DOM concerns live here.

## Files

- `src/lib/analytics.ts` — TypeScript shapes for chart points and the
  `AnalyticsBundle` envelope (no runtime; declared `buildAnalytics` signature).
- `src/lib/analytics.mjs` — Runtime aggregation functions. Consumers (API
  routes from Agent 06, UI components from Agent 05) import from this file.
- `scripts/compute-analytics.mjs` — CLI that reads
  `data/yc/companies.json` and writes `data/yc/analytics.json`.
- `scripts/analytics.test.mjs` — Unit tests (`npm test`).

## Public API

```js
import { buildAnalytics } from "../src/lib/analytics.mjs";
const bundle = buildAnalytics(companies, { generatedAt });
```

`buildAnalytics` returns an `AnalyticsBundle`:

| Field | Shape | Notes |
| --- | --- | --- |
| `summary` | `AnalyticsSummary` | Totals, distinct counts, top-20 tags/industries/regions, status counts, exclusions list. |
| `companiesByBatch` | `SeriesPoint[]` | Dated batches only, sorted chronologically. `group` is the season. |
| `statusByBatch` | `StatusByBatchPoint[]` | Zero-filled `counts` for every `CompanyStatus`. |
| `industryMixByBatch` | `IndustryMixPoint[]` | Top 8 industries per batch with `share`. |
| `batchTrends` | `BatchTrendPoint[]` | Per-batch totals plus top 5 industries and tags, plus active/hiring counts. |
| `topTagsOverall` | `SeriesPoint[]` | Top 20 tags across all companies (including undated). |
| `topTagsByBatch` | `Array<{ batch, tags: Array<{name,count}> }>` | Top 10 tags per dated batch. |
| `hiringByBatch` | `HiringByBatchPoint[]` | Hiring totals and `hiringRate` per dated batch. |
| `hiringByIndustry` | `HiringByBatchPoint[]` | Cross-batch hiring rate per industry. `batch: "All"`. |
| `teamSizeBucketsByIndustry` | `TeamSizeBucketPoint[]` | Buckets per industry, stable order. |
| `teamSizeBucketsByStatus` | `TeamSizeBucketPoint[]` | Buckets per status. |
| `regionDistribution` | `SeriesPoint[]` | Region label and count; companies with empty regions count as `Unknown`. |
| `tagCooccurrence` | `CooccurrenceEdge[]` | Unordered tag pairs, `count >= 2`, top 100. |

Individual aggregations are also exported for direct use:
`companiesByBatch`, `statusByBatch`, `industryMixByBatch`, `batchTrends`,
`topTagsOverall`, `topTagsByBatch`, `hiringByBatch`, `hiringByIndustry`,
`teamSizeBucketsByIndustry`, `teamSizeBucketsByStatus`,
`regionDistribution`, `tagCooccurrence`, `findBatchTrendExclusions`,
`teamSizeBucket`, `compareBatch`.

## Conventions

- Batch sort: chronological by `batchYear`, then season order
  `Winter → Spring → Summer → Fall`. `Unknown` sorts last
  (`BATCH_SEASON_ORDER` in `analytics.mjs`).
- Team-size buckets: stable list (`TEAM_SIZE_BUCKETS`):
  `1`, `2-5`, `6-10`, `11-50`, `51-200`, `201-1000`, `1001+`, `Unknown`.
  `teamSize === null` is preserved as `Unknown` and never collapses to `1`.
- Batch trend series (`companiesByBatch`, `statusByBatch`,
  `industryMixByBatch`, `batchTrends`, `topTagsByBatch`, `hiringByBatch`)
  exclude companies whose batch is missing, has an unknown season, or has
  an unparseable year. The excluded set is reported in
  `summary.excludedFromBatchTrends` so callers can show "N companies not on
  the trend charts."
- Overall aggregates (`topTagsOverall`, `hiringByIndustry`,
  `regionDistribution`, `teamSizeBuckets*`, `tagCooccurrence`,
  `summary.totalCompanies`) include every company — including undated ones.

## Running

```sh
npm run analytics:yc   # writes data/yc/analytics.json
npm test               # runs analytics.test.mjs alongside other suites
```

## Verification — 2026-05-18 snapshot

Computed from `data/yc/companies.json` (5,914 records,
`sourceUpdatedAt = 2026-05-18T01:30:02.006Z`):

- Total companies used: **5,914**
- Distinct batches: **50** (after exclusion: 49 dated batches plotted)
- Distinct industries: **9**
- Distinct tags: **332**
- Distinct regions: **98**
- Excluded from batch trends: **1**
  - `y-combinator` (`id=64`) — batch "YCombinator" / unparseable year.
    Still counted in `summary.totalCompanies`, `topTagsOverall`,
    `regionDistribution`, etc.
- Top 20 tags overall: SaaS (1104), B2B (1096), Artificial Intelligence
  (928), AI (803), Fintech (695), Developer Tools (532), Marketplace (305),
  Generative AI (256), Consumer (238), Machine Learning (230), Healthcare
  (216), Open Source (206), Analytics (189), E-commerce (188), Education
  (170), Logistics (157), Biotech (155), Sales (152), AI Assistant (148),
  API (146).
- Top tag co-occurrence pair: B2B + SaaS (536), then Artificial Intelligence
  + B2B (271), AI + B2B (234).

Status counts in the snapshot:
`Active: 4078`, `Inactive: 1034`, `Acquired: 779`, `Public: 23`,
`Unknown: 0`. These match the ingestion `import-metadata.json` totals.

## Boundaries

- This module does not touch the canonical `Company` shape defined in
  `src/lib/schema.ts` or `prompts/shared-context.md`. No schema changes were
  needed for Agent 04.
- Agent 06's API may wrap these functions in HTTP routes (response envelopes,
  pagination, etc.); Agent 04 only owns the aggregation logic.
- If a chart needs a new aggregate shape, add a new function here rather
  than reshaping company records at the call site.
