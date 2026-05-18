# Integration Notes

## Ownership Boundaries

- Agent 00 owns `docs/architecture.md`, `docs/mvp-plan.md`, `docs/integration-notes.md`, `src/lib/schema.ts`, and coordinated updates to `prompts/shared-context.md`.
- Agent 01 owns ingestion scripts, raw directory fetch/cache logic, normalization logic, import documentation, and current `data/yc/` import artifacts.
- Agent 02 owns optional profile enrichment scripts, enrichment cache files, and mappings for founders, jobs, news, launches, and social/profile metadata.
- Agent 03 owns search indexing, query parsing, lexical search helpers, and optional semantic-search adapters.
- Agent 04 owns analytics aggregation helpers, chart data contracts, and analytics tests.
- Agent 05 owns UI routes, components, styling, client state, filters, charts, result views, and detail drawer behavior.
- Agent 06 owns API routes, database access helpers, SQLite migration contracts, pagination, filter validation, and response envelopes.
- Agent 07 owns verification scripts, smoke tests, QA notes, and final runbook updates.

## Shared Rules

- Use `Company` and optional enrichment types from `src/lib/schema.ts`.
- Store raw source data separately from normalized records.
- Preserve explicit timestamps: `fetchedAt` for raw source records and `sourceUpdatedAt` for normalized records.
- Keep missing data explicit with `null`, empty arrays, or empty strings according to the schema.
- Do not add historical ingestion in the MVP.
- Do not crawl profile pages unnecessarily; enrichment should be cached and rate-limited.

## Proposed File Areas

```text
scripts/import-yc-companies.mjs       Agent 01
scripts/validate-yc-companies.mjs     Agent 01
scripts/yc-normalize.mjs              Agent 01
scripts/enrich-*                      Agent 02
scripts/compute-analytics.mjs         Agent 04
scripts/api-server.mjs                Agent 06
src/lib/db*                           Agent 06, with schema coordination from Agent 01
src/lib/api*                          Agent 06
src/lib/search*                       Agent 03
src/lib/analytics*                    Agent 04
src/app/api/**                        Agent 06 if a Next.js app is scaffolded
src/app/**                            Agent 05
src/components/**                     Agent 05
db/migrations/**                      Agent 06, with import coordination from Agent 01
data/yc/**                            Agent 01 for import artifacts; Agent 04 for analytics output
tests/**                              Agent 07, plus focused tests from implementing agents
docs/qa.md                            Agent 07
```

If an agent needs to edit another agent's area, document the reason in its final report and keep the change minimal.

## Open Integration Decisions

- Runtime persistence currently reads JSON artifacts via `src/lib/db.mjs`; decide whether Agent 06 should wire the SQLite migration into the API before UI work, or keep JSON as the MVP read model.
- API analytics contract currently uses `/api/facets` and `/api/trends/*`; decide whether to add `/api/analytics/summary` as an alias for UI convenience.
- API company list currently filters by batch, status, industry, regions, tags, hiring, top company, team-size bucket, and text query; `subindustry`, `nonprofit`, and `stage` filters remain Agent 06 follow-ups if needed by the UI.
- The app scaffold can be Next.js App Router unless an implementing agent finds a strong local reason to use Vite.
- Embedding provider and model are deferred until credentials and product need are clear.
