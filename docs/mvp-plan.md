# YC Tracker MVP Plan

## Work Breakdown

- [x] Agent 00: Establish architecture, shared schema, file ownership, and MVP plan.
- [x] Agent 01: Implement current YC directory ingestion, raw payload storage, and normalized company import.
- [ ] Agent 02: Add optional profile enrichment for selected companies with rate limits and cache reuse.
- [ ] Agent 03: Implement local search, FTS index, and optional semantic-search extension points.
- [x] Agent 04: Add analytics aggregation for batch, industry, tags, status, team size, hiring, and geography.
- [ ] Agent 05: Build the dense explorer UI with filters, charts, results list/table, and company detail drawer.
- [x] Agent 06: Implement backend API routes and database access helpers using the shared schema.
- [ ] Agent 07: Verify import, API, UI, search, analytics, and documentation end to end.

## MVP Milestones

- [x] Project scaffold exists with package scripts for import, validation, analytics, and test.
- [x] SQLite migration defines raw source records separately from normalized records.
- [x] Import script produces normalized `Company` rows matching `src/lib/schema.ts`.
- [x] API exposes paginated companies, company detail, search, facets, similar companies, and trend endpoints.
- [ ] UI first screen is the explorer, not a landing page.
- [ ] Filters cover batch, status, industry/subindustry, tags, regions, hiring, top company, nonprofit, and stage.
- [x] Text search covers company name, slug, one-liner, long description, batch, industry, subindustry, tags, regions, and locations.
- [x] Analytics outputs show useful distributions without hiding missing data.
- [ ] Detail view shows company source fields and optional enrichment when available.
- [ ] Verification docs list all commands needed to run from a clean checkout and UI session.

## Canonical Contract

The canonical company contract lives in two places:

- Human-readable shared prompt context: `prompts/shared-context.md`.
- TypeScript source module: `src/lib/schema.ts`.

Do not create alternate UI or API field names for the same data. Proposed schema changes should be documented first and coordinated by Agent 00 or the final integrator.

## Current Snapshot

- Current normalized data: `data/yc/companies.json`.
- Current raw data: `data/yc/raw-companies.json`.
- Current analytics data: `data/yc/analytics.json`.
- Snapshot record count: 5,914 normalized companies.
- Snapshot source timestamp: `2026-05-18T01:30:02.006Z`.
- Local API entry point: `scripts/api-server.mjs` on `127.0.0.1:3001` by default.

## Deferred Until After MVP

- Historical Internet Archive ingestion.
- Mandatory profile-page crawling for every company.
- Production authentication or hosted deployment.
- Embeddings that require unavailable API keys.
- Complex saved-search or collaboration features.
