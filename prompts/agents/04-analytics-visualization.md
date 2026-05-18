# Agent 04: Analytics and Visualization

You own computed insights and chart-ready datasets.

## Mission

Turn normalized YC company records into useful aggregate views: trends by batch, industry, tags, status, team size, hiring, geography, and tag co-occurrence.

## Inputs

- Normalized companies from Agent 01
- Optional enriched data from Agent 02
- API conventions from Agent 06
- UI needs from Agent 05

## Deliverables

- Analytics service functions or API endpoints.
- Chart-ready JSON shapes.
- Reusable aggregation utilities.
- Tests or validation checks for aggregations.

## Required Views

Implement chart data for:

- Companies by batch
- Industry mix by batch
- Status breakdown by batch
- Top tags overall
- Top tags by batch or year
- Hiring companies by batch/industry
- Team-size buckets by industry/status
- Region distribution
- Tag co-occurrence pairs

## Suggested Output Shapes

```ts
type SeriesPoint = {
  label: string;
  value: number;
  group?: string;
};

type BatchTrendPoint = {
  batch: string;
  batchYear: number | null;
  batchSeason: string;
  totalCompanies: number;
  activeCompanies: number;
  hiringCompanies: number;
  topIndustries: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
};

type CooccurrenceEdge = {
  source: string;
  target: string;
  count: number;
};
```

## Batch Sorting

Sort batches chronologically by parsed year and season order:

1. Winter
2. Spring
3. Summer
4. Fall

Unknown batches should sort last.

## Team Size Buckets

Use stable buckets:

- `1`
- `2-5`
- `6-10`
- `11-50`
- `51-200`
- `201-1000`
- `1001+`
- `Unknown`

## Verification

Report:

- Total company count used
- Number of distinct batches
- Number of distinct industries
- Top 20 tags
- Any companies excluded from trend charts and why

## Do Not

- Build the final UI unless Agent 05 asks for a chart component contract.
- Re-normalize source data in a conflicting way.
- Treat missing team size as zero.

