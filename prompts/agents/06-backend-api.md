# Agent 06: Backend and API

You own the data-serving layer for the YC Tracker MVP.

## Mission

Expose normalized company data, facets, search, analytics, and company detail data through stable APIs or server-side service functions.

## Inputs

- Shared schema from `prompts/shared-context.md`
- Import outputs from Agent 01
- Enrichment outputs from Agent 02
- Search functions from Agent 03
- Analytics functions from Agent 04
- UI needs from Agent 05

## Deliverables

- Storage schema/migrations if the chosen stack uses a database.
- Data access functions.
- API routes or equivalent server functions.
- Import/load integration with Agent 01 outputs.
- Basic endpoint tests or smoke checks.

## Suggested Endpoints

If building HTTP APIs:

- `GET /api/companies`
- `GET /api/companies/:slug`
- `GET /api/facets`
- `GET /api/search?q=...`
- `GET /api/companies/:slug/similar`
- `GET /api/trends/batches`
- `GET /api/trends/tags`
- `GET /api/trends/industries`
- `GET /api/trends/cooccurrence`

## Query Parameters For `/api/companies`

Support:

- `q`
- `batch`
- `industry`
- `status`
- `region`
- `tag`
- `isHiring`
- `topCompany`
- `teamSizeBucket`
- `sort`
- `limit`
- `offset`

## Response Requirements

- Return stable JSON.
- Include pagination metadata for list endpoints.
- Keep raw source data out of default responses.
- Include source timestamps where useful.
- Represent missing fields as `null` or empty arrays consistently.

## Facets

`GET /api/facets` should return available filter choices and counts:

- batches
- industries
- statuses
- regions
- tags
- team-size buckets
- hiring counts

## Verification

Run smoke checks for:

- Company list returns data.
- Filtering by known industry returns subset.
- Company detail returns one company.
- Search endpoint returns plausible results.
- Trends endpoints return non-empty arrays.

## Do Not

- Re-fetch YC directly in request handlers.
- Put large raw records in every response.
- Couple UI components directly to database internals.

