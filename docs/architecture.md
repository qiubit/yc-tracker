# YC Tracker MVP Architecture

## Scope

YC Tracker is a local/current-data explorer for the public Y Combinator Startup Directory. The MVP uses current directory records as the primary source and does not include historical Internet Archive ingestion.

## Stack Decision

- App: current implementation is a Node.js module/HTTP API with a future UI scaffold still open. If Agent 05 scaffolds a web app, use Next.js with TypeScript unless there is a strong local reason to choose Vite.
- Storage: current implementation uses JSON artifacts in `data/yc/` for the runnable MVP path, with a SQLite migration contract in `db/migrations/001_create_yc_tracker.sql` for the durable storage layer.
- Search: SQLite FTS5 for lexical search first; embeddings can be added later behind the same company IDs.
- Charts: Recharts or Observable Plot in the UI layer.
- Data contracts: `src/lib/schema.ts` is the code source of truth and mirrors `prompts/shared-context.md`.

This keeps the import, API, and UI contracts simple enough for parallel agent work while still supporting filters, charts, and semantic discovery later.

## Project Structure

```text
docs/
  architecture.md
  analytics.md
  ingestion/
    yc-import.md
  mvp-plan.md
  integration-notes.md
db/
  migrations/
    001_create_yc_tracker.sql
prompts/
  shared-context.md
  agents/
src/
  lib/
    analytics.mjs
    analytics.ts
    api.mjs
    db.mjs
    schema.ts
scripts/
  import-yc-companies.mjs
  validate-yc-companies.mjs
  compute-analytics.mjs
  api-server.mjs
data/
  yc/
```

Future agents should add implementation files inside their ownership areas from `docs/integration-notes.md`.

## Data Flow

1. Ingestion fetches current YC directory search-index records.
2. Raw source payloads are stored separately with source URL and fetch timestamp.
3. Normalization maps raw fields into the canonical `Company` schema.
4. The runnable MVP stores normalized JSON artifacts in `data/yc/`; the SQLite migration defines the durable table layout for the next storage pass.
5. API routes read normalized records through `src/lib/db.mjs` and do not expose raw payloads by default.
6. UI consumes API responses using the same field names as `src/lib/schema.ts`.

## Storage Contract

Current JSON artifacts:

- `data/yc/raw-companies.json`: provenance-wrapped raw directory records.
- `data/yc/companies.json`: normalized `Company` records plus import metadata.
- `data/yc/import-metadata.json`: source URL, fetch timestamp, counts, and validation summaries.
- `data/yc/analytics.json`: generated analytics bundle.

SQLite migration contract:

- `raw_source_records`: source kind, source URL, fetched timestamp, raw JSON payload.
- `companies`: one row per normalized `Company`.
- `company_former_names`, `company_industries`, `company_tags`, `company_regions`: array fields normalized for filtering.
- `company_search`: FTS5 virtual table over `name`, `oneLiner`, `longDescription`, `batch`, `industry`, `subindustry`, `tags`.
- Optional enrichment tables: `founders`, `job_postings`, `news_items`, `launch_posts`.

Keep `sourceUpdatedAt` on normalized company rows and `fetchedAt` on raw rows. Missing source data should be stored as `null`, empty arrays, or empty strings according to the canonical type rather than guessed values.

## API Contract

Implemented API routes expose normalized data only:

- `GET /api/companies`: paginated list with filters for batch, status, industry, tags, regions, hiring, top company, team-size bucket, and text query.
- `GET /api/companies/:slug`: company detail by slug, including optional enrichment if present.
- `GET /api/companies/:slug/similar`: related companies scored by shared batch, industry, tags, industries, and regions.
- `GET /api/search`: scored lexical search over normalized company fields.
- `GET /api/facets`: filter facets for batches, industries, statuses, regions, tags, team-size buckets, and hiring.
- `GET /api/trends/batches`: batch trend rows.
- `GET /api/trends/tags`: tag trend rows.
- `GET /api/trends/industries`: industry trend rows.
- `GET /api/trends/cooccurrence`: tag co-occurrence rows.

The API must not rename schema fields for UI convenience. If the UI needs derived labels or buckets, add derived fields in a clearly named response envelope rather than changing `Company`.

Proposed Agent 06 follow-up: either add `GET /api/analytics/summary` as an alias over the generated analytics summary or keep the `/api/trends/*` route family as the public contract. Agent 06 should also add filters for `subindustry`, `nonprofit`, and `stage` if Agent 05 needs those controls. Do not let route families drift into separate aggregate definitions.

## Verification

Current local verification commands:

```sh
npm run validate:yc
npm run analytics:yc
npm test
```

The final MVP should also be runnable with documented commands that:

1. Install dependencies.
2. Fetch/import current YC directory data.
3. Build or start the local app.
4. Run tests or smoke checks.
5. Confirm the explorer can filter/search companies and open a detail view.
